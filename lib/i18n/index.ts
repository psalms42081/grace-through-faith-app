import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import pt from "./locales/pt.json";
import fil from "./locales/fil.json";
import zh from "./locales/zh.json";

const LANGUAGE_KEY = "@grace-through-faith/preferredLanguage";
const FIRST_LAUNCH_KEY = "@grace-through-faith/firstLaunchDone";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "fil", label: "Filipino" },
  { code: "zh", label: "中文" },
] as const;

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  pt: { translation: pt },
  fil: { translation: fil },
  zh: { translation: zh },
};

function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const code = locales[0].languageCode || "en";
      if (code in resources) return code;
      const base = code.split("-")[0];
      if (base in resources) return base;
    }
  } catch {}
  return "en";
}

let initialized = false;

export async function initI18n(): Promise<void> {
  if (initialized) return;

  let lng = "en";
  let isFirstLaunch = false;
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored && stored in resources) {
      lng = stored;
    } else {
      const launchDone = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      if (!launchDone) {
        isFirstLaunch = true;
      }
      lng = getDeviceLanguage();
    }
  } catch {
    lng = getDeviceLanguage();
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

  if (isFirstLaunch) {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lng);
      const { setContentLanguage } = await import("@/lib/content-language");
      const validContentLangs = ["en", "es", "fr", "pt", "fil", "zh"];
      if (validContentLangs.includes(lng)) {
        await setContentLanguage(lng as any);
      }
      await AsyncStorage.setItem(FIRST_LAUNCH_KEY, "true");
    } catch {}
  }

  initialized = true;
}

export async function setLanguage(code: string): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
  await i18n.changeLanguage(code);
}

export async function useDeviceLanguage(): Promise<void> {
  await AsyncStorage.removeItem(LANGUAGE_KEY);
  const deviceLang = getDeviceLanguage();
  await i18n.changeLanguage(deviceLang);
}

export async function getSavedLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

export { LANGUAGE_KEY };
export default i18n;
