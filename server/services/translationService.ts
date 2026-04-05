import crypto from "crypto";
import { db } from "../db";
import { contentTranslations } from "../../shared/schema";
import { and, eq } from "drizzle-orm";

const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";

// Languages supported by ElevenLabs eleven_multilingual_v2 — for TTS pass-through
export const ELEVENLABS_SUPPORTED_LANGS = new Set([
  "en", "es", "fr", "pt", "de", "zh", "ja", "ko", "hi", "ar",
  "ru", "id", "it", "nl", "tr", "pl", "sv", "uk", "ro", "cs",
  "el", "fi", "hr", "ms", "sk", "da", "ta", "bg",
]);

// Google Translate supports ~130 languages including sw, am, bs, etc.
// Maps our app lang codes to Google Translate codes
const LANG_MAP: Record<string, string> = {
  fil: "tl", // Filipino → Tagalog (Google's code)
  zh: "zh-CN",
  hr: "hr",   // Croatian (covers Bosnian/Serbian speakers)
  bs: "bs",
  sr: "sr",
  am: "am",
  sw: "sw",
};

export function toGoogleLangCode(appLang: string): string {
  return LANG_MAP[appLang] ?? appLang;
}

function makeContentKey(text: string): string {
  return crypto.createHash("md5").update(text.trim()).digest("hex");
}

/**
 * Translate a single string. Checks DB cache first; if missing, calls Google Translate
 * and permanently stores the result.
 */
export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text?.trim() || targetLang === "en") return text;

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    console.warn("[translate] GOOGLE_TRANSLATE_API_KEY not set — returning original");
    return text;
  }

  const contentKey = makeContentKey(text);
  const googleLang = toGoogleLangCode(targetLang);

  // Check cache
  const [cached] = await db
    .select({ translatedText: contentTranslations.translatedText })
    .from(contentTranslations)
    .where(
      and(
        eq(contentTranslations.contentKey, contentKey),
        eq(contentTranslations.langCode, targetLang)
      )
    )
    .limit(1);

  if (cached) return cached.translatedText;

  // Call Google Translate
  try {
    const res = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: googleLang,
        format: "text",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[translate] Google API error:", res.status, err);
      return text;
    }

    const json = await res.json();
    const translated: string = json?.data?.translations?.[0]?.translatedText ?? text;

    // Cache permanently
    await db
      .insert(contentTranslations)
      .values({ contentKey, langCode: targetLang, originalText: text, translatedText: translated })
      .onConflictDoNothing();

    return translated;
  } catch (err) {
    console.error("[translate] Error:", err);
    return text;
  }
}

/**
 * Translate multiple strings in a single API call (batching).
 * Returns translated array in the same order.
 */
export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (!texts.length || targetLang === "en") return texts;

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return texts;

  const googleLang = toGoogleLangCode(targetLang);
  const results: string[] = [...texts];
  const toFetch: { idx: number; text: string; key: string }[] = [];

  // Check cache for each
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text?.trim()) continue;
    const contentKey = makeContentKey(text);
    const [cached] = await db
      .select({ translatedText: contentTranslations.translatedText })
      .from(contentTranslations)
      .where(and(eq(contentTranslations.contentKey, contentKey), eq(contentTranslations.langCode, targetLang)))
      .limit(1);

    if (cached) {
      results[i] = cached.translatedText;
    } else {
      toFetch.push({ idx: i, text, key: contentKey });
    }
  }

  if (!toFetch.length) return results;

  try {
    const res = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: toFetch.map((t) => t.text),
        source: "en",
        target: googleLang,
        format: "text",
      }),
    });

    if (!res.ok) return results;

    const json = await res.json();
    const translations: string[] = json?.data?.translations?.map((t: any) => t.translatedText) ?? [];

    for (let i = 0; i < toFetch.length; i++) {
      const { idx, text, key } = toFetch[i];
      const translated = translations[i] ?? text;
      results[idx] = translated;

      await db
        .insert(contentTranslations)
        .values({ contentKey: key, langCode: targetLang, originalText: text, translatedText: translated })
        .onConflictDoNothing();
    }
  } catch (err) {
    console.error("[translate] Batch error:", err);
  }

  return results;
}

/**
 * Translate an entire object's string values (for devotionals, study content, etc.)
 * Only translates string fields; skips numbers, booleans, nested objects (recurses into them).
 */
export async function translateObject<T extends Record<string, any>>(
  obj: T,
  targetLang: string,
  fields: (keyof T)[]
): Promise<T> {
  if (targetLang === "en") return obj;

  const textsToTranslate = fields.map((f) => (typeof obj[f] === "string" ? obj[f] : ""));
  const translated = await translateBatch(textsToTranslate, targetLang);

  const result = { ...obj };
  fields.forEach((f, i) => {
    if (typeof obj[f] === "string" && translated[i]) {
      (result as any)[f] = translated[i];
    }
  });
  return result;
}
