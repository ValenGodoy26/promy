import * as Sentry from "@sentry/react-native";
import type { AuthUser } from "../types/api";
import { sanitizeSentryEvent, sanitizeSentryValue } from "./sentrySanitizer";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const sentryEnabled = Boolean(sentryDsn);
let sentryInitialized = false;

function toSampleRate(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function initMobileSentry() {
  if (sentryInitialized) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    enabled: sentryEnabled,
    environment:
      process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || (__DEV__ ? "development" : "production"),
    release: process.env.EXPO_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: toSampleRate(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE),
    beforeSend: sanitizeSentryEvent,
  });

  sentryInitialized = true;
}

export function setMobileSentryUserContext(user?: AuthUser | null) {
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

export function setMobileSentryRouteContext(routeName?: string, routeParams?: unknown) {
  if (!sentryEnabled || !routeName) {
    return;
  }

  Sentry.setTag("route.name", routeName);
  Sentry.setContext("route", {
    name: routeName,
    params:
      routeParams && typeof routeParams === "object"
        ? sanitizeSentryValue(routeParams)
        : undefined,
  });
}

export { Sentry };
