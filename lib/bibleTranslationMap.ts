export const TRANSLATION_MAP: Record<string, string> = {
  en: "KJV",
  es: "RV1909",
  fr: "LSG",
  pt: "ARC",
  fil: "TAGV",
};

export function getTranslationForLanguage(languageCode: string): string {
  const base = languageCode.split("-")[0];
  return TRANSLATION_MAP[base] ?? TRANSLATION_MAP.en;
}
