import { joinApiPath } from "@/lib/join-api-path";

function sabbathSchoolProxiedUrl(
  sourceUrl: string,
  options: { platform: string; baseUrl: string },
  path: "/api/sabbath-school/video" | "/api/sabbath-school/audio",
): string {
  const src = sourceUrl.trim();
  if (!src) return src;
  if (options.platform !== "web") return src;
  return `${joinApiPath(options.baseUrl, path)}?url=${encodeURIComponent(src)}`;
}

/** YouTube image hosts. These are shown as YouTube sent them, not via the Adventech proxy. */
export function isYouTubeThumbnailUrl(sourceUrl: string): boolean {
  try {
    return /(^|\.)ytimg\.com$/i.test(new URL(sourceUrl.trim()).hostname);
  } catch {
    return false;
  }
}

export function sabbathSchoolMediaUrl(
  sourceUrl: string,
  options: { platform: string; baseUrl: string },
): string {
  const src = sourceUrl.trim();
  if (isYouTubeThumbnailUrl(src)) return src;
  return sabbathSchoolProxiedUrl(src, options, "/api/sabbath-school/video");
}

/** Web-only same-origin proxy — Adventech audio has no CORS headers. */
export function sabbathSchoolAudioUrl(
  sourceUrl: string,
  options: { platform: string; baseUrl: string },
): string {
  return sabbathSchoolProxiedUrl(sourceUrl, options, "/api/sabbath-school/audio");
}
