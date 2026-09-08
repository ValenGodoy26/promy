import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  fetchCurrentUser,
  loginWithEmail,
  logoutSession,
  registerClientAccount,
  refreshAccessToken,
} from "../api/auth";
import { ApiError, configureApiClient } from "../api/client";
import { unregisterStoredPushToken } from "../services/push";
import { AuthSession } from "../types/api";
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from "../auth/sessionStorage";

type AuthContextValue = {
  session: AuthSession | null;
  isBootstrapping: boolean;
  isSigningIn: boolean;
  authNotice: string | null;
  clearAuthNotice: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUpClient: (input: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  signOut: (options?: { reason?: string | null }) => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
  updateSessionUser: (nextUser: AuthSession["user"]) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  const refreshPromiseRef = useRef<Promise<AuthSession | null> | null>(null);

  const persistSession = async (nextSession: AuthSession | null) => {
    if (nextSession) {
      try {
        await writeStoredSession(JSON.stringify(nextSession));
      } catch (error) {
        sessionRef.current = null;
        setSession(null);
        await clearStoredSession();
        throw error;
      }
      sessionRef.current = nextSession;
      setSession(nextSession);
      return;
    }

    sessionRef.current = null;
    setSession(null);
    await clearStoredSession();
  };

  const clearSession = async (notice?: string | null) => {
    setAuthNotice(notice ?? null);
    await persistSession(null);
  };

  const refreshSessionInternal = async (baseSession?: AuthSession | null) => {
    const activeSession = baseSession ?? sessionRef.current;

    if (!activeSession?.refreshToken) {
      return null;
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const response = await refreshAccessToken(activeSession.refreshToken!);
        const nextSession: AuthSession = {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: response.user,
        };

        await persistSession(nextSession);
        return nextSession;
      } catch (error) {
        if (error instanceof ApiError && error.status === 0) {
          throw error;
        }

        await clearSession("Tu sesión venció. Volvé a ingresar para seguir usando PROMY.");
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = await readStoredSession();
        if (!raw) {
          await persistSession(null);
          return;
        }

        const restoredSession = JSON.parse(raw) as AuthSession;

        try {
          const me = await fetchCurrentUser(restoredSession.accessToken);
          await persistSession({
            ...restoredSession,
            user: me.user,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            const refreshedSession = await refreshSessionInternal(restoredSession);
            await persistSession(refreshedSession);
            return;
          }

          await persistSession(restoredSession);
        }
      } catch (error) {
        console.warn("No pudimos restaurar la sesión", error);
        await clearSession();
      } finally {
        setIsBootstrapping(false);
      }
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    configureApiClient({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      refreshAccessToken: async () => {
        const nextSession = await refreshSessionInternal();
        return nextSession?.accessToken ?? null;
      },
      clearSession,
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isBootstrapping,
      isSigningIn,
      authNotice,
      clearAuthNotice: () => {
        setAuthNotice(null);
      },
      signIn: async (email: string, password: string) => {
        setIsSigningIn(true);
        setAuthNotice(null);
        try {
          const response = await loginWithEmail(email, password);
          const nextSession: AuthSession = {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
          };

          await persistSession(nextSession);
          if (!response.user.emailVerifiedAt) {
            setAuthNotice(
              "Tu email todavia no esta verificado. Revisa el enlace de verificacion antes de operar funciones sensibles.",
            );
          }
        } finally {
          setIsSigningIn(false);
        }
      },
      signUpClient: async ({ fullName, email, password, phone }) => {
        setIsSigningIn(true);
        setAuthNotice(null);
        try {
          await registerClientAccount({
            fullName,
            email,
            password,
            phone,
          });

          const response = await loginWithEmail(email, password);
          const nextSession: AuthSession = {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
          };

          await persistSession(nextSession);
          if (!response.user.emailVerifiedAt) {
            setAuthNotice(
              "Tu email todavia no esta verificado. Revisa el enlace de verificacion antes de operar funciones sensibles.",
            );
          }
        } finally {
          setIsSigningIn(false);
        }
      },
      signOut: async (options?: { reason?: string | null }) => {
        try {
          await unregisterStoredPushToken();
        } catch (error) {
          console.warn("No pudimos desactivar el token push del dispositivo", error);
        }

        const currentRefreshToken = sessionRef.current?.refreshToken;

        try {
          if (currentRefreshToken) {
            await logoutSession(currentRefreshToken);
          }
        } catch (error) {
          console.warn("No pudimos cerrar sesión en el backend", error);
        } finally {
          await clearSession(options?.reason ?? null);
        }
      },
      refreshSession: async () => refreshSessionInternal(),
      updateSessionUser: async (nextUser) => {
        if (!sessionRef.current) return;

        await persistSession({
          ...sessionRef.current,
          user: nextUser,
        });
      },
    }),
    [authNotice, isBootstrapping, isSigningIn, session],
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
