import { z } from "zod";
import { logger } from "../shared/logging/logger";

const weakJwtSecretValues = new Set([
  "promy_jwt_secret_dev",
  "promy_refresh_secret_dev",
  "change-me",
  "changeme",
  "dev-secret",
  "development-secret",
  "secret",
]);

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function isWeakJwtSecret(secret: string) {
  const normalized = secret.trim().toLowerCase();

  return (
    normalized.length < 32 ||
    weakJwtSecretValues.has(normalized) ||
    normalized.includes("dev") ||
    normalized.includes("example") ||
    normalized.includes("test") ||
    normalized.includes("demo")
  );
}

function canUseWeakSecrets(appEnv: "development" | "test" | "production", allowWeakSecrets?: string) {
  return appEnv === "development" && allowWeakSecrets === "1";
}

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(4000),
    APP_ENV: z.enum(["development", "test", "production"]).default("development"),
    CORS_ORIGIN: z.string().default("*"),
    PUBLIC_WEB_URL: z
      .string()
      .trim()
      .url("PUBLIC_WEB_URL debe ser una URL valida")
      .optional(),
    PUBLIC_API_BASE_URL: z
      .string()
      .trim()
      .url("PUBLIC_API_BASE_URL debe ser una URL valida")
      .optional(),
    PROMOTION_TIMEZONE: z.string().trim().min(1).default("America/Argentina/Buenos_Aires"),
    SENTRY_DSN: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().url("SENTRY_DSN debe ser una URL valida").optional(),
    ),
    SENTRY_ENVIRONMENT: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).optional(),
    ),
    SENTRY_RELEASE: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).optional(),
    ),
    SENTRY_TRACES_SAMPLE_RATE: z.string().trim().optional(),
    REDIS_URL: z
      .string()
      .trim()
      .url("REDIS_URL debe ser una URL valida")
      .optional(),
    REDIS_KEY_PREFIX: z.string().trim().min(1).default("promy:cache:"),
    UPLOADS_DRIVER: z.enum(["local", "s3"]).default("local"),
    UPLOADS_PUBLIC_BASE_URL: z
      .string()
      .trim()
      .url("UPLOADS_PUBLIC_BASE_URL debe ser una URL valida")
      .optional(),
    S3_ENDPOINT: z
      .string()
      .trim()
      .url("S3_ENDPOINT debe ser una URL valida")
      .optional(),
    S3_REGION: z.string().trim().min(1).default("auto"),
    S3_BUCKET: z.string().trim().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
    ALLOW_WEAK_SECRETS: z.enum(["0", "1"]).optional(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, "JWT_REFRESH_SECRET debe tener al menos 32 caracteres"),
    REFRESH_COOKIE_NAME: z.string().min(1).default("promy_refresh_token"),
    JWT_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
    EXPO_ACCESS_TOKEN: z.string().optional(),
    EXPO_PUSH_API_URL: z
      .string()
      .url("EXPO_PUSH_API_URL debe ser una URL valida")
      .default("https://exp.host/--/api/v2/push/send"),
    AUTH_EMAIL_PROVIDER: z.enum(["console", "test", "resend"]).default("console"),
    AUTH_EMAIL_FROM: z.string().trim().min(3).optional(),
    AUTH_EMAIL_REPLY_TO: z
      .string()
      .trim()
      .email("AUTH_EMAIL_REPLY_TO debe ser un email valido")
      .optional(),
    RESEND_API_KEY: z.string().trim().min(1).optional(),
    REDEMPTION_CODE_TTL_MINUTES: z.coerce.number().int().min(1).max(180).default(20),
    REDEMPTION_MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
    REDEMPTION_VALIDATION_BLOCK_MINUTES: z.coerce.number().int().min(1).max(24 * 60).default(60),
    DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  })
  .superRefine((env, ctx) => {
    const production = env.APP_ENV === "production";
    const weakSecretsAllowed = canUseWeakSecrets(env.APP_ENV, env.ALLOW_WEAK_SECRETS);
    const explicitOrigins = env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!weakSecretsAllowed) {
      if (isWeakJwtSecret(env.JWT_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message:
            "JWT_SECRET es demasiado debil. Usa un secreto aleatorio de al menos 32 caracteres. Solo puedes permitir secretos debiles en development con ALLOW_WEAK_SECRETS=1.",
        });
      }

      if (isWeakJwtSecret(env.JWT_REFRESH_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_REFRESH_SECRET"],
          message:
            "JWT_REFRESH_SECRET es demasiado debil. Usa un secreto aleatorio de al menos 32 caracteres. Solo puedes permitir secretos debiles en development con ALLOW_WEAK_SECRETS=1.",
        });
      }
    }

    if (production) {
      if (!env.PUBLIC_WEB_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PUBLIC_WEB_URL"],
          message:
            "PUBLIC_WEB_URL es obligatoria en produccion para construir enlaces de verificacion y recuperacion.",
        });
      }

      if (!env.PUBLIC_API_BASE_URL && env.UPLOADS_DRIVER === "local") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PUBLIC_API_BASE_URL"],
          message:
            "PUBLIC_API_BASE_URL es obligatoria en produccion si UPLOADS_DRIVER=local para construir URLs publicas de imagenes.",
        });
      }

      if (explicitOrigins.length === 0 || explicitOrigins.includes("*")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ORIGIN"],
          message:
            "CORS_ORIGIN debe listar dominios explicitos en produccion. No uses '*'.",
        });
      }

      if (env.AUTH_EMAIL_PROVIDER !== "resend") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["AUTH_EMAIL_PROVIDER"],
          message:
            "AUTH_EMAIL_PROVIDER debe ser 'resend' en produccion para enviar emails reales.",
        });
      }

      if (!env.AUTH_EMAIL_FROM) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["AUTH_EMAIL_FROM"],
          message: "AUTH_EMAIL_FROM es obligatoria en produccion.",
        });
      }

      if (!env.RESEND_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY es obligatoria en produccion.",
        });
      }

      if (env.UPLOADS_DRIVER === "s3" && !env.UPLOADS_PUBLIC_BASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["UPLOADS_PUBLIC_BASE_URL"],
          message:
            "UPLOADS_PUBLIC_BASE_URL es obligatoria en produccion si UPLOADS_DRIVER=s3.",
        });
      }
    }

    if (env.AUTH_EMAIL_PROVIDER === "test" && env.APP_ENV !== "test") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_EMAIL_PROVIDER"],
        message: "AUTH_EMAIL_PROVIDER='test' solo puede utilizarse con APP_ENV=test.",
      });
    }

    if (env.UPLOADS_DRIVER === "s3") {
      const requiredS3Variables = [
        ["S3_ENDPOINT", env.S3_ENDPOINT],
        ["S3_BUCKET", env.S3_BUCKET],
        ["S3_ACCESS_KEY_ID", env.S3_ACCESS_KEY_ID],
        ["S3_SECRET_ACCESS_KEY", env.S3_SECRET_ACCESS_KEY],
        ["UPLOADS_PUBLIC_BASE_URL", env.UPLOADS_PUBLIC_BASE_URL],
      ] as const;

      for (const [name, value] of requiredS3Variables) {
        if (!value) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [name],
            message: `${name} es obligatoria cuando UPLOADS_DRIVER=s3.`,
          });
        }
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  logger.error(
    {
      errors: parsedEnv.error.flatten().fieldErrors,
    },
    "Variables de entorno invalidas",
  );
  throw new Error("Configuracion invalida en .env");
}

export const env = parsedEnv.data;
export const isProduction = env.APP_ENV === "production";
export const isDevelopment = env.APP_ENV === "development";
export const isTest = env.APP_ENV === "test";

export const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
