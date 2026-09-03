/** Display names and life dates for ingested pioneer authors. No portraits here. */

export type PioneerAuthorMeta = {
  slug: string;
  name: string;
  dates: string;
};

export const PIONEER_AUTHORS: PioneerAuthorMeta[] = [
  { slug: "joseph-bates", name: "Joseph Bates", dates: "1792-1872" },
  { slug: "james-white", name: "James Springer White", dates: "1821-1881" },
  { slug: "john-loughborough", name: "John Norton Loughborough", dates: "1832-1924" },
  { slug: "uriah-smith", name: "Uriah Smith", dates: "1832-1903" },
  { slug: "stephen-haskell", name: "Stephen Nelson Haskell", dates: "1833-1922" },
  { slug: "ej-waggoner", name: "Ellet Joseph Waggoner", dates: "1855-1916" },
  { slug: "at-jones", name: "Alonzo Trevier Jones", dates: "1850-1923" },
];

const BY_SLUG = new Map(PIONEER_AUTHORS.map((author) => [author.slug, author]));

export function getPioneerAuthorMeta(
  slug: string,
  fallbackName?: string,
): PioneerAuthorMeta {
  return (
    BY_SLUG.get(slug) ?? {
      slug,
      name: fallbackName || slug,
      dates: "",
    }
  );
}

export function publicDomainLine(
  author: string,
  book: string,
  year: number,
): string {
  return `Public domain — ${author}, ${book} (${year})`;
}
