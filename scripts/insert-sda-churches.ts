import { sdaChurches } from "../shared/schema";

/** Unique key added in migrations/0008_rebuild_sda_church.sql. */
export const sdaChurchConflictTarget = [
  sdaChurches.name,
  sdaChurches.address,
  sdaChurches.city,
  sdaChurches.country,
] as const;

export function sdaChurchNaturalKey(church: {
  name: string;
  address: string;
  city: string;
  country: string;
}): string {
  return `${church.name}\0${church.address}\0${church.city}\0${church.country}`;
}

/**
 * Whole-word street tokens (case-insensitive). Shared with
 * scripts/reflag-sda-church-verified.sql — keep the two lists in sync.
 */
export const STREET_ADDRESS_WORDS = [
  "Street",
  "St",
  "Road",
  "Rd",
  "Avenue",
  "Ave",
  "Cnr",
  "Corner",
  "Drive",
  "Dr",
  "Highway",
  "Hwy",
  "Lane",
  "Ln",
  "Place",
  "Pl",
  "Crescent",
  "Cres",
  "Parade",
  "Pde",
  "Court",
  "Ct",
] as const;

const STREET_WORD_RE = new RegExp(
  `\\b(?:${STREET_ADDRESS_WORDS.join("|")})\\b`,
  "i",
);

/** Curated placeholders like "Contact Conference Office" stay unverified. */
export function isConferenceOfficePlaceholder(address: string): boolean {
  return /contact\s+conference/i.test(address);
}

/**
 * Street-address heuristic (used for curated-global seed and tests):
 * verified=true iff address ≠ city (trim, case-insensitive)
 * AND (address contains a street word OR a digit)
 * AND address is not a "Contact Conference Office" placeholder.
 */
export function isVerifiedStreetAddress(address: string, city: string): boolean {
  const addr = address.trim();
  const cityTrim = city.trim();
  if (addr.toLowerCase() === cityTrim.toLowerCase()) return false;
  if (isConferenceOfficePlaceholder(addr)) return false;
  return /\d/.test(addr) || STREET_WORD_RE.test(addr);
}

type ChurchInsert = typeof sdaChurches.$inferInsert;

/**
 * Insert churches; skip rows that already exist on (name, address, city, country).
 * Requires unique index sda_church_name_address_city_country_uniq (migration 0008).
 *
 * Only the two curated lists may seed this table:
 * - seed-global-churches.ts (source=curated-global)
 * - seed-worldwide-churches.ts (source=curated-worldwide)
 * Run both via: npx tsx scripts/reseed-sda-churches-curated.ts
 */
export async function insertSdaChurchesIgnoreDuplicates(
  database: { insert: (table: typeof sdaChurches) => any },
  batch: ChurchInsert[],
): Promise<void> {
  if (batch.length === 0) {
    return;
  }
  await database
    .insert(sdaChurches)
    .values(batch)
    .onConflictDoNothing({
      target: [...sdaChurchConflictTarget],
    });
}
