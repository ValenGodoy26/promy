import pino, { Logger } from "pino";
import type { Request } from "express";

type SerializableRecord = Record<string, unknown>;
type OperationalAuditLevel = "info" | "warn" | "error";

const DEFAULT_LOG_LEVEL =
  process.env.LOG_LEVEL?.trim().toLowerCase() ||
  (process.env.APP_ENV === "development" ? "debug" : "info");

function isPlainObject(value: unknown): value is SerializableRecord {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (isPlainObject(value)) {
    const next: SerializableRecord = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey.includes("password") ||
        normalizedKey.includes("token") ||
        normalizedKey.includes("secret") ||
        normalizedKey.includes("authorization") ||
        normalizedKey.includes("cookie")
      ) {
        next[key] = "[REDACTED]";
        continue;
      }

      next[key] = sanitizeValue(nestedValue);
    }

    return next;
  }

  return value;
}

export function sanitizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (isPlainObject(error)) {
    return sanitizeValue(error);
  }

  return error;
}

export const logger = pino({
  level: DEFAULT_LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.refreshToken",
      "req.body.token",
      "password",
      "passwordHash",
      "refreshToken",
      "accessToken",
      "token",
      "secret",
      "authorization",
      "cookie",
    ],
    censor: "[REDACTED]",
  },
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function getRequestLogger(request?: Request) {
  return request?.log || logger;
}

export function logError(
  target: Request | Logger | undefined,
  error: unknown,
  message: string,
  context?: SerializableRecord,
) {
  const targetLogger = "error" in (target || {}) && typeof (target as Logger).error === "function"
    ? (target as Logger)
    : getRequestLogger(target as Request | undefined);

  targetLogger.error(
    {
      ...(context || {}),
      err: sanitizeError(error),
    },
    message,
  );
}

export function logWarn(
  target: Request | Logger | undefined,
  message: string,
  context?: SerializableRecord,
) {
  const targetLogger = "warn" in (target || {}) && typeof (target as Logger).warn === "function"
    ? (target as Logger)
    : getRequestLogger(target as Request | undefined);

  targetLogger.warn(sanitizeValue(context || {}), message);
}

export function logInfo(
  target: Request | Logger | undefined,
  message: string,
  context?: SerializableRecord,
) {
  const targetLogger = "info" in (target || {}) && typeof (target as Logger).info === "function"
    ? (target as Logger)
    : getRequestLogger(target as Request | undefined);

  targetLogger.info(sanitizeValue(context || {}), message);
}

export function logOperationalEvent(
  target: Request | Logger | undefined,
  event: string,
  context?: SerializableRecord,
  level: OperationalAuditLevel = "info",
) {
  const targetLogger = "info" in (target || {}) && typeof (target as Logger).info === "function"
    ? (target as Logger)
    : getRequestLogger(target as Request | undefined);

  const payload = sanitizeValue({
    event,
    category: "operational-audit",
    ...(context || {}),
  });

  if (level === "error") {
    targetLogger.error(payload, event);
    return;
  }

  if (level === "warn") {
    targetLogger.warn(payload, event);
    return;
  }

  targetLogger.info(payload, event);
}
