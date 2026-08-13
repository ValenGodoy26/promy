import { useEffect, useRef } from "react";

type LiveRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
};

export function useLiveRefresh(task: () => Promise<void> | void, options?: LiveRefreshOptions) {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? 20000;
  const taskRef = useRef(task);
  const runningRef = useRef(false);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    let intervalId: number | null = null;

    const run = async () => {
      if (runningRef.current) {
        return;
      }

      runningRef.current = true;

      try {
        await taskRef.current();
      } finally {
        runningRef.current = false;
      }
    };

    const start = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (intervalId != null) {
        window.clearInterval(intervalId);
      }

      intervalId = window.setInterval(() => {
        void run();
      }, intervalMs);
    };

    const stop = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void run();
        start();
        return;
      }

      stop();
    };

    const handleFocus = () => {
      void run();
      start();
    };

    start();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
