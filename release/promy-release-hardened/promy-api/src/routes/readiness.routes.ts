import { Router } from "express";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { logError } from "../shared/logging/logger";

const router = Router();

function collectCriticalConfig() {
  const checks = {
    databaseUrl: Boolean(env.DATABASE_URL),
    jwtSecret: Boolean(env.JWT_SECRET),
    jwtRefreshSecret: Boolean(env.JWT_REFRESH_SECRET),
    publicWebUrl: Boolean(env.PUBLIC_WEB_URL),
    corsOriginsConfigured: env.CORS_ORIGIN.split(",").some((origin) => origin.trim().length > 0),
    authEmailFrom: env.AUTH_EMAIL_PROVIDER === "console" ? true : Boolean(env.AUTH_EMAIL_FROM),
    resendApiKey: env.AUTH_EMAIL_PROVIDER === "resend" ? Boolean(env.RESEND_API_KEY) : true,
    uploadsConfig:
      env.UPLOADS_DRIVER === "local"
        ? true
        : Boolean(
            env.S3_ENDPOINT &&
              env.S3_BUCKET &&
              env.S3_ACCESS_KEY_ID &&
              env.S3_SECRET_ACCESS_KEY &&
              env.UPLOADS_PUBLIC_BASE_URL,
          ),
  };

  return {
    checks,
    ok: Object.values(checks).every(Boolean),
  };
}

router.get("/", async (req, res) => {
  const config = collectCriticalConfig();

  try {
    await prisma.$queryRaw`SELECT 1`;

    if (!config.ok) {
      return res.status(503).json({
        ok: false,
        message: "Readiness incompleta por configuracion critica faltante",
        requestId: req.requestId,
        services: {
          database: "ok",
          config: "degraded",
        },
        config: config.checks,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Ready",
      requestId: req.requestId,
      services: {
        database: "ok",
        config: "ok",
      },
      config: config.checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError(req, error, "Readiness DB error", {
      requestId: req.requestId,
      config: config.checks,
    });

    return res.status(503).json({
      ok: false,
      message: "Readiness failed",
      requestId: req.requestId,
      services: {
        database: "down",
        config: config.ok ? "ok" : "degraded",
      },
      config: config.checks,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
