import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUPPORTED_LANGUAGES, type SupportedLangCode } from "@/lib/i18n";

const CONTENT_LANG_KEY = "@grace-through-faith/contentLanguage";
const SAME_AS_APP = "same";

export type ContentLanguageOption = "same" | SupportedLangCode;

// Build options list dynamically from all 22 registered languages
export const CONTENT_LANGUAGE_OPTIONS: { code: ContentLanguageOption; label: string }[] = [
  { code: "same", label: "Same as App Language" },
  ...SUPPORTED_LANGUAGES.map((l) => ({ code: l.code as ContentLanguageOption, label: l.label })),
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

/**
 * Resolve the actual language code to send to the server.
 * - "same" → use the current app UI language
 * - anything else → use that code directly
 */
export function resolveContentLang(appLang: string): string {
  if (_cachedContentLang === SAME_AS_APP) {
    const base = appLang.split("-")[0];
    return base || "en";
  }
  return _cachedContentLang;
}
