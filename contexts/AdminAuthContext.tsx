import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { ApiError, authApi, setAuthToken, setUnauthorizedHandler } from "@/lib/api";

interface AuthContextValue {
  token: string | null;
  expiresAt: number | null;
  initializing: boolean;
  authenticating: boolean;
  error: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  ensureSession: (options?: { silent?: boolean }) => Promise<boolean>;
}

const STORAGE_KEY = "party-admin-token";

const noop = () => Promise.resolve();

interface StoredSession {
  token: string | null;
  expiresAt: number | null;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  expiresAt: null,
  initializing: true,
  authenticating: false,
  error: null,
  login: async () => false,
  logout: noop,
  clearError: () => undefined,
  ensureSession: async () => false,
});

async function writeSession(session: StoredSession) {
  try {
    if (session.token) {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
    return;
  } catch {
    if (typeof window !== "undefined" && window.localStorage) {
      if (session.token) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  }
}

async function readSession(): Promise<StoredSession | null> {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEY);
    if (value) {
      try {
        const parsed = JSON.parse(value) as StoredSession;
        if (typeof parsed?.token === "string" || parsed?.token === null) {
          return {
            token: parsed.token ?? null,
            expiresAt: typeof parsed?.expiresAt === "number" ? parsed.expiresAt : null,
          };
        }
      } catch {
        return { token: value, expiresAt: null };
      }
    }
  } catch {
    // ignore and fallback
  }
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as StoredSession;
      if (typeof parsed?.token === "string" || parsed?.token === null) {
        return {
          token: parsed.token ?? null,
          expiresAt: typeof parsed?.expiresAt === "number" ? parsed.expiresAt : null,
        };
      }
    } catch {
      return { token: stored, expiresAt: null };
    }
  }
  return null;
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<number | null>(null);

  const applySession = useCallback((nextToken: string | null, nextExpiresAt: number | null = null) => {
    setAuthToken(nextToken);
    setTokenState(nextToken);
    setExpiresAt(nextToken ? nextExpiresAt ?? null : null);
    setLastVerifiedAt(null);
    void writeSession({ token: nextToken, expiresAt: nextToken ? nextExpiresAt ?? null : null });
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const stored = await readSession();
      if (!mounted) return;
      if (stored?.token) {
        applySession(stored.token, stored.expiresAt ?? null);
      } else {
        applySession(null);
      }
      if (mounted) setInitializing(false);
    })();
    return () => {
      mounted = false;
    };
  }, [applySession, setError]);

  useEffect(() => {
    const handler = () => {
      setError("Session expired. Please sign in again.");
      applySession(null);
    };
    setUnauthorizedHandler(handler);
    return () => setUnauthorizedHandler(null);
  }, [applySession]);

  const login = useCallback(
    async (password: string) => {
      setAuthenticating(true);
      setError(null);
      try {
        const result = await authApi.login(password);
        const payload = result instanceof Response ? await result.json() : result;
        if (!payload || typeof payload.token !== "string") {
          throw new Error("Invalid response from server");
        }
        applySession(payload.token, typeof payload.expiresAt === "number" ? payload.expiresAt : null);
        setLastVerifiedAt(Date.now());
        setError(null);
        return true;
      } catch (err) {
        const apiErr = err as ApiError;
        const message = apiErr?.message || "Login failed";
        setError(message);
        applySession(null);
        return false;
      } finally {
        setAuthenticating(false);
      }
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // ignore logout errors
    } finally {
      applySession(null);
    }
  }, [applySession]);

  const clearError = useCallback(() => setError(null), []);

  const ensureSession = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!token) {
        if (!silent) setError("Session expired. Please sign in again.");
        return false;
      }
      if (expiresAt && Date.now() >= expiresAt - 5_000) {
        if (!silent) setError("Session expired. Please sign in again.");
        applySession(null);
        return false;
      }
      const now = Date.now();
      if (lastVerifiedAt && now - lastVerifiedAt < 60_000) {
        return true;
      }
      try {
        const response = await authApi.verify();
        const nextExpiresAt =
          response && typeof response === "object" && typeof (response as any).expiresAt === "number"
            ? (response as any).expiresAt
            : expiresAt;
        if (typeof nextExpiresAt === "number") {
          setExpiresAt(nextExpiresAt);
          void writeSession({ token, expiresAt: nextExpiresAt });
        }
        setLastVerifiedAt(now);
        return true;
      } catch (err) {
        const message = err instanceof ApiError ? err.message || undefined : undefined;
        if (!silent) {
          setError(message ?? "Session expired. Please sign in again.");
        }
        applySession(null);
        return false;
      }
    },
    [applySession, expiresAt, lastVerifiedAt, setError, token]
  );

  const value = useMemo(
    () => ({
      token,
      expiresAt,
      initializing,
      authenticating,
      error,
      login,
      logout,
      clearError,
      ensureSession,
    }),
    [token, expiresAt, initializing, authenticating, error, login, logout, clearError, ensureSession]
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
