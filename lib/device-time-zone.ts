const FALLBACK_TIME_ZONE = "UTC";

export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function withDeviceTimeZone(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}timeZone=${encodeURIComponent(getDeviceTimeZone())}`;
}