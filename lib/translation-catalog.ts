import { isYouVersionCode } from "@/shared/youversion";
import {
  AUSTRALIAN_EDITIONS,
  AUSTRALIAN_ENTRY_ALIASES,
  AUSTRALIAN_GROUP_ALIASES,
  AUSTRALIAN_GROUP_NAME,
  booksForEdition,
  coverageLabel,
  editionChipLabel,
  searchAliasMatches,
  type CoverageLabel,
} from "@/shared/partial-bible";

/** One entry from GET /api/translations. `abbreviation` is the app-wide code. */
export interface CatalogTranslation {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  languageName?: string;
  displayAbbreviation?: string;
  source?: string;
  provider?: string;
  available?: boolean;
  /** Protestant books this edition contains, when it is not a full Bible. */
  books?: string[];
  /** False when the catalogue knows the edition contains every Protestant book. */
  partial?: boolean;
  /** Set on Languages of Australia rows: the language people know the edition by. */
  australiaLanguage?: string;
  /** Set on Languages of Australia rows. */
  coverage?: CoverageLabel;
}

export interface TranslationLanguageGroup {
  language: string;
  languageName: string;
  entries: CatalogTranslation[];
}

const SOURCE_ORDER: Record<string, number> = { db: 0, nlt_provider: 1, api_bible: 2, youversion: 3 };

export function availableCatalog(catalog: CatalogTranslation[] | undefined): CatalogTranslation[] {
  return (catalog ?? []).filter((entry) => entry.available !== false && !!entry.abbreviation);
}

/** Reader-facing short name for a translation code ("YV2692" shows as "NASB2020"). */
export function translationLabel(code: string, catalog: CatalogTranslation[] | undefined): string {
  const chip = editionChipLabel(code);
  if (chip) return chip;
  const entry = catalog?.find((t) => t.abbreviation.toUpperCase() === code.trim().toUpperCase());
  return entry?.displayAbbreviation || entry?.abbreviation || code;
}

export function translationName(code: string, catalog: CatalogTranslation[] | undefined): string | undefined {
  return catalog?.find((t) => t.abbreviation.toUpperCase() === code.trim().toUpperCase())?.name;
}

/** Local, NLT and API.Bible versions; YouVersion has no search API and is read-only here. */
export function isSearchableTranslation(code: string): boolean {
  return !isYouVersionCode(code);
}

function primaryLanguage(tag: string): string {
  return (tag || "").split("-")[0].toLowerCase();
}

/** Picker groups: English first, then languages A–Z; local and licensed sources before YouVersion. */
export function groupTranslationsByLanguage(catalog: CatalogTranslation[]): TranslationLanguageGroup[] {
  const groups = new Map<string, TranslationLanguageGroup>();
  for (const entry of catalog) {
    const languageName = entry.languageName || entry.language || "Other";
    const key = languageName.toLowerCase();
    const group = groups.get(key) ?? { language: entry.language, languageName, entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    group.entries.sort(
      (a, b) =>
        (SOURCE_ORDER[a.source ?? "db"] ?? 9) - (SOURCE_ORDER[b.source ?? "db"] ?? 9) ||
        translationSortLabel(a).localeCompare(translationSortLabel(b)),
    );
  }
  const sorted = [...groups.values()].sort((a, b) => {
    const aEnglish = primaryLanguage(a.language) === "en" && a.languageName === "English";
    const bEnglish = primaryLanguage(b.language) === "en" && b.languageName === "English";
    if (aEnglish !== bEnglish) return aEnglish ? -1 : 1;
    return a.languageName.localeCompare(b.languageName);
  });
  const australia = australianLanguageGroup(catalog);
  if (!australia) return sorted;
  const englishIndex = sorted.findIndex(
    (group) => primaryLanguage(group.language) === "en" && group.languageName === "English",
  );
  sorted.splice(englishIndex === -1 ? 0 : englishIndex + 1, 0, australia);
  return sorted;
}

/** The nine First Nations editions, most complete first. They also stay in their own language groups. */
function australianLanguageGroup(catalog: CatalogTranslation[]): TranslationLanguageGroup | null {
  const byCode = new Map(catalog.map((entry) => [entry.abbreviation.toUpperCase(), entry]));
  const entries: CatalogTranslation[] = [];
  for (const edition of AUSTRALIAN_EDITIONS) {
    const entry = byCode.get(edition.code);
    if (!entry) continue;
    const books = booksForEdition(edition.code, entry);
    entries.push({
      ...entry,
      australiaLanguage: edition.language,
      coverage: coverageLabel(books),
    });
  }
  if (!entries.length) return null;
  return { language: "aus", languageName: AUSTRALIAN_GROUP_NAME, entries };
}

function translationSortLabel(entry: CatalogTranslation): string {
  return (entry.displayAbbreviation || entry.abbreviation).toLowerCase();
}

/**
 * 0 exact abbreviation, 1 abbreviation prefix, 2 name, 3 language.
 * Exact codes such as NET stay above a language that merely contains the letters.
 */
function translationSearchRank(
  entry: CatalogTranslation,
  needle: string,
  languageMatched: boolean,
  aliasMatched: boolean,
): number | null {
  const labels = [entry.abbreviation, entry.displayAbbreviation]
    .map((value) => (value ?? "").trim().toLowerCase())
    .filter(Boolean);
  if (labels.some((label) => label === needle)) return 0;
  if (labels.some((label) => label.startsWith(needle))) return 1;
  if (entry.name.toLowerCase().includes(needle) || aliasMatched) return 2;
  return languageMatched ? 3 : null;
}

/** Groups whose language, abbreviation or name match the query; empty query keeps everything. */
export function filterTranslationGroups(
  groups: TranslationLanguageGroup[],
  query: string,
): TranslationLanguageGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return groups;
  const ranked: { group: TranslationLanguageGroup; rank: number }[] = [];
  for (const group of groups) {
    const groupAlias = group.languageName === AUSTRALIAN_GROUP_NAME && searchAliasMatches(AUSTRALIAN_GROUP_ALIASES, needle);
    const languageMatched = group.languageName.toLowerCase().includes(needle) || groupAlias;
    const preserveOrder = group.languageName === AUSTRALIAN_GROUP_NAME;
    const entries = group.entries
      .map((entry, index) => ({
        entry,
        index,
        rank: translationSearchRank(
          entry,
          needle,
          languageMatched,
          searchAliasMatches(AUSTRALIAN_ENTRY_ALIASES[entry.abbreviation.toUpperCase()], needle),
        ),
      }))
      .filter((item): item is { entry: CatalogTranslation; index: number; rank: number } => item.rank !== null)
      .sort(
        (a, b) =>
          a.rank - b.rank ||
          (preserveOrder ? a.index - b.index : translationSortLabel(a.entry).localeCompare(translationSortLabel(b.entry))),
      );
    if (!entries.length) continue;
    ranked.push({
      group: { ...group, entries: entries.map((item) => item.entry) },
      rank: entries[0].rank,
    });
  }
  ranked.sort((a, b) => a.rank - b.rank);
  return ranked.map((item) => item.group);
}
