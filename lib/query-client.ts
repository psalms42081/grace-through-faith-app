import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

let _authTokenGetter: (() => string | null) | null = null;
let _deviceIdGetter: (() => string | null) | null = null;
let _contentLanguageGetter: (() => string | null) | null = null;

export function setAuthTokenGetter(getter: () => string | null) {
  _authTokenGetter = getter;
}

export function setDeviceIdGetter(getter: () => string | null) {
  _deviceIdGetter = getter;
}

export function setContentLanguageGetter(getter: () => string | null) {
  _contentLanguageGetter = getter;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = _authTokenGetter?.();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const deviceId = _deviceIdGetter?.();
  if (deviceId) {
    headers["X-Device-Id"] = deviceId;
  }
  const lang = _contentLanguageGetter?.();
  if (lang) {
    headers["X-Content-Language"] = lang;
  }
  return headers;
}

export function getApiUrl(): string {
  const host = process.env.EXPO_PUBLIC_DOMAIN;

  // If EXPO_PUBLIC_DOMAIN is set to a real (non-local) domain, always use it.
  // This allows Railway / cloud deployments to work even in __DEV__ mode.
  const isLocal = !host ||
    host.startsWith("localhost") ||
    host.startsWith("127.") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  if (host && !isLocal) {
    return `https://${host}/`;
  }

  // No cloud domain set — auto-detect local dev server IP from Expo's manifest.
  // Expo knows the PC's current IP (it uses it to serve the JS bundle),
  // so we extract that IP and point the API at port 5000 on the same machine.
  if (__DEV__) {
    const expoHost: string | undefined =
      (Constants as any).expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any).manifest?.debuggerHost;
    if (expoHost) {
      const ip = expoHost.split(":")[0];
      return `http://${ip}:5000/`;
    }
  }

  if (host) {
    return `http://${host}/`;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin + "/";
  }

  throw new Error("EXPO_PUBLIC_DOMAIN is not set and no window.location available");
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {
      text = res.statusText;
    }
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error(`${res.status}: Server is temporarily unavailable. Please try again.`);
    }
    try {
      const json = JSON.parse(text);
      throw new Error(`${res.status}: ${JSON.stringify(json)}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith(`${res.status}:`)) throw e;
    }
    const cleaned = text.length > 200 ? text.slice(0, 200) : text;
    throw new Error(`${res.status}: ${cleaned || res.statusText}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  if (data) headers["Content-Type"] = "application/json";

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: TWENTY_FOUR_HOURS,
      gcTime: TWENTY_FOUR_HOURS * 7,
      retry: false,
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: false,
    },
  },
});

const CACHE_KEY = "grace-through-faith-cache-v9";
const OLD_CACHE_KEYS = ["grace-through-faith-cache", "grace-through-faith-cache-v2", "grace-through-faith-cache-v3", "grace-through-faith-cache-v4", "grace-through-faith-cache-v5", "grace-through-faith-cache-v6", "grace-through-faith-cache-v7", "grace-through-faith-cache-v8"];
let throttleTimer: ReturnType<typeof setTimeout> | null = null;

AsyncStorage.multiRemove(OLD_CACHE_KEYS).catch(() => {});

export const asyncStoragePersister: Persister = {
  persistClient: async (client) => {
    if (throttleTimer) clearTimeout(throttleTimer);
    throttleTimer = setTimeout(async () => {
      try {
        const serialized = JSON.stringify(client);
        if (serialized.length > 5 * 1024 * 1024) {
          await AsyncStorage.removeItem(CACHE_KEY);
          return;
        }
        await AsyncStorage.setItem(CACHE_KEY, serialized);
      } catch {}
    }, 2000);
  },
  restoreClient: async () => {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEY);
      return data ? JSON.parse(data) : undefined;
    } catch {
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {}
  },
};
