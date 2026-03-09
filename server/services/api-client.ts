const API_TIMEOUTS = {
  openai: 30_000,
  elevenlabs: 20_000,
  external: 10_000,
} as const;

export type ApiService = keyof typeof API_TIMEOUTS;

export function getTimeout(service: ApiService): number {
  return API_TIMEOUTS[service];
}

export function createTimeoutSignal(service: ApiService): AbortSignal {
  return AbortSignal.timeout(API_TIMEOUTS[service]);
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { service?: ApiService; serviceLabel?: string } = {},
): Promise<Response> {
  const service = options.service ?? "external";
  const label = options.serviceLabel ?? service;
  const timeout = API_TIMEOUTS[service];
  const start = Date.now();

  const { service: _s, serviceLabel: _sl, signal: existingSignal, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  if (existingSignal) {
    existingSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    const duration = Date.now() - start;
    const endpoint = sanitizeUrl(url);
    console.log(`[api:ok] service=${label} endpoint=${endpoint} duration=${duration}ms status=${response.status}`);
    return response;
  } catch (err: any) {
    const duration = Date.now() - start;
    const endpoint = sanitizeUrl(url);
    const errorType = err?.name === "AbortError" ? "timeout" : (err?.code ?? err?.name ?? "unknown");
    console.error(`[api:fail] service=${label} endpoint=${endpoint} duration=${duration}ms error=${errorType} message=${err?.message ?? "unknown"}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function logApiSuccess(service: string, start: number, extra?: string): void {
  const duration = Date.now() - start;
  const suffix = extra ? ` ${extra}` : "";
  console.log(`[api:ok] service=${service} duration=${duration}ms${suffix}`);
}

export function logApiFailure(service: string, start: number, err: any, extra?: string): void {
  const duration = Date.now() - start;
  const errorType = err?.name === "AbortError" ? "timeout" : (err?.code ?? err?.name ?? "unknown");
  const suffix = extra ? ` ${extra}` : "";
  console.error(`[api:fail] service=${service} duration=${duration}ms error=${errorType} message=${err?.message ?? "unknown"}${suffix}`);
}

function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return url.substring(0, 80);
  }
}
