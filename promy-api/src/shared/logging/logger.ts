import pino, { DestinationStream, Logger, LoggerOptions } from "pino";
import type { Request } from "express";
import {
  sanitizeTelemetryError,
  sanitizeTelemetryValue,
} from "../observability/telemetrySanitizer";

type SerializableRecord = Record<string, unknown>;
type OperationalAuditLevel = "info" | "warn" | "error";

const DEFAULT_LOG_LEVEL =
  process.env.LOG_LEVEL?.trim().toLowerCase() ||
  (process.env.APP_ENV === "development" ? "debug" : "info");

export function sanitizeError(error: unknown) {
  if (error instanceof Error) {
    return sanitizeTelemetryError(error);
  }

  return sanitizeTelemetryValue(error);
}

const loggerOptions: LoggerOptions = {
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
  hooks: {
    logMethod(args, method) {
      return (method as (...input: unknown[]) => void).apply(
        this,
        args.map((argument) => sanitizeTelemetryValue(argument)),
      );
    },
  },
};

export function createAppLogger(destination?: DestinationStream) {
  return destination ? pino(loggerOptions, destination) : pino(loggerOptions);
}

export const logger = createAppLogger();

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

  targetLogger.warn(sanitizeTelemetryValue(context || {}), message);
}

export function logInfo(
  target: Request | Logger | undefined,
  message: string,
  context?: SerializableRecord,
) {
  const targetLogger = "info" in (target || {}) && typeof (target as Logger).info === "function"
    ? (target as Logger)
    : getRequestLogger(target as Request | undefined);

  targetLogger.info(sanitizeTelemetryValue(context || {}), message);
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

  const payload = sanitizeTelemetryValue({
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
