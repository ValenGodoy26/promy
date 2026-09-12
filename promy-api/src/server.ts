import "dotenv/config";
import app from "./app";
import prisma from "./config/prisma";
import { env } from "./config/env";
import {
  startPromotionExpirationLoop,
  stopPromotionExpirationLoop,
} from "./shared/utils/promotionExpiration";
import { logError, logInfo, logWarn } from "./shared/logging/logger";
import { captureApiException, initApiSentry } from "./shared/observability/sentry";
import { flushApiSentry } from "./shared/observability/sentry";
import { closeAllRealtimeClients } from "./modules/realtime/realtime.service";
import { sharedTtlCache } from "./shared/cache/ttlCache";
import { createShutdownController } from "./shared/server/shutdown";

initApiSentry();

const bootstrap = async () => {
  try {
    await prisma.$connect();
    startPromotionExpirationLoop();

    const server = app.listen(env.PORT, () => {
      logInfo(undefined, "PROMY API iniciada", {
        port: env.PORT,
        baseUrl: `http://localhost:${env.PORT}`,
      });
    });

    const runShutdown = createShutdownController({
      server,
      timeoutMs: 10_000,
      stopBackgroundWork: stopPromotionExpirationLoop,
      closeRealtime: closeAllRealtimeClients,
      closeCache: () => sharedTtlCache.close(),
      disconnectDatabase: () => prisma.$disconnect(),
      flushTelemetry: flushApiSentry,
      exit: (code) => process.exit(code),
      onForced: () => logWarn(undefined, "Shutdown deadline exceeded; forcing connections closed"),
    });

    const shutdown = async (signal: string, exitCode = 0) => {
      logWarn(undefined, "Senal de apagado recibida", { signal });
      await runShutdown(exitCode);
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });

    process.on("uncaughtException", (error) => {
      captureApiException(error, undefined, { kind: "uncaughtException" });
      logError(undefined, error, "Uncaught exception");
      void shutdown("uncaughtException", 1);
    });

    process.on("unhandledRejection", (reason) => {
      captureApiException(reason, undefined, { kind: "unhandledRejection" });
      logError(undefined, reason instanceof Error ? reason : new Error(String(reason)), "Unhandled rejection");
      void shutdown("unhandledRejection", 1);
    });
  } catch (error) {
    captureApiException(error, undefined, { kind: "bootstrap" });
    logError(undefined, error, "Error al iniciar PROMY API");
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  }
};

void bootstrap();
