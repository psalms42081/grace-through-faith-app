/** Citation strings used to find a verse inside EGW / pioneer / Sabbath School prose. */

const EXTRA_NAMES: Record<string, string[]> = {
  genesis: ["Gen", "Gen."],
  exodus: ["Ex", "Ex.", "Exod", "Exod."],
  psalms: ["Psalm", "Psalms", "Ps", "Ps.", "Psa", "Psa."],
  psalm: ["Psalm", "Psalms", "Ps", "Ps.", "Psa", "Psa."],
  john: ["Jn", "Jn.", "Jhn", "Jhn."],
  matthew: ["Mt", "Mt.", "Matt", "Matt."],
  mark: ["Mk", "Mk."],
  luke: ["Lk", "Lk."],
  "1 john": ["1 Jn", "1 Jn.", "1Jn"],
  "2 john": ["2 Jn", "2 Jn.", "2Jn"],
  "3 john": ["3 Jn", "3 Jn.", "3Jn"],
};

export function scriptureCiteNeedles(opts: {
  bookName: string;
  abbreviation?: string | null;
  chapter: number;
  verse: number;
}): string[] {
  const name = opts.bookName.trim();
  const ch = String(opts.chapter);
  const v = String(opts.verse);
  const names = new Set<string>();
  if (name) names.add(name);
  const extras = EXTRA_NAMES[name.toLowerCase()];
  if (extras) extras.forEach((item) => names.add(item));
  const abbrev = opts.abbreviation?.trim();
  if (abbrev) {
    names.add(abbrev);
    if (!abbrev.endsWith(".")) names.add(`${abbrev}.`);
  }

  const out: string[] = [];
  for (const label of names) {
    out.push(`${label} ${ch}:${v}`);
    out.push(`${label} ${ch}. ${v}`);
    out.push(`${label} ${ch}.${v}`);
  }
  return [...new Set(out)];
}

export function textCitesNeedles(haystack: string, needles: string[]): boolean {
  if (!haystack) return false;
  const lower = haystack.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}
