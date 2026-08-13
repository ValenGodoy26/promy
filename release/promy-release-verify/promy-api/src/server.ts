import "dotenv/config";
import app from "./app";
import prisma from "./config/prisma";
import { env } from "./config/env";
import {
  startPromotionExpirationLoop,
  stopPromotionExpirationLoop,
} from "./shared/utils/promotionExpiration";

const bootstrap = async () => {
  try {
    await prisma.$connect();
    startPromotionExpirationLoop();

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 PROMY API corriendo en http://localhost:${env.PORT}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n⚠️ Señal ${signal} recibida. Cerrando servidor...`);

      stopPromotionExpirationLoop();
      server.close(async () => {
        await prisma.$disconnect();
        console.log("✅ Servidor detenido correctamente.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    console.error("❌ Error al iniciar PROMY API:", error);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  }
};

void bootstrap();
