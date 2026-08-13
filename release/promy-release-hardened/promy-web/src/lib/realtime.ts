import { useEffect, useState } from "react";
import type { AuthSession, RealtimeEvent } from "../types/api";
import { buildRealtimeEventsUrl, createRealtimeStreamToken } from "./api";

type SessionExecutor = <T>(executor: (session: AuthSession) => Promise<T>) => Promise<T>;

export function useRealtimeVersion(options: {
  session: AuthSession | null;
  withSession: SessionExecutor;
  enabled?: boolean;
}) {
  const [version, setVersion] = useState(0);
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled || !options.session || typeof window === "undefined") {
      return;
    }

    let active = true;
    let eventSource: EventSource | null = null;
    let retryTimer: number | null = null;

    const cleanup = () => {
      if (retryTimer != null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }

      eventSource?.close();
      eventSource = null;
    };

    const scheduleReconnect = () => {
      if (!active) {
        return;
      }

      if (retryTimer != null) {
        window.clearTimeout(retryTimer);
      }

      retryTimer = window.setTimeout(() => {
        void connect();
      }, 3000);
    };

    const connect = async () => {
      cleanup();

      try {
        const response = await options.withSession((session) => createRealtimeStreamToken(session));

        if (!active) {
          return;
        }

        eventSource = new EventSource(buildRealtimeEventsUrl(response.streamToken));

        eventSource.onmessage = (message) => {
          try {
            const event = JSON.parse(message.data) as RealtimeEvent & { type?: string };

            if (!event?.type || event.type === "connected") {
              return;
            }

            setVersion((current) => current + 1);
          } catch {
            // Ignoramos frames malformados para no cortar el stream.
          }
        };

        eventSource.onerror = () => {
          cleanup();
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      active = false;
      cleanup();
    };
  }, [enabled, options.session, options.withSession]);

  return version;
}
