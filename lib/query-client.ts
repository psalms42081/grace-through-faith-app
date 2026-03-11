import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import type { Persister } from "@tanstack/react-query-persist-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

let _authTokenGetter: (() => string | null) | null = null;

export function setAuthTokenGetter(getter: () => string | null) {
  _authTokenGetter = getter;
}

function getAuthHeaders(): Record<string, string> {
  const token = _authTokenGetter?.();
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  let url = new URL(`https://${host}`);

  return url.href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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

const CACHE_KEY = "grace-through-faith-cache-v2";
const OLD_CACHE_KEYS = ["grace-through-faith-cache"];
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
