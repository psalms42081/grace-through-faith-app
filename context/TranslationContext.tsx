import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getTranslationForLanguage } from "@/lib/bibleTranslationMap";
import { resolveContentLang } from "@/lib/content-language";
import i18n from "@/lib/i18n";

const TRANSLATION_KEY = "@grace-through-faith/translation";
const MANUAL_OVERRIDE_KEY = "@grace-through-faith/translation-manual";

interface TranslationContextType {
  translation: string;
  setTranslation: (t: string) => void;
}

const TranslationContext = createContext<TranslationContextType>({
  translation: "KJV",
  setTranslation: () => {},
});

/** Normalize a stored/incoming translation code (trim whitespace, uppercase). */
function normalizeTranslation(t: string | null | undefined): string | null {
  if (!t) return null;
  const n = t.trim().toUpperCase();
  return n.length > 0 ? n : null;
}

async function resolveTranslation(): Promise<string> {
  const raw = await AsyncStorage.getItem(MANUAL_OVERRIDE_KEY);
  const manualOverride = normalizeTranslation(raw);
  if (manualOverride) return manualOverride;

  const lang = resolveContentLang(i18n.language || "en");
  return getTranslationForLanguage(lang);
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [translation, setTranslationState] = useState("KJV");
  const hasManualOverride = useRef(false);

  useEffect(() => {
    resolveTranslation().then((t) => {
      const normalized = normalizeTranslation(t) ?? "KJV";
      setTranslationState(normalized);
      AsyncStorage.getItem(MANUAL_OVERRIDE_KEY).then((v) => {
        hasManualOverride.current = !!normalizeTranslation(v);
      });
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!hasManualOverride.current) {
        const lang = resolveContentLang(i18n.language || "en");
        const defaultTranslation = normalizeTranslation(getTranslationForLanguage(lang)) ?? "KJV";
        setTranslationState(defaultTranslation);
      }
    };
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, []);

  const setTranslation = useCallback((t: string) => {
    const normalized = normalizeTranslation(t) ?? "KJV";
    setTranslationState(normalized);
    hasManualOverride.current = true;
    // Store the same normalized value in both keys so they never diverge.
    AsyncStorage.setItem(TRANSLATION_KEY, normalized);
    AsyncStorage.setItem(MANUAL_OVERRIDE_KEY, normalized);
  }, []);

  return (
    <TranslationContext.Provider value={{ translation, setTranslation }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
