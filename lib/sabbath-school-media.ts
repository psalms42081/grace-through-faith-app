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

export function sabbathSchoolMediaUrl(
  sourceUrl: string,
  options: { platform: string; baseUrl: string },
): string {
  return sabbathSchoolProxiedUrl(sourceUrl, options, "/api/sabbath-school/video");
}

/** Web-only same-origin proxy — Adventech audio has no CORS headers. */
export function sabbathSchoolAudioUrl(
  sourceUrl: string,
  options: { platform: string; baseUrl: string },
): string {
  return sabbathSchoolProxiedUrl(sourceUrl, options, "/api/sabbath-school/audio");
}
