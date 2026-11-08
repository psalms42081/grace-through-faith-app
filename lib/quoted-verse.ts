const OPEN = "\u201C";
const CLOSE = "\u201D";
const OPENING_MARK = /^[\u201C\u201D\u00AB"']/;
const CLOSING_MARK = /[\u201C\u201D\u00BB"']$/;

/** Wrap a verse in quotation marks, without doubling a closer the version already supplied. */
export function quotedVerseText(text: string): string {
  const body = text.trim();
  if (!body) return body;
  const opening = OPENING_MARK.test(body) ? "" : OPEN;
  const closing = CLOSING_MARK.test(body) ? "" : CLOSE;
  return `${opening}${body}${closing}`;
}
