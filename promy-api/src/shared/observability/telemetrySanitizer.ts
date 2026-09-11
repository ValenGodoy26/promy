type SerializableRecord = Record<string, unknown>;

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY =
  /(password|passcode|token|secret|authorization|cookie|api[-_]?key|session[-_]?id|validation[-_]?code)/i;
const BEARER_VALUE = /\bBearer\s+[^\s,;"']+/gi;
const JWT_VALUE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const PROMY_CODE = /\bPROMY-[A-Z0-9-]{4,}\b/gi;
const NAMED_SECRET =
  /\b(access[\s_-]*token|refresh[\s_-]*token|reset[\s_-]*(?:token|code)|verification[\s_-]*(?:token|code)|password|secret|authorization|cookie|api[\s_-]*key|validation[\s_-]*code)\b(\s*(?:=|:|is)?\s*)(["']?)([^\s,;"']+)\3/gi;
const URL_QUERY_SECRET =
  /([?&#](?:access_?token|refresh_?token|reset_?(?:token|code)|verification_?(?:token|code)|token|password|secret|api_?key|code)=)[^&#\s]+/gi;

function isPlainObject(value: unknown): value is SerializableRecord {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function sanitizeTelemetryString(value: string) {
  return value
    .replace(BEARER_VALUE, `Bearer ${REDACTED}`)
    .replace(JWT_VALUE, REDACTED)
    .replace(PROMY_CODE, REDACTED)
    .replace(URL_QUERY_SECRET, `$1${REDACTED}`)
    .replace(NAMED_SECRET, (_match, name: string, separator: string) =>
      `${name}${separator}${REDACTED}`,
    );
}

export function sanitizeTelemetryUrl(value: string | undefined | null) {
  if (!value) return value;

  try {
    const parsed = new URL(value, "http://promy.local");
    return parsed.pathname || "/";
  } catch {
    return sanitizeTelemetryString(value.split(/[?#]/, 1)[0] || "/");
  }
}

export function sanitizeTelemetryError(error: Error) {
  const sanitized: SerializableRecord = {
    name: error.name,
    message: sanitizeTelemetryString(error.message),
    stack: error.stack ? sanitizeTelemetryString(error.stack) : undefined,
  };

  for (const [key, value] of Object.entries(error)) {
    sanitized[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitizeTelemetryValue(value);
  }

  return sanitized;
}

export function sanitizeTelemetryValue(value: unknown): unknown {
  if (value instanceof Error) return sanitizeTelemetryError(value);
  if (typeof value === "string") return sanitizeTelemetryString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeTelemetryValue(item));

  if (isPlainObject(value)) {
    const sanitized: SerializableRecord = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) {
        sanitized[key] = REDACTED;
      } else if (/^(originalUrl|url)$/i.test(key) && typeof nestedValue === "string") {
        sanitized[key] = sanitizeTelemetryUrl(nestedValue);
      } else {
        sanitized[key] = sanitizeTelemetryValue(nestedValue);
      }
    }
    return sanitized;
  }

  return value;
}

export { REDACTED };
