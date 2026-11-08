import { useQuery } from "@tanstack/react-query";
import type { CatalogTranslation } from "@/lib/translation-catalog";

export const TRANSLATION_CATALOG_QUERY_KEY = ["/api/translations"] as const;

const FULL_CATALOG_STALE_MS = 60 * 60 * 1000;
/** A list without YouVersion entries came from a moment the Platform was unreachable; ask again soon. */
const PARTIAL_CATALOG_STALE_MS = 60 * 1000;

function hasYouVersion(data: CatalogTranslation[] | undefined): boolean {
  return !!data?.some((entry) => entry.source === "youversion");
}

export function catalogStaleTime(data: CatalogTranslation[] | undefined): number {
  return hasYouVersion(data) ? FULL_CATALOG_STALE_MS : PARTIAL_CATALOG_STALE_MS;
}

/** GET /api/translations, refreshed hourly, and every minute while YouVersion is missing from it. */
export function useTranslationCatalog() {
  return useQuery<CatalogTranslation[]>({
    queryKey: TRANSLATION_CATALOG_QUERY_KEY,
    staleTime: (query) => catalogStaleTime(query.state.data as CatalogTranslation[] | undefined),
    refetchInterval: (query) =>
      query.state.data && !hasYouVersion(query.state.data as CatalogTranslation[]) ? PARTIAL_CATALOG_STALE_MS : false,
  });
}
