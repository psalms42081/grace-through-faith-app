-- Manual re-flag of sda_church.verified. NOT a numbered migration.
-- Do not run via scripts/run-numbered-migrations.ts.
-- Run this yourself in Neon (SQL editor) after reviewing.
--
-- Same rule as isVerifiedStreetAddress() in scripts/insert-sda-churches.ts:
--   verified = true iff
--     trim(address) <> trim(city) (case-insensitive)
--     AND address is not a "Contact Conference Office" placeholder
--     AND (address contains a digit OR a whole-word street token)
-- Seed lists only use the exact phrase "Contact Conference Office";
-- ILIKE '%contact conference%' covers that (case-insensitive).
-- Street tokens use Postgres ~* with \m...\M word boundaries so "St"
-- matches the token "St" but not the "St" inside "Street".

UPDATE "sda_church"
SET "verified" = (
  lower(trim("address")) <> lower(trim("city"))
  AND "address" NOT ILIKE '%contact conference%'
  AND (
    "address" ~ '[0-9]'
    OR "address" ~* '\m(Street|St|Road|Rd|Avenue|Ave|Cnr|Corner|Drive|Dr|Highway|Hwy|Lane|Ln|Place|Pl|Crescent|Cres|Parade|Pde|Court|Ct)\M'
  )
);
