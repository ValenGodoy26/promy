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
import {
  createAsyncMutationQueue,
  createGenerationTaskCoordinator,
  createSessionEpoch,
  isTerminalRefreshStatus,
} from "../auth/sessionLifecycle";

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
  const sessionEpochRef = useRef(createSessionEpoch());
  const storageMutationQueueRef = useRef(createAsyncMutationQueue());
  const refreshCoordinatorRef = useRef(createGenerationTaskCoordinator<AuthSession | null>());

  const persistSession = async (
    nextSession: AuthSession,
    expectedEpoch = sessionEpochRef.current.current(),
  ) => {
    if (!sessionEpochRef.current.isCurrent(expectedEpoch)) {
      return false;
    }

    const serializedSession = JSON.stringify(nextSession);

    try {
      const stored = await storageMutationQueueRef.current.enqueue(async () => {
        if (!sessionEpochRef.current.isCurrent(expectedEpoch)) {
          return false;
        }

        await writeStoredSession(serializedSession);
        return true;
      });

      if (!stored || !sessionEpochRef.current.isCurrent(expectedEpoch)) {
        return false;
      }

      sessionRef.current = nextSession;
      setSession(nextSession);
      return true;
    } catch (error) {
      if (sessionEpochRef.current.isCurrent(expectedEpoch)) {
        await invalidateSession(null, expectedEpoch);
      }
      throw error;
    }
  };

  const invalidateSession = async (
    notice?: string | null,
    expectedEpoch?: number,
  ) => {
    if (
      expectedEpoch !== undefined &&
      !sessionEpochRef.current.isCurrent(expectedEpoch)
    ) {
      return false;
    }

    sessionEpochRef.current.invalidate();
    sessionRef.current = null;
    setSession(null);
    if (notice !== undefined) {
      setAuthNotice(notice);
    }

    try {
      await storageMutationQueueRef.current.enqueue(async () => {
        await clearStoredSession();
      });
    } catch {
      console.warn("No pudimos borrar la sesión local de forma segura.");
    }

    return true;
  };

  const clearSession = async () => {
    await invalidateSession();
  };

  const refreshSessionInternal = async (baseSession?: AuthSession | null) => {
    const activeSession = baseSession ?? sessionRef.current;
    const refreshEpoch = sessionEpochRef.current.current();

    if (!activeSession?.refreshToken) {
      return null;
    }

    return refreshCoordinatorRef.current.run(refreshEpoch, async () => {
      try {
        const response = await refreshAccessToken(activeSession.refreshToken!);
        const nextSession: AuthSession = {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: response.user,
        };

        const stored = await persistSession(nextSession, refreshEpoch);
        if (stored) {
          return nextSession;
        }

        // Si logout ganó la carrera, también invalidamos el token rotado remoto.
        void logoutSession(nextSession.refreshToken).catch(() => {
          console.warn("No pudimos revocar una sesión que terminó de renovarse.");
        });
        return null;
      } catch (error) {
        if (!sessionEpochRef.current.isCurrent(refreshEpoch)) {
          return null;
        }

        if (!(error instanceof ApiError) || !isTerminalRefreshStatus(error.status)) {
          throw error;
        }

        await invalidateSession(
          "Tu sesión venció o fue revocada. Volvé a ingresar para seguir usando PROMY.",
          refreshEpoch,
        );
        return null;
      }
    });
  };

  useEffect(() => {
    const restoreSession = async () => {
      const restoreEpoch = sessionEpochRef.current.current();

      try {
        const raw = await readStoredSession();
        if (!raw) {
          await invalidateSession(null, restoreEpoch);
          return;
        }

        const restoredSession = JSON.parse(raw) as AuthSession;
        const restored = await persistSession(restoredSession, restoreEpoch);
        if (!restored) return;

        try {
          const me = await fetchCurrentUser(restoredSession.accessToken);
          await persistSession({
            ...restoredSession,
            user: me.user,
          }, restoreEpoch);
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await refreshSessionInternal(restoredSession);
            return;
          }

          // Red, timeout y 5xx no invalidan credenciales que todavía pueden recuperarse.
          if (!sessionEpochRef.current.isCurrent(restoreEpoch)) return;
        }
      } catch (error) {
        if (sessionEpochRef.current.isCurrent(restoreEpoch)) {
          console.warn("No pudimos restaurar la sesión local de forma segura.");
          await invalidateSession(null, restoreEpoch);
        }
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
        const currentAccessToken = sessionRef.current?.accessToken;
        const currentRefreshToken = sessionRef.current?.refreshToken;
        await invalidateSession(options?.reason ?? null);

        // El logout local es inmediato aun sin red. La revocación remota es best-effort.
        void (async () => {
          try {
            await unregisterStoredPushToken(currentAccessToken);
          } catch {
            console.warn("No pudimos desactivar el token push del dispositivo.");
          }

          if (!currentRefreshToken) return;

          try {
            await logoutSession(currentRefreshToken);
          } catch {
            console.warn("No pudimos revocar la sesión en el backend.");
          }
        })();
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
