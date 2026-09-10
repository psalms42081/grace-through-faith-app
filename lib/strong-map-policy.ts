import * as crypto from "crypto";

/** Tagged STEP maps cover KJV. AI generate is only a fallback for other translations. */
export function isKjvTranslation(translation: string): boolean {
  return translation.trim().toUpperCase() === "KJV";
}

export function shouldGenerateAiStrongMap(translation: string): boolean {
  return !isKjvTranslation(translation);
}

export const STEP_STRONG_SOURCE = "step";
export const AI_STRONG_SOURCE = "ai";
export const LEGACY_STRONG_SOURCE = "legacy";

export const STRONG_MAP_CACHE_VERSION = "strong-map-canon-v3";

export function strongMapCacheHash(translation: string, verseId: string): string {
  const hashInput = [STRONG_MAP_CACHE_VERSION, translation, verseId].join("::");
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}
