import { useSyncExternalStore } from "react";
import { AppState, PixelRatio, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  READING_FONT_SCALE_KEY,
  parseReadingFontScale,
  systemFontScaleFromProbes,
  type ReadingFontScale,
} from "@/lib/reading-font-scale";

let chosen: ReadingFontScale = 1;
let system = 1;
const listeners = new Set<() => void>();
let started = false;
let writeGeneration = 0;

function emit() {
  listeners.forEach((listener) => listener());
}

function measureSystemFontScale(): number {
  if (Platform.OS !== "web") {
    const native = PixelRatio.getFontScale();
    return Number.isFinite(native) && native > 0 ? native : 1;
  }
  if (typeof document === "undefined" || !document.body) return 1;
  const fixed = document.createElement("span");
  const rem = document.createElement("span");
  fixed.style.cssText = "position:absolute;visibility:hidden;font-size:16px;padding:0;margin:0;";
  rem.style.cssText = "position:absolute;visibility:hidden;font-size:1rem;padding:0;margin:0;";
  fixed.textContent = "M";
  rem.textContent = "M";
  document.body.appendChild(fixed);
  document.body.appendChild(rem);
  const fixedPx = parseFloat(window.getComputedStyle(fixed).fontSize);
  const remPx = parseFloat(window.getComputedStyle(rem).fontSize);
  fixed.remove();
  rem.remove();
  return systemFontScaleFromProbes(remPx, fixedPx);
}

function refreshSystem() {
  const next = measureSystemFontScale();
  if (next !== system) {
    system = next;
    emit();
  }
}

function ensureStarted() {
  if (started) return;
  started = true;
  const generation = writeGeneration;
  AsyncStorage.getItem(READING_FONT_SCALE_KEY)
    .then((raw) => {
      if (generation !== writeGeneration) return;
      const next = parseReadingFontScale(raw);
      if (next != null && next !== chosen) {
        chosen = next;
        emit();
      }
    })
    .catch(() => {});
  refreshSystem();
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.addEventListener("resize", refreshSystem);
  }
  AppState.addEventListener("change", (state) => {
    if (state === "active") refreshSystem();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureStarted();
  return () => {
    listeners.delete(listener);
  };
}

export function getReadingFontScale(): ReadingFontScale {
  return chosen;
}

export function getSystemFontScale(): number {
  return system;
}

/** The step the reader saved. The size control highlights this, not the phone scale. */
export function useReadingFontScale(): ReadingFontScale {
  return useSyncExternalStore(subscribe, getReadingFontScale, getReadingFontScale);
}

/** Phone or browser text-size preference. 1 when px text is already affected. */
export function useSystemFontScale(): number {
  return useSyncExternalStore(subscribe, getSystemFontScale, () => 1);
}

export function setReadingFontScale(next: number) {
  const parsed = parseReadingFontScale(String(next));
  if (parsed == null || parsed === chosen) return;
  writeGeneration += 1;
  chosen = parsed;
  AsyncStorage.setItem(READING_FONT_SCALE_KEY, String(parsed)).catch(() => {});
  emit();
}
