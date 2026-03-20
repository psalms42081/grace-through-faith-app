import { TRANSLATION_MAP } from "../../lib/bibleTranslationMap";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese",
  fil: "Filipino",
  zh: "Chinese",
};

export function getTranslationId(languageCode: string): string {
  const base = languageCode.split("-")[0];
  return TRANSLATION_MAP[base] ?? TRANSLATION_MAP.en;
}

export function getLanguageName(code: string): string {
  const base = code.split("-")[0];
  return LANGUAGE_NAMES[base] ?? "English";
}

export function buildDevotionalPrompt(topic: string, languageCode: string): string {
  const language = getLanguageName(languageCode);
  return [
    `You are a Seventh-day Adventist devotional writer.`,
    `Always respond in ${language}.`,
    `Maintain a warm, peaceful, theologically grounded tone.`,
    `Write a short devotional about: ${topic}`,
  ].join("\n");
}

export function buildSabbathPrompt(context: string, languageCode: string): string {
  const language = getLanguageName(languageCode);
  return [
    `You are a Seventh-day Adventist worship guide.`,
    `Always respond in ${language}.`,
    `Provide a warm, reverent Sabbath reflection.`,
    `Context: ${context}`,
  ].join("\n");
}

export function buildPrayerPrompt(prayerRequest: string, languageCode: string): string {
  const language = getLanguageName(languageCode);
  return [
    `You are a compassionate Christian prayer companion.`,
    `Always respond in ${language}.`,
    `Offer a gentle, scripturally grounded response to this prayer request.`,
    `Prayer request: ${prayerRequest}`,
  ].join("\n");
}
