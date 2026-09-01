/** Shared catalog query for Discover's Daily Devotionals rail and the Devotions tab. */
export const DEVOTIONAL_CATALOG_QUERY_KEY = ["/api/devotionals/plans"] as const;

export type DevotionalCatalogPlan = {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  theme: string | null;
  category: string | null;
  isAiGenerated?: boolean | null;
  isPublished?: boolean | null;
  provenance?: string | null;
};

/** Client-side match for GET /api/devotionals/plans: published, human-authored, not AI. */
export function isApprovedHumanDevotionalPlan(plan: DevotionalCatalogPlan): boolean {
  if (plan.isAiGenerated === true) return false;
  if (plan.isPublished === false) return false;
  if (plan.provenance != null && plan.provenance !== "human_curated") return false;
  return true;
}
