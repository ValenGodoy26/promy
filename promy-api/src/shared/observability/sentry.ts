import type { Request } from "express";
import * as Sentry from "@sentry/node";
import { env } from "../../config/env";
import { sanitizeTelemetryError, sanitizeTelemetryValue } from "./telemetrySanitizer";

const sentryDsn = env.SENTRY_DSN?.trim();
const sentryEnabled = Boolean(sentryDsn);
let sentryInitialized = false;

function toSampleRate(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function sanitizeSentryEvent<T>(event: T): T {
  return sanitizeTelemetryValue(event) as T;
}

export function initApiSentry() {
  if (!sentryEnabled || sentryInitialized) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    enabled: sentryEnabled,
    environment: env.SENTRY_ENVIRONMENT || env.APP_ENV,
    release: env.SENTRY_RELEASE || undefined,
    tracesSampleRate: toSampleRate(env.SENTRY_TRACES_SAMPLE_RATE),
    beforeSend: sanitizeSentryEvent,
  });

  sentryInitialized = true;
}

export function captureApiException(
  error: unknown,
  req?: Request,
  extras?: Record<string, unknown>,
) {
  if (!sentryEnabled) {
    return;
  }

  Sentry.withScope((scope) => {
    if (req?.requestId) {
      scope.setTag("request_id", req.requestId);
    }

    if (req) {
      scope.setTag("http.method", req.method);
      scope.setTag("http.path", req.path);
      scope.setContext("request", {
        method: req.method,
        path: req.path,
        requestId: req.requestId,
        ip: req.ip,
      });
    }

    if (req?.user) {
      scope.setUser({
        id: String(req.user.userId),
      });
      scope.setTag("user.role", req.user.role);
      scope.setContext("auth", {
        userId: req.user.userId,
        role: req.user.role,
        sessionId: req.user.sessionId,
        sessionVersion: req.user.sessionVersion,
      });
    } else {
      scope.setTag("user.role", "anonymous");
    }

    if (extras) {
      scope.setContext("extra", sanitizeTelemetryValue(extras) as Record<string, unknown>);
    }

    if (error instanceof Error) {
      const sanitizedError = sanitizeTelemetryError(error);
      const safeError = new Error(String(sanitizedError.message || "API error"));
      safeError.name = String(sanitizedError.name || error.name);
      safeError.stack = typeof sanitizedError.stack === "string" ? sanitizedError.stack : undefined;
      Sentry.captureException(safeError);
      return;
    }

    const safeValue = sanitizeTelemetryValue(error);
    Sentry.captureException(new Error(typeof safeValue === "string" ? safeValue : "Unknown API error"));
  });
}

export function isApiSentryEnabled() {
  return sentryEnabled;
}

export async function flushApiSentry(timeoutMs: number) {
  if (!sentryEnabled || !sentryInitialized) return true;
  return Sentry.flush(timeoutMs);
}
