import * as Sentry from "@sentry/react";
import type { AuthUser } from "../types/api";
import { sanitizeSentryEvent } from "./sentrySanitizer";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();
const sentryEnabled = Boolean(sentryDsn);
let sentryInitialized = false;

function toSampleRate(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function initWebSentry() {
  if (sentryInitialized) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    enabled: sentryEnabled,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    tracesSampleRate: toSampleRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE),
    beforeSend: sanitizeSentryEvent,
  });

  sentryInitialized = true;
}

export function setWebSentryUserContext(user?: AuthUser | null) {
  if (!sentryEnabled) {
    return;
  }

  if (!user) {
    Sentry.setUser(null);
    Sentry.setTag("user.role", "anonymous");
    Sentry.setContext("auth", {
      authenticated: false,
    });
    return;
  }

  Sentry.setUser({
    id: String(user.id),
  });
  Sentry.setTag("user.role", user.role);
  Sentry.setContext("auth", {
    authenticated: true,
    role: user.role,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
  });
}

export function setWebSentryRouteContext(pathname: string) {
  if (!sentryEnabled) {
    return;
  }

  Sentry.setTag("route.path", pathname);
  Sentry.setContext("route", {
    pathname,
  });
}

export { Sentry };
