/** Display names and life dates for ingested pioneer authors. No portraits here. */

export type PioneerAuthorMeta = {
  slug: string;
  name: string;
  dates: string;
  birthYear: number;
  deathYear: number;
};

/** Chronological by birth year; same year uses earlier death year (Smith before Loughborough). */
export const PIONEER_AUTHORS: PioneerAuthorMeta[] = [
  { slug: "joseph-bates", name: "Joseph Bates", dates: "1792-1872", birthYear: 1792, deathYear: 1872 },
  { slug: "james-white", name: "James Springer White", dates: "1821-1881", birthYear: 1821, deathYear: 1881 },
  { slug: "uriah-smith", name: "Uriah Smith", dates: "1832-1903", birthYear: 1832, deathYear: 1903 },
  { slug: "john-loughborough", name: "John Norton Loughborough", dates: "1832-1924", birthYear: 1832, deathYear: 1924 },
  { slug: "stephen-haskell", name: "Stephen Nelson Haskell", dates: "1833-1922", birthYear: 1833, deathYear: 1922 },
  { slug: "at-jones", name: "Alonzo Trevier Jones", dates: "1850-1923", birthYear: 1850, deathYear: 1923 },
  { slug: "ej-waggoner", name: "Ellet Joseph Waggoner", dates: "1855-1916", birthYear: 1855, deathYear: 1916 },
];

const BY_SLUG = new Map(PIONEER_AUTHORS.map((author) => [author.slug, author]));
const UNKNOWN_YEAR = 9999;

export function getPioneerAuthorMeta(
  slug: string,
  fallbackName?: string,
): PioneerAuthorMeta {
  return (
    BY_SLUG.get(slug) ?? {
      slug,
      name: fallbackName || slug,
      dates: "",
      birthYear: UNKNOWN_YEAR,
      deathYear: UNKNOWN_YEAR,
    }
  );
}

/** Birth year, then death year. No alphabetical fallback. */
export function comparePioneerAuthorsByBirth(
  a: { slug: string },
  b: { slug: string },
): number {
  const left = getPioneerAuthorMeta(a.slug);
  const right = getPioneerAuthorMeta(b.slug);
  if (left.birthYear !== right.birthYear) return left.birthYear - right.birthYear;
  if (left.deathYear !== right.deathYear) return left.deathYear - right.deathYear;
  return 0;
}

export function sortPioneerAuthorsByBirth<T extends { slug: string }>(
  authors: T[],
): T[] {
  return [...authors].sort(comparePioneerAuthorsByBirth);
}

export const PIONEER_SHELF_PUBLIC_DOMAIN =
  "Public domain — all works on this shelf were published before 1929";

export function publicDomainLine(
  author: string,
  book: string,
  year: number,
): string {
  return `Public domain — ${author}, ${book} (${year})`;
}
