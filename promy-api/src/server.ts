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

    const shutdown = async (signal: string) => {
      logWarn(undefined, "Senal de apagado recibida", { signal });

      stopPromotionExpirationLoop();
      server.close(async () => {
        await prisma.$disconnect();
        logInfo(undefined, "Servidor detenido correctamente");
        process.exit(0);
      });
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
    });

    process.on("unhandledRejection", (reason) => {
      captureApiException(reason, undefined, { kind: "unhandledRejection" });
      logError(undefined, reason instanceof Error ? reason : new Error(String(reason)), "Unhandled rejection");
    });
  } catch (error) {
    captureApiException(error, undefined, { kind: "bootstrap" });
    logError(undefined, error, "Error al iniciar PROMY API");
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  }
};

void bootstrap();
