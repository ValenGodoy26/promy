import type { Request } from "express";
import * as Sentry from "@sentry/node";
import { env } from "../../config/env";

const sentryDsn = env.SENTRY_DSN?.trim();
const sentryEnabled = Boolean(sentryDsn);
let sentryInitialized = false;

function toSampleRate(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
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
      scope.setTag("http.path", req.originalUrl || req.url);
      scope.setContext("request", {
        method: req.method,
        path: req.originalUrl || req.url,
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
      scope.setContext("extra", extras);
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }

    Sentry.captureException(new Error(typeof error === "string" ? error : "Unknown API error"));
  });
}

export function isApiSentryEnabled() {
  return sentryEnabled;
}
