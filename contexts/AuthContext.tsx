import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, setAuthTokenGetter, setDeviceIdGetter, setContentLanguageGetter, getApiUrl } from "@/lib/query-client";
import { resolveContentLang } from "@/lib/content-language";
import i18n from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";
import { fetch } from "expo/fetch";
import { registerPushToken } from "@/lib/notifications";

const AUTH_TOKEN_KEY = "@grace_auth_token";
const DEVICE_UUID_KEY = "@grace-through-faith/deviceUUID";

interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  familyId: string | null;
  isPro: boolean;
  isPatron: boolean;
  role: string;
  organizationId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  userId: string;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName: string, profileType?: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isGuest: true,
  isLoading: true,
  userId: "guest",
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  resetPassword: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function generateDeviceUUID(): string {
  return "device-" + Date.now().toString(36) + "-" + Math.random().toString(36).substr(2, 9);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string>("guest");
  const tokenRef = useRef<string | null>(null);
  const deviceIdRef = useRef<string>("guest");

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current);
    setDeviceIdGetter(() => deviceIdRef.current);
    setContentLanguageGetter(() => resolveContentLang(i18n.language || "en"));
  }, []);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      let storedDeviceId = await AsyncStorage.getItem(DEVICE_UUID_KEY);
      if (!storedDeviceId) {
        storedDeviceId = generateDeviceUUID();
        await AsyncStorage.setItem(DEVICE_UUID_KEY, storedDeviceId);
      }
      setDeviceId(storedDeviceId);
      deviceIdRef.current = storedDeviceId;

      const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (savedToken) {
        tokenRef.current = savedToken;
        setToken(savedToken);
        setAuthTokenGetter(() => savedToken);

        const baseUrl = getApiUrl();
        const url = new URL("/api/auth/me", baseUrl);
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user && !data.isGuest) {
            setUser(data.user);
          } else {
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            tokenRef.current = null;
            setToken(null);
            setAuthTokenGetter(() => null);
          }
        } else {
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          tokenRef.current = null;
          setToken(null);
          setAuthTokenGetter(() => null);
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const migrateGuestData = useCallback(async (authToken: string) => {
    try {
      const currentDeviceId = deviceIdRef.current;
      if (!currentDeviceId || currentDeviceId === "guest") return;
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/migrate-guest-data", baseUrl);
      await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "X-Device-Id": currentDeviceId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
    } catch {}
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = (await (res as any).json()) as { user: AuthUser; token: string; error?: string };

      if (data.error) return { success: false, error: data.error };

      tokenRef.current = data.token;
      setToken(data.token);
      setUser(data.user);
      setAuthTokenGetter(() => data.token);
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
      await migrateGuestData(data.token);
      queryClient.clear();
      return { success: true };
    } catch (err: any) {
      const msg = err.message || "Login failed";
      if (msg.includes("<!DOCTYPE") || msg.includes("<html") || msg.includes("temporarily unavailable")) {
        return { success: false, error: "Unable to reach the server. Please check your connection and try again." };
      }
      const errorText = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg;
      try {
        const parsed = JSON.parse(errorText);
        return { success: false, error: parsed.error || "Login failed" };
      } catch {
        return { success: false, error: errorText || "Login failed" };
      }
    }
  }, [migrateGuestData]);

  const register = useCallback(async (email: string, password: string, displayName: string, profileType?: string) => {
    try {
      const res = await apiRequest("POST", "/api/auth/register", { email, password, displayName, profileType: profileType || "member" });
      const data = (await (res as any).json()) as { user: AuthUser; token: string; error?: string };

      if (data.error) return { success: false, error: data.error };

      tokenRef.current = data.token;
      setToken(data.token);
      setUser(data.user);
      setAuthTokenGetter(() => data.token);
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
      await migrateGuestData(data.token);
      queryClient.clear();
      return { success: true };
    } catch (err: any) {
      const msg = err.message || "Registration failed";
      if (msg.includes("<!DOCTYPE") || msg.includes("<html") || msg.includes("temporarily unavailable")) {
        return { success: false, error: "Unable to reach the server. Please check your connection and try again." };
      }
      const errorText = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg;
      try {
        const parsed = JSON.parse(errorText);
        return { success: false, error: parsed.error || "Registration failed" };
      } catch {
        return { success: false, error: errorText || "Registration failed" };
      }
    }
  }, [migrateGuestData]);

  const resetPassword = useCallback(async (email: string, _newPassword: string) => {
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { email, newPassword: _newPassword });
      const status = (res as any).status;
      const data = (await (res as any).json()) as { user?: AuthUser; token?: string; error?: string };

      if (status === 501) {
        return { success: false, error: data.error || "Password reset is not available. Please contact support." };
      }

      if (data.error) return { success: false, error: data.error };

      if (data.token && data.user) {
        tokenRef.current = data.token;
        setToken(data.token);
        setUser(data.user);
        setAuthTokenGetter(() => data.token!);
        await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
        queryClient.clear();
      }
      return { success: true };
    } catch (err: any) {
      const msg = err.message || "Password reset failed";
      if (msg.includes("501")) {
        return { success: false, error: "Password reset is not available. Please contact support." };
      }
      const errorText = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg;
      try {
        const parsed = JSON.parse(errorText);
        return { success: false, error: parsed.error || "Password reset failed" };
      } catch {
        return { success: false, error: errorText || "Password reset failed" };
      }
    }
  }, []);

  const logout = useCallback(async () => {
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    setAuthTokenGetter(() => null);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem("@grace-through-faith/onboarded");
    queryClient.clear();
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/me", baseUrl);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) setUser(data.user);
      }
    } catch {}
  }, []);

  const isAuthenticated = !!user && !!token;
  const isGuest = !isAuthenticated;
  const userId = user?.id || deviceId;

  useEffect(() => {
    if (isAuthenticated && token) {
      registerPushToken(token, getApiUrl()).catch(() => {});
    }
  }, [isAuthenticated, token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isGuest,
        isLoading,
        userId,
        login,
        register,
        resetPassword,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
