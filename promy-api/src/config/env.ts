import { z } from "zod";
import { logger } from "../shared/logging/logger";
import { parseTrustProxy } from "./proxy";

const weakJwtSecretValues = new Set([
  "promy_jwt_secret_dev",
  "promy_refresh_secret_dev",
  "change-me",
  "changeme",
  "dev-secret",
  "development-secret",
  "secret",
  "promy-local-jwt-s3cret-9f84k2m1q7r6x5a4",
  "promy-local-refresh-s3cret-8d73j1n2p4q6w9",
]);

const obviousPlaceholder =
  /(change[-_ ]?me|replace[-_ ]?me|placeholder|example|sample|demo|development|testing|test[-_ ]|local[-_ ]|your[-_ ]|x{4,})/i;

function emptyStringToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function isWeakJwtSecret(secret: string) {
  const normalized = secret.trim().toLowerCase();

  return (
    normalized.length < 32 ||
    weakJwtSecretValues.has(normalized) ||
    obviousPlaceholder.test(normalized) ||
    new Set(secret).size < 10
  );
}

function isWeakProviderSecret(secret: string) {
  return secret.trim().length < 16 || obviousPlaceholder.test(secret);
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isSecurePublicUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !isLocalHostname(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isSecureCorsOrigin(value: string) {
  if (!isSecurePublicUrl(value)) return false;
  const url = new URL(value);
  return (url.pathname === "/" || url.pathname === "") && !url.search && !url.hash;
}

function isProductionDatabaseUrl(value: string) {
  try {
    const url = new URL(value);
    const databaseName = url.pathname.replace(/^\//, "");
    return (
      url.protocol === "mysql:" &&
      Boolean(url.hostname && url.username && url.password && databaseName) &&
      !obviousPlaceholder.test(`${url.username}:${url.password}/${databaseName}`)
    );
  } catch {
    return false;
  }
}

function canUseWeakSecrets(appEnv: "development" | "test" | "production", allowWeakSecrets?: string) {
  return appEnv === "development" && allowWeakSecrets === "1";
}

export const envSchema = z
  .object({
    NODE_ENV: z.preprocess(
      emptyStringToUndefined,
      z.enum(["development", "test", "production"]).optional(),
    ),
    PORT: z.coerce.number().int().positive().default(4000),
    APP_ENV: z.preprocess(
      emptyStringToUndefined,
      z.enum(["development", "test", "production"]).optional(),
    ),
    TRUST_PROXY: z.string().trim().min(1).default("none"),
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
    const appEnv = env.APP_ENV || "development";
    const production = appEnv === "production";
    const weakSecretsAllowed = canUseWeakSecrets(appEnv, env.ALLOW_WEAK_SECRETS);
    const explicitOrigins = env.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!env.APP_ENV && (env.NODE_ENV === "production" || env.NODE_ENV === "test")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APP_ENV"],
        message: `APP_ENV es obligatoria cuando NODE_ENV=${env.NODE_ENV}.`,
      });
    }

    if (env.APP_ENV && env.NODE_ENV && env.APP_ENV !== env.NODE_ENV) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APP_ENV"],
        message: "APP_ENV y NODE_ENV deben coincidir cuando ambos estan definidos.",
      });
    }

    if (env.ALLOW_WEAK_SECRETS === "1" && appEnv !== "development") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ALLOW_WEAK_SECRETS"],
        message: "ALLOW_WEAK_SECRETS=1 solo puede utilizarse en development.",
      });
    }

    try {
      parseTrustProxy(env.TRUST_PROXY);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TRUST_PROXY"],
        message: error instanceof Error ? error.message : "TRUST_PROXY invalido.",
      });
    }

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
      if (!isProductionDatabaseUrl(env.DATABASE_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["DATABASE_URL"],
          message:
            "DATABASE_URL debe ser una URL MySQL completa, con usuario, password, host y base sin placeholders en produccion.",
        });
      }

      if (!env.PUBLIC_WEB_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PUBLIC_WEB_URL"],
          message:
            "PUBLIC_WEB_URL es obligatoria en produccion para construir enlaces de verificacion y recuperacion.",
        });
      }

      if (env.PUBLIC_WEB_URL && !isSecurePublicUrl(env.PUBLIC_WEB_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PUBLIC_WEB_URL"],
          message: "PUBLIC_WEB_URL debe usar HTTPS y un host no local en produccion.",
        });
      }

      if (env.PUBLIC_API_BASE_URL && !isSecurePublicUrl(env.PUBLIC_API_BASE_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PUBLIC_API_BASE_URL"],
          message: "PUBLIC_API_BASE_URL debe usar HTTPS y un host no local en produccion.",
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

      for (const origin of explicitOrigins) {
        if (!isSecureCorsOrigin(origin)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["CORS_ORIGIN"],
            message: "Cada CORS_ORIGIN debe ser un origen HTTPS no local en produccion.",
          });
          break;
        }
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

      if (env.RESEND_API_KEY && isWeakProviderSecret(env.RESEND_API_KEY)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY parece un placeholder o es demasiado corta para produccion.",
        });
      }

      if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_REFRESH_SECRET"],
          message: "JWT_REFRESH_SECRET debe ser independiente de JWT_SECRET en produccion.",
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

      if (env.UPLOADS_PUBLIC_BASE_URL && !isSecurePublicUrl(env.UPLOADS_PUBLIC_BASE_URL)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["UPLOADS_PUBLIC_BASE_URL"],
          message: "UPLOADS_PUBLIC_BASE_URL debe usar HTTPS y un host no local en produccion.",
        });
      }

      if (env.S3_ENDPOINT && !isSecurePublicUrl(env.S3_ENDPOINT)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["S3_ENDPOINT"],
          message: "S3_ENDPOINT debe usar HTTPS y un host no local en produccion.",
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

      if (production && env.S3_ACCESS_KEY_ID && isWeakProviderSecret(env.S3_ACCESS_KEY_ID)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["S3_ACCESS_KEY_ID"],
          message: "S3_ACCESS_KEY_ID parece un placeholder o es demasiado corto para produccion.",
        });
      }

      if (production && env.S3_SECRET_ACCESS_KEY && isWeakProviderSecret(env.S3_SECRET_ACCESS_KEY)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["S3_SECRET_ACCESS_KEY"],
          message: "S3_SECRET_ACCESS_KEY parece un placeholder o es demasiado corto para produccion.",
        });
      }
    }
  })
  .transform((env) => ({
    ...env,
    APP_ENV: env.APP_ENV || ("development" as const),
  }));

export function validateEnvironment(source: NodeJS.ProcessEnv) {
  return envSchema.safeParse(source);
}

const parsedEnv = validateEnvironment(process.env);

if (!parsedEnv.success) {
  const configurationErrors = Object.entries(parsedEnv.error.flatten().fieldErrors).flatMap(
    ([field, messages]) => (messages || []).map((message) => ({ field, message })),
  );
  logger.error(
    {
      configurationErrors,
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
