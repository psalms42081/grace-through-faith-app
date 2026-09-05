/** Display names and life dates for ingested pioneer authors. No portraits here. */

export type PioneerAuthorMeta = {
  slug: string;
  name: string;
  dates: string;
  birthYear: number;
  deathYear: number;
  /** Explicit shelf position after birth year. Loughborough (2) before Smith (3). */
  shelfOrder: number;
};

/** Birth year ascending; 1832 tie is Loughborough before Smith (not death year, not name). */
export const PIONEER_AUTHORS: PioneerAuthorMeta[] = [
  { slug: "joseph-bates", name: "Joseph Bates", dates: "1792-1872", birthYear: 1792, deathYear: 1872, shelfOrder: 0 },
  { slug: "james-white", name: "James Springer White", dates: "1821-1881", birthYear: 1821, deathYear: 1881, shelfOrder: 1 },
  { slug: "john-loughborough", name: "John Norton Loughborough", dates: "1832-1924", birthYear: 1832, deathYear: 1924, shelfOrder: 2 },
  { slug: "uriah-smith", name: "Uriah Smith", dates: "1832-1903", birthYear: 1832, deathYear: 1903, shelfOrder: 3 },
  { slug: "stephen-haskell", name: "Stephen Nelson Haskell", dates: "1833-1922", birthYear: 1833, deathYear: 1922, shelfOrder: 4 },
  { slug: "at-jones", name: "Alonzo Trevier Jones", dates: "1850-1923", birthYear: 1850, deathYear: 1923, shelfOrder: 5 },
  { slug: "ej-waggoner", name: "Ellet Joseph Waggoner", dates: "1855-1916", birthYear: 1855, deathYear: 1916, shelfOrder: 6 },
];

export const PIONEER_SHELF_SLUGS = PIONEER_AUTHORS.map((author) => author.slug);

const BY_SLUG = new Map(PIONEER_AUTHORS.map((author) => [author.slug, author]));
const BY_NAME = new Map(
  PIONEER_AUTHORS.map((author) => [normalizePioneerName(author.name), author]),
);
const UNKNOWN_YEAR = 9999;

function normalizePioneerName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getPioneerAuthorMeta(
  slug: string,
  fallbackName?: string,
): PioneerAuthorMeta {
  return (
    BY_SLUG.get(slug) ??
    (fallbackName ? BY_NAME.get(normalizePioneerName(fallbackName)) : undefined) ?? {
      slug,
      name: fallbackName || slug,
      dates: "",
      birthYear: UNKNOWN_YEAR,
      deathYear: UNKNOWN_YEAR,
      shelfOrder: UNKNOWN_YEAR,
    }
  );
}

/** Birth year, then explicit catalog order. Never name or death year. */
export function comparePioneerAuthorsByBirth(
  a: { slug: string; name?: string },
  b: { slug: string; name?: string },
): number {
  const left = getPioneerAuthorMeta(a.slug, a.name);
  const right = getPioneerAuthorMeta(b.slug, b.name);
  if (left.birthYear !== right.birthYear) return left.birthYear - right.birthYear;
  if (left.shelfOrder !== right.shelfOrder) return left.shelfOrder - right.shelfOrder;
  return 0;
}

export function sortPioneerAuthorsByBirth<T extends { slug: string; name?: string }>(
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
