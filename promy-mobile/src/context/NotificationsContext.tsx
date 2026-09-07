import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  fetchMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api/notifications";
import { ApiError } from "../api/client";
import { useAuth } from "./AuthContext";
import type { AppNotification } from "../types/api";

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: (options?: { silent?: boolean; force?: boolean }) => Promise<void>;
  markOneAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const MIN_REFRESH_GAP_MS = 8000;
const ACTIVE_POLL_INTERVAL_MS = 30000;

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { session, signOut } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const lastLoadedAtRef = useRef(0);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const refreshNotifications = useCallback(
    async (options?: { silent?: boolean; force?: boolean }) => {
      if (!session?.accessToken) {
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      const silent = options?.silent ?? false;
      const force = options?.force ?? false;
      const now = Date.now();

      if (!force && now - lastLoadedAtRef.current < MIN_REFRESH_GAP_MS && silent) {
        return;
      }

      if (refreshPromiseRef.current) {
        return refreshPromiseRef.current;
      }

      refreshPromiseRef.current = (async () => {
        try {
          if (!silent) setIsLoading(true);
          const response = await fetchMyNotifications(session.accessToken);
          setNotifications(response.notifications ?? []);
          setUnreadCount(response.unreadCount ?? 0);
          lastLoadedAtRef.current = Date.now();
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await signOut({ reason: "Tu sesión venció. Volvé a ingresar para seguir usando PROMY." });
            return;
          }

          if (!silent) {
            throw error;
          }
        } finally {
          if (!silent) setIsLoading(false);
          refreshPromiseRef.current = null;
        }
      })();

      return refreshPromiseRef.current;
    },
    [session?.accessToken, signOut],
  );

  const markOneAsRead = useCallback(
    async (notificationId: number) => {
      if (!session?.accessToken) return;

      const current = notifications.find((item) => item.id === notificationId);
      if (!current || current.readAt) return;

      try {
        const response = await markNotificationAsRead(session.accessToken, notificationId);
        setNotifications((items) =>
          items.map((item) => (item.id === notificationId ? response.notification : item)),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await signOut({ reason: "Tu sesión venció. Volvé a ingresar para seguir usando PROMY." });
          return;
        }

        throw error;
      }
    },
    [notifications, session?.accessToken, signOut],
  );

  const markAllAsRead = useCallback(async () => {
    if (!session?.accessToken || unreadCount === 0) return;

    try {
      await markAllNotificationsAsRead(session.accessToken);
      setNotifications((items) =>
        items.map((item) => ({
          ...item,
          readAt: item.readAt || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await signOut({ reason: "Tu sesión venció. Volvé a ingresar para seguir usando PROMY." });
        return;
      }

      throw error;
    }
  }, [session?.accessToken, signOut, unreadCount]);

  useEffect(() => {
    if (!session?.accessToken) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      lastLoadedAtRef.current = 0;
      return;
    }

    void refreshNotifications({ force: true });
  }, [session?.accessToken, refreshNotifications]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        session?.accessToken &&
        previousState.match(/inactive|background/) &&
        nextState === "active"
      ) {
        void refreshNotifications({ silent: true, force: true });
      }
    });

    return () => subscription.remove();
  }, [refreshNotifications, session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || appStateRef.current !== "active") {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshNotifications({ silent: true });
    }, ACTIVE_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [refreshNotifications, session?.accessToken]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      refreshNotifications,
      markOneAsRead,
      markAllAsRead,
    }),
    [isLoading, markAllAsRead, markOneAsRead, notifications, refreshNotifications, unreadCount],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications debe usarse dentro de NotificationsProvider");
  }

  return context;
}
