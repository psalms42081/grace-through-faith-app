/**
 * YouVersion Platform versions travel through the app as "YV<bibleId>" codes so
 * they never collide with local or API.Bible abbreviations.
 */
const YOUVERSION_CODE = /^YV(\d{1,6})$/i;

/** Matches a YouVersion code anywhere in a serialized request body. */
export const YOUVERSION_CODE_IN_TEXT = /\bYV\d{1,6}\b/i;

export function youVersionCode(bibleId: number): string {
  return `YV${bibleId}`;
}

export function youVersionBibleId(code: string | null | undefined): number | null {
  const match = YOUVERSION_CODE.exec((code ?? "").trim());
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

/** Query keys whose responses carry YouVersion text; these must never be persisted on device. */
export function isYouVersionScriptureQueryKey(key: string): boolean {
  return /^\/api\/(?:passage|verse)\b/.test(key) && /[?&]translation=YV\d+/i.test(key);
}
