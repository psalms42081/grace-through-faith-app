/**
 * YouVersion Platform versions travel through the app as "YV<bibleId>" codes so
 * they never collide with local or API.Bible abbreviations. Versions readers already
 * knew by a short code keep it as an alias, so saved preferences and highlights still work.
 */
const YOUVERSION_CODE = /^YV(\d{1,6})$/i;

/** Short codes served from YouVersion (Biblica and Lockman licences held there). */
export const YOUVERSION_ALIASES: Readonly<Record<string, number>> = {
  NIV: 111,
  AMP: 1588,
  NASB: 100,
};

const ALIAS_BY_BIBLE_ID = new Map(Object.entries(YOUVERSION_ALIASES).map(([code, id]) => [id, code]));
const ALIAS_PATTERN = Object.keys(YOUVERSION_ALIASES).join("|");

/** Matches a YouVersion code anywhere in a serialized request body. */
export const YOUVERSION_CODE_IN_TEXT = /\bYV\d{1,6}\b/i;

/** Matches a JSON translation field (also when escaped inside a prompt) naming an aliased version. */
export const YOUVERSION_ALIAS_TRANSLATION_FIELD = new RegExp(
  `\\\\?"translation(?:Id|Code)?\\\\?"\\s*:\\s*\\\\?"(?:${ALIAS_PATTERN})\\\\?"`,
  "i",
);

export function youVersionCode(bibleId: number): string {
  return ALIAS_BY_BIBLE_ID.get(bibleId) ?? `YV${bibleId}`;
}

export function youVersionBibleId(code: string | null | undefined): number | null {
  const trimmed = (code ?? "").trim();
  const alias = YOUVERSION_ALIASES[trimmed.toUpperCase()];
  if (alias !== undefined) return alias;
  const match = YOUVERSION_CODE.exec(trimmed);
  return match ? Number(match[1]) : null;
}

export function isYouVersionCode(code: string | null | undefined): boolean {
  return youVersionBibleId(code) !== null;
}

/**
 * The translation an AI feature may read. YouVersion text must never reach a
 * model (Platform terms and publisher licences), so AI features use the local KJV.
 */
export function aiScriptureTranslation(code: string): string {
  return isYouVersionCode(code) ? "KJV" : code;
}

const YOUVERSION_TRANSLATION_PARAM = new RegExp(`[?&]translation=(?:YV\\d+|${ALIAS_PATTERN})(?:&|$)`, "i");

/** Query keys whose responses carry YouVersion text; these must never be persisted on device. */
export function isYouVersionScriptureQueryKey(key: string): boolean {
  return /^\/api\/(?:passage|verse)\b/.test(key) && YOUVERSION_TRANSLATION_PARAM.test(key);
}

/** Whole-query-key form: also covers `["/api/verse", { translation }]` and `["/api/passage", book, chapter, code]`. */
export function isYouVersionScriptureQuery(queryKey: readonly unknown[]): boolean {
  const head = String(queryKey[0] ?? "");
  if (isYouVersionScriptureQueryKey(head)) return true;
  if (!/^\/api\/(?:passage|verse)\b/.test(head)) return false;
  return queryKey.slice(1).some((part) => {
    if (typeof part === "string") return isYouVersionCode(part);
    if (part && typeof part === "object") {
      const translation = (part as { translation?: unknown }).translation;
      return typeof translation === "string" && isYouVersionCode(translation);
    }
    return false;
  });
}
