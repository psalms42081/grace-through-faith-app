export type RunningBuildInfo = {
  /** Native app version from the embedded config, e.g. "1.0.0". */
  version?: string | null;
  /** expo-updates channel ("preview", "production"); empty or null when not configured. */
  channel?: string | null;
  /** expo-updates update id (UUID) of the running bundle; null for the embedded bundle. */
  updateId?: string | null;
  /** True when the bundle shipped inside the store build is running. */
  isEmbeddedLaunch?: boolean | null;
};

/** First block of the update UUID, enough to match an `eas update` listing by eye. */
export function shortUpdateId(updateId: string | null | undefined): string {
  const trimmed = (updateId ?? "").trim();
  if (!trimmed) return "";
  return trimmed.split("-")[0].slice(0, 8);
}

/**
 * "Version 1.0.0 · preview · update 1a2b3c4d" on an over-the-air bundle,
 * "Version 1.0.0 · preview · built-in" on the embedded one. Channel is left out when unknown.
 */
export function appVersionLine(info: RunningBuildInfo): string {
  const parts = [`Version ${(info.version ?? "").trim() || "1.0.0"}`];
  const channel = (info.channel ?? "").trim();
  if (channel) parts.push(channel);
  const id = shortUpdateId(info.updateId);
  parts.push(info.isEmbeddedLaunch || !id ? "built-in" : `update ${id}`);
  return parts.join(" · ");
}
