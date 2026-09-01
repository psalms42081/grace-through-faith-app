/**
 * Join an API origin to an absolute path without producing `//api`.
 * `getApiUrl()` always ends with `/`; string-concat of `${base}/api/...` is wrong.
 * Same resolution as `apiRequest` (`new URL(path, base)`).
 */
export function joinApiPath(baseUrl: string, path: string): string {
  const pathWithSlash = path.startsWith("/") ? path : `/${path}`;
  return new URL(pathWithSlash, baseUrl).toString();
}

export function churchMapEmbedUrl(
  baseUrl: string,
  search: URLSearchParams,
): string {
  const url = new URL(joinApiPath(baseUrl, "/api/map-embed"));
  url.search = search.toString();
  return url.toString();
}
