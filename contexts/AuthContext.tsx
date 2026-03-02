import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, setAuthTokenGetter, getApiUrl } from "@/lib/query-client";
import { queryClient } from "@/lib/query-client";
import { fetch } from "expo/fetch";

const AUTH_TOKEN_KEY = "@grace_auth_token";

interface AuthUser {
  id: string;
  displayName: string | null;
  email: string | null;
  familyId: string | null;
  isPro: boolean;
  isPatron: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  userId: string;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current);
  }, []);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
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
      queryClient.clear();
      return { success: true };
    } catch (err: any) {
      const msg = err.message || "Login failed";
      const errorText = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg;
      try {
        const parsed = JSON.parse(errorText);
        return { success: false, error: parsed.error || "Login failed" };
      } catch {
        return { success: false, error: errorText || "Login failed" };
      }
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const res = await apiRequest("POST", "/api/auth/register", { email, password, displayName });
      const data = (await (res as any).json()) as { user: AuthUser; token: string; error?: string };

      if (data.error) return { success: false, error: data.error };

      tokenRef.current = data.token;
      setToken(data.token);
      setUser(data.user);
      setAuthTokenGetter(() => data.token);
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
      queryClient.clear();
      return { success: true };
    } catch (err: any) {
      const msg = err.message || "Registration failed";
      const errorText = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg;
      try {
        const parsed = JSON.parse(errorText);
        return { success: false, error: parsed.error || "Registration failed" };
      } catch {
        return { success: false, error: errorText || "Registration failed" };
      }
    }
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string) => {
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { email, newPassword });
      const data = (await (res as any).json()) as { user: AuthUser; token: string; error?: string };

      if (data.error) return { success: false, error: data.error };

      tokenRef.current = data.token;
      setToken(data.token);
      setUser(data.user);
      setAuthTokenGetter(() => data.token);
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token);
      queryClient.clear();
      return { success: true };
    } catch (err: any) {
      const msg = err.message || "Password reset failed";
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
  const userId = user?.id || "guest";

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
