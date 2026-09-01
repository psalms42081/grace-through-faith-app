import { joinApiPath } from "@/lib/join-api-path";

export function sabbathSchoolMediaUrl(
  sourceUrl: string,
  options: { platform: string; baseUrl: string },
): string {
  const src = sourceUrl.trim();
  if (!src) return src;
  if (options.platform !== "web") return src;
  return `${joinApiPath(options.baseUrl, "/api/sabbath-school/video")}?url=${encodeURIComponent(src)}`;
}
