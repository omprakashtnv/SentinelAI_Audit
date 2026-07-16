import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
  subscribeToAuthSession,
} from "@/services/api/auth-session-store";
import { logoutUser, refreshUserSession } from "@/services/api/auth";
import type { AuthSession, AuthUser } from "@/types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSessionState] = useState<AuthSession | null>(() => getAuthSession());
  const [status, setStatus] = useState<AuthStatus>(session ? "authenticated" : "loading");
  const hasAttemptedInitialRestore = useRef(Boolean(session));

  useEffect(() => {
    return subscribeToAuthSession((nextSession) => {
      setSessionState(nextSession);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession(): Promise<void> {
      try {
        const restoredSession = await refreshUserSession();

        if (!isMounted) {
          return;
        }

        setAuthSession(restoredSession);
      } catch {
        if (!isMounted) {
          return;
        }

        clearAuthSession();
      }
    }

    if (!session && !hasAttemptedInitialRestore.current) {
      hasAttemptedInitialRestore.current = true;
      void restoreSession();
    }

    return () => {
      isMounted = false;
    };
  }, [session]);

  const setSession = useCallback((nextSession: AuthSession) => {
    setAuthSession(nextSession);
  }, []);

  const clearSession = useCallback(() => {
    clearAuthSession();
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      clearAuthSession();
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: status === "authenticated",
      isInitializing: status === "loading",
      setSession,
      clearSession,
      logout,
    }),
    [clearSession, logout, session, setSession, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
