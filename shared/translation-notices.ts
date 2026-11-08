/**
 * Copyright notices for local (bible_verse) versions that are not in the public domain.
 * The reader shows them at the foot of every chapter, in the same block as YouVersion
 * attributions.
 */
export interface AttributionLink {
  /** The first occurrence of this phrase in the copyright text becomes a link. */
  text: string;
  url: string;
}

export interface TranslationNotice {
  text: string;
  /** Phrases in `text` that must link out; the first occurrence of each is linked. */
  links: AttributionLink[];
  publisherName: string | null;
  publisherUrl: string | null;
  versionName: string;
}

export const NET_COPYRIGHT_NOTICE =
  "Scripture quoted by permission. Quotations designated (NET) are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C. https://netbible.com All rights reserved.";

const LOCAL_TRANSLATION_NOTICES: Readonly<Record<string, TranslationNotice>> = {
  // bible.org permits the noteless NET text in internet apps when the designation NET
  // links to netbible.org.
  NET: {
    text: NET_COPYRIGHT_NOTICE,
    links: [{ text: "NET", url: "https://netbible.org" }],
    publisherName: null,
    publisherUrl: null,
    versionName: "NET Bible®",
  },
};

export function localTranslationNotice(code: string | null | undefined): TranslationNotice | null {
  return LOCAL_TRANSLATION_NOTICES[(code ?? "").trim().toUpperCase()] ?? null;
}

/** The licence label for the translations catalog. */
export function localTranslationLicense(code: string): string {
  return localTranslationNotice(code) ? "by_permission" : "public_domain";
}

const URL_IN_TEXT = /((?:https?:\/\/|www\.)[^\s)]+[^\s).,;])/gi;

export interface TextSegment {
  text: string;
  url?: string;
}

/** Splits copyright text into plain runs and links: web addresses, then each named phrase once. */
export function linkSegments(text: string, links: AttributionLink[] = []): TextSegment[] {
  let segments: TextSegment[] = text
    .split(URL_IN_TEXT)
    .map((part, index) => (index % 2 === 1 ? { text: part, url: part } : { text: part }))
    .filter((segment) => segment.text);
  for (const link of links) {
    const at = segments.findIndex((segment) => !segment.url && segment.text.includes(link.text));
    if (at < 0) continue;
    const plain = segments[at].text;
    const start = plain.indexOf(link.text);
    const pieces: TextSegment[] = [
      { text: plain.slice(0, start) },
      { text: link.text, url: link.url },
      { text: plain.slice(start + link.text.length) },
    ].filter((segment) => segment.text);
    segments = [...segments.slice(0, at), ...pieces, ...segments.slice(at + 1)];
  }
  return segments;
}
