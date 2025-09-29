import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ApiError,
  authApi,
  setAuthToken,
  setUnauthorizedHandler,
} from "@/lib/api";

interface AuthContextValue {
  token: string | null;
  initializing: boolean;
  authenticating: boolean;
  error: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const STORAGE_KEY = "party-admin-token";

const noop = () => Promise.resolve();

const AuthContext = createContext<AuthContextValue>({
  token: null,
  initializing: true,
  authenticating: false,
  error: null,
  login: async () => false,
  logout: noop,
  clearError: () => undefined,
});

async function writeToken(token: string | null) {
  try {
    if (token) {
      await SecureStore.setItemAsync(STORAGE_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
    return;
  } catch (err) {
    if (typeof window !== "undefined" && window.localStorage) {
      if (token) window.localStorage.setItem(STORAGE_KEY, token);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }
}

async function readToken() {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEY);
    if (value) return value;
  } catch (err) {
    // ignore and fallback
  }
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(STORAGE_KEY);
  }
  return null;
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyToken = useCallback((nextToken: string | null) => {
    setAuthToken(nextToken);
    setTokenState(nextToken);
    void writeToken(nextToken);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await readToken();
      if (!mounted) return;
      if (stored) {
        applyToken(stored);
      }
      if (mounted) setInitializing(false);
    })();
    return () => {
      mounted = false;
    };
  }, [applyToken]);

  useEffect(() => {
    const handler = () => {
      applyToken(null);
    };
    setUnauthorizedHandler(handler);
    return () => setUnauthorizedHandler(null);
  }, [applyToken]);

  const login = useCallback(
    async (password: string) => {
      setAuthenticating(true);
      setError(null);
      try {
        const result = await authApi.login(password);
        const payload =
          result instanceof Response ? await result.json() : result;
        if (!payload || typeof payload.token !== "string") {
          throw new Error("Invalid response from server");
        }
        applyToken(payload.token);
        setError(null);
        return true;
      } catch (err) {
        const apiErr = err as ApiError;
        const message = apiErr?.message || "Login failed";
        setError(message);
        applyToken(null);
        return false;
      } finally {
        setAuthenticating(false);
      }
    },
    [applyToken]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // ignore logout errors
    } finally {
      applyToken(null);
    }
  }, [applyToken]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      token,
      initializing,
      authenticating,
      error,
      login,
      logout,
      clearError,
    }),
    [token, initializing, authenticating, error, login, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
