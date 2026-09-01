/**
 * Phase 1 has no B2B model. Org / leader / conference tools stay in the
 * codebase (tables, routes, screens) but stay hidden unless this is true.
 * Set EXPO_PUBLIC_ENABLE_ORG_TOOLS=true to revive Profile + nav entry points.
 */
export const ENABLE_ORG_TOOLS =
  process.env.EXPO_PUBLIC_ENABLE_ORG_TOOLS === "true";

/**
 * Phase 1 has no premium tier (YouVersion Platform terms forbid subscriptions
 * / upgrades). ProGate, Go Premium rows, and padlock gates stay in the
 * codebase but stay hidden unless this is true.
 * Set EXPO_PUBLIC_ENABLE_PREMIUM=true to revive premium entry points.
 */
export const ENABLE_PREMIUM =
  process.env.EXPO_PUBLIC_ENABLE_PREMIUM === "true";
