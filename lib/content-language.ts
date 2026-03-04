import AsyncStorage from "@react-native-async-storage/async-storage";

const CONTENT_LANG_KEY = "@grace-through-faith/contentLanguage";
const SAME_AS_APP = "same";

export type ContentLanguageOption = "same" | "en" | "es" | "fr" | "pt" | "fil" | "zh";

export const CONTENT_LANGUAGE_OPTIONS: { code: ContentLanguageOption; label: string }[] = [
  { code: "same", label: "Same as App Language" },
  { code: "en", label: "English" },
  { code: "es", label: "Espanol" },
  { code: "fr", label: "Francais" },
  { code: "pt", label: "Portugues" },
  { code: "fil", label: "Filipino" },
  { code: "zh", label: "中文" },
];

let _cachedContentLang: ContentLanguageOption = "same";

export async function initContentLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(CONTENT_LANG_KEY);
    if (stored && CONTENT_LANGUAGE_OPTIONS.some((o) => o.code === stored)) {
      _cachedContentLang = stored as ContentLanguageOption;
    }
  } catch {}
}

export function getContentLanguage(): ContentLanguageOption {
  return _cachedContentLang;
}

export async function setContentLanguage(code: ContentLanguageOption): Promise<void> {
  _cachedContentLang = code;
  await AsyncStorage.setItem(CONTENT_LANG_KEY, code);
}

export function resolveContentLang(appLang: string): string {
  if (_cachedContentLang === SAME_AS_APP) {
    const base = appLang.split("-")[0];
    return base || "en";
  }
  return _cachedContentLang;
}
