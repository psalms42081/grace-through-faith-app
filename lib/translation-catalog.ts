import { isYouVersionCode } from "@/shared/youversion";

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

/** Reader-facing abbreviation for a translation code ("YV2692" shows as "NASB2020"). */
export function translationLabel(code: string, catalog: CatalogTranslation[] | undefined): string {
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
  return [...groups.values()].sort((a, b) => {
    const aEnglish = primaryLanguage(a.language) === "en" && a.languageName === "English";
    const bEnglish = primaryLanguage(b.language) === "en" && b.languageName === "English";
    if (aEnglish !== bEnglish) return aEnglish ? -1 : 1;
    return a.languageName.localeCompare(b.languageName);
  });
}

function translationSortLabel(entry: CatalogTranslation): string {
  return (entry.displayAbbreviation || entry.abbreviation).toLowerCase();
}

/** Groups whose language, abbreviation or name match the query; empty query keeps everything. */
export function filterTranslationGroups(
  groups: TranslationLanguageGroup[],
  query: string,
): TranslationLanguageGroup[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return groups;
  const result: TranslationLanguageGroup[] = [];
  for (const group of groups) {
    if (group.languageName.toLowerCase().includes(needle)) {
      result.push(group);
      continue;
    }
    const entries = group.entries.filter((entry) =>
      [entry.displayAbbreviation, entry.abbreviation, entry.name].some((field) =>
        (field ?? "").toLowerCase().includes(needle),
      ),
    );
    if (entries.length) result.push({ ...group, entries });
  }
  return result;
}
