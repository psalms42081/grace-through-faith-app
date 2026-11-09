import { createHash } from "node:crypto";
import { STRONG_MAP_CACHE_VERSION } from "../../lib/strong-map-policy";

export { STRONG_MAP_CACHE_VERSION };

export function strongMapCacheHash(translation: string, verseId: string): string {
  const hashInput = [STRONG_MAP_CACHE_VERSION, translation, verseId].join("::");
  return createHash("sha256").update(hashInput).digest("hex");
}
