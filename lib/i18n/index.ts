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

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Espanol" },
  { code: "fr", label: "Francais" },
  { code: "pt", label: "Portugues" },
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
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored && stored in resources) {
      lng = stored;
    } else {
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
