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
import de from "./locales/de.json";
import sw from "./locales/sw.json";
import id from "./locales/id.json";
import ko from "./locales/ko.json";
import ja from "./locales/ja.json";
import hi from "./locales/hi.json";
import ar from "./locales/ar.json";
import ru from "./locales/ru.json";
import hr from "./locales/hr.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";
import tr from "./locales/tr.json";
import pl from "./locales/pl.json";
import ro from "./locales/ro.json";
import uk from "./locales/uk.json";
import am from "./locales/am.json";

const LANGUAGE_KEY = "@grace-through-faith/preferredLanguage";
const FIRST_LAUNCH_KEY = "@grace-through-faith/firstLaunchDone";

export const SUPPORTED_LANGUAGES = [
  { code: "en",  label: "English" },
  { code: "es",  label: "Español" },
  { code: "fr",  label: "Français" },
  { code: "pt",  label: "Português" },
  { code: "fil", label: "Filipino" },
  { code: "zh",  label: "中文" },
  { code: "de",  label: "Deutsch" },
  { code: "sw",  label: "Kiswahili" },
  { code: "id",  label: "Bahasa Indonesia" },
  { code: "ko",  label: "한국어" },
  { code: "ja",  label: "日本語" },
  { code: "hi",  label: "हिन्दी" },
  { code: "ar",  label: "العربية" },
  { code: "ru",  label: "Русский" },
  { code: "hr",  label: "Hrvatski / Bosanski" },
  { code: "it",  label: "Italiano" },
  { code: "nl",  label: "Nederlands" },
  { code: "tr",  label: "Türkçe" },
  { code: "pl",  label: "Polski" },
  { code: "ro",  label: "Română" },
  { code: "uk",  label: "Українська" },
  { code: "am",  label: "አማርኛ" },
] as const;

export type SupportedLangCode = typeof SUPPORTED_LANGUAGES[number]["code"];

// RTL languages
export const RTL_LANGS = new Set(["ar", "he", "ur", "fa"]);

const resources = {
  en:  { translation: en },
  es:  { translation: es },
  fr:  { translation: fr },
  pt:  { translation: pt },
  fil: { translation: fil },
  zh:  { translation: zh },
  de:  { translation: de },
  sw:  { translation: sw },
  id:  { translation: id },
  ko:  { translation: ko },
  ja:  { translation: ja },
  hi:  { translation: hi },
  ar:  { translation: ar },
  ru:  { translation: ru },
  hr:  { translation: hr },
  it:  { translation: it },
  nl:  { translation: nl },
  tr:  { translation: tr },
  pl:  { translation: pl },
  ro:  { translation: ro },
  uk:  { translation: uk },
  am:  { translation: am },
};

function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const code = locales[0].languageCode || "en";
      if (code in resources) return code;
      // Handle regional variants: bs/sr → hr, zh-TW → zh, etc.
      const base = code.split("-")[0];
      if (base === "bs" || base === "sr") return "hr";
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
      if (!launchDone) isFirstLaunch = true;
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
      if (lng in resources) {
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
