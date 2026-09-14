import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  loginRequest,
  logoutRequest,
  refreshRequest,
} from "./lib/api";
import { createRefreshCoordinator } from "./lib/refreshCoordinator";
import {
  getRefreshFailureAction,
  getUserFacingErrorMessage,
  SESSION_EXPIRED_MESSAGE,
  shouldAttemptSessionRestore,
} from "./lib/httpErrors";
import type { AuthSession, AuthUser } from "./types/api";

type AuthContextValue = {
  session: AuthSession | null;
  booting: boolean;
  loggingOut: boolean;
  authNotice: string | null;
  canRetrySession: boolean;
  clearAuthNotice: () => void;
  login: (email: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
  withSession: <T>(executor: (session: AuthSession) => Promise<T>) => Promise<T>;
};

const EMAIL_UNVERIFIED_NOTICE =
  "Tu email todavia no esta verificado. Revisa el enlace de verificacion antes de operar el comercio.";
const REFRESH_SESSION_HINT_KEY = "promy_has_refresh_session";

const AuthContext = createContext<AuthContextValue | null>(null);
const refreshCoordinator = createRefreshCoordinator(refreshRequest);

function hasRefreshSessionHint() {
  try {
    return window.localStorage.getItem(REFRESH_SESSION_HINT_KEY) === "true";
  } catch {
    return false;
  }
}

function setRefreshSessionHint(enabled: boolean) {
  try {
    if (enabled) {
      window.localStorage.setItem(REFRESH_SESSION_HINT_KEY, "true");
      return;
    }
    window.localStorage.removeItem(REFRESH_SESSION_HINT_KEY);
  } catch {
    // Ignore storage failures; auth still works through the in-memory session.
  }
}

function buildWebSession(input: { accessToken: string; user: AuthUser }): AuthSession {
  return {
    accessToken: input.accessToken,
    user: input.user,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [booting, setBooting] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [canRetrySession, setCanRetrySession] = useState(false);

  const applySession = useCallback((nextSession: AuthSession | null) => {
    setSession(nextSession);
  }, []);

  const clearAuthNotice = useCallback(() => {
    setAuthNotice(null);
  }, []);

  const invalidateSession = useCallback(
    (notice?: string | null) => {
      refreshCoordinator.invalidate();
      applySession(null);
      setRefreshSessionHint(false);
      setCanRetrySession(false);
      setAuthNotice(notice ?? null);
    },
    [applySession],
  );

  const refreshSession = useCallback(async () => {
    const attempt = refreshCoordinator.request();
    try {
      const refreshed = await attempt.promise;
      if (!refreshCoordinator.isCurrent(attempt.generation)) return null;
      const nextSession = buildWebSession({
        accessToken: refreshed.accessToken,
        user: refreshed.user,
      });
      applySession(nextSession);
      setRefreshSessionHint(true);
      setCanRetrySession(false);
      setAuthNotice(refreshed.user.emailVerifiedAt ? null : EMAIL_UNVERIFIED_NOTICE);
      return nextSession;
    } catch (error) {
      if (!refreshCoordinator.isCurrent(attempt.generation)) return null;
      if (getRefreshFailureAction(error) === "expire") {
        invalidateSession(SESSION_EXPIRED_MESSAGE);
        return null;
      }
      setCanRetrySession(true);
      setAuthNotice(getUserFacingErrorMessage(error, "load"));
      throw error;
    }
  }, [applySession, invalidateSession]);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (!shouldAttemptSessionRestore(window.location.pathname, hasRefreshSessionHint())) {
        applySession(null);
        setBooting(false);
        return;
      }

      const attempt = refreshCoordinator.request();
      try {
        const refreshed = await attempt.promise;
        if (!active || !refreshCoordinator.isCurrent(attempt.generation)) return;
        const nextSession = buildWebSession({
          accessToken: refreshed.accessToken,
          user: refreshed.user,
        });
        applySession(nextSession);
        setRefreshSessionHint(true);
        setCanRetrySession(false);
        if (!refreshed.user.emailVerifiedAt) {
          setAuthNotice(EMAIL_UNVERIFIED_NOTICE);
        }
      } catch (error) {
        if (!active || !refreshCoordinator.isCurrent(attempt.generation)) return;
        if (getRefreshFailureAction(error) === "expire") {
          setRefreshSessionHint(false);
          setCanRetrySession(false);
          setAuthNotice(SESSION_EXPIRED_MESSAGE);
        } else {
          console.warn("No pudimos restaurar la sesion web desde refresh.", error);
          setCanRetrySession(true);
          setAuthNotice(getUserFacingErrorMessage(error, "load"));
        }
        applySession(null);
      } finally {
        if (active) setBooting(false);
      }
    };

    void restore();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    clearAuthNotice();
    refreshCoordinator.invalidate();
    const response = await loginRequest(email, password);
    const nextSession = buildWebSession({
      accessToken: response.accessToken,
      user: response.user,
    });
    applySession(nextSession);
    setRefreshSessionHint(true);
    setCanRetrySession(false);
    if (!response.user.emailVerifiedAt) {
      setAuthNotice(EMAIL_UNVERIFIED_NOTICE);
    }
    return nextSession;
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await logoutRequest();
    } catch {
      // noop: although backend logout may fail, local session must still be cleared.
    } finally {
      invalidateSession(null);
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  };

  const withSession = async <T,>(
    executor: (currentSession: AuthSession) => Promise<T>,
  ) => {
    const currentSession = session;

    if (!currentSession) {
      const refreshed = await refreshSession();
      if (!refreshed) {
        navigate("/login", { replace: true });
        throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
      }
      return executor(refreshed);
    }

    try {
      return await executor(currentSession);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        const refreshed = await refreshSession();
        if (!refreshed) {
          navigate("/login", { replace: true });
          throw new ApiError(SESSION_EXPIRED_MESSAGE, 401);
        }
        return executor(refreshed);
      }
      throw error;
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      booting,
      loggingOut,
      authNotice,
      canRetrySession,
      clearAuthNotice,
      login,
      logout,
      refreshSession,
      withSession,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authNotice, booting, canRetrySession, clearAuthNotice, loggingOut, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
