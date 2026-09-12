import type { Server } from "node:http";
import { markServerShuttingDown } from "./runtimeState";

type ShutdownDependencies = {
  server: Server;
  timeoutMs: number;
  stopBackgroundWork: () => void;
  closeRealtime: () => void;
  closeCache: () => Promise<void>;
  disconnectDatabase: () => Promise<void>;
  flushTelemetry: (timeoutMs: number) => Promise<boolean>;
  exit: (code: number) => void;
  onForced?: () => void;
};

export function createShutdownController(dependencies: ShutdownDependencies) {
  let shutdownPromise: Promise<void> | null = null;

  return (exitCode: number) => {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      markServerShuttingDown();
      dependencies.stopBackgroundWork();
      dependencies.closeRealtime();
      const deadlineAt = Date.now() + dependencies.timeoutMs;
      const cleanupReserveMs = Math.min(500, Math.max(10, Math.floor(dependencies.timeoutMs * 0.2)));

      const httpClosed = new Promise<void>((resolve) => {
        const idleSweep = setInterval(() => {
          dependencies.server.closeIdleConnections?.();
        }, 25);
        idleSweep.unref();
        dependencies.server.close(() => {
          clearInterval(idleSweep);
          resolve();
        });
        dependencies.server.closeIdleConnections?.();
      });

      const waitWithin = async (operation: Promise<unknown>, timeoutMs: number) => {
        let timeout: NodeJS.Timeout | undefined;
        const completed = await Promise.race([
          operation.then(() => true),
          new Promise<false>((resolve) => {
            timeout = setTimeout(() => resolve(false), Math.max(0, timeoutMs));
          }),
        ]);
        if (timeout) clearTimeout(timeout);
        return completed;
      };

      const httpDrained = await waitWithin(
        httpClosed,
        Math.max(0, dependencies.timeoutMs - cleanupReserveMs),
      );
      if (!httpDrained) {
        dependencies.onForced?.();
        dependencies.server.closeAllConnections?.();
      }

      const resourcesClosed = Promise.allSettled([
        dependencies.closeCache(),
        dependencies.disconnectDatabase(),
        dependencies.flushTelemetry(Math.max(1, deadlineAt - Date.now())),
      ]);
      const resourcesDrained = await waitWithin(resourcesClosed, deadlineAt - Date.now());
      if (!resourcesDrained && httpDrained) {
        dependencies.onForced?.();
      }

      dependencies.exit(httpDrained && resourcesDrained ? exitCode : 1);
    })();

    return shutdownPromise;
  };
}
