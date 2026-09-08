const FILTERED = "[Filtered]";
const SENSITIVE_KEY = /(^|[-_.])(authorization|cookie|set-cookie|password|passcode|access[-_]?token|refresh[-_]?token|reset[-_]?token|verification[-_]?token|token|secret|code)($|[-_.])/i;
const URL_KEY = /(url|uri|href|location|route|link)$/i;

export function stripUrlSecrets(value: string) {
  const cutAt = [value.indexOf("?"), value.indexOf("#")]
    .filter((index) => index >= 0)
    .reduce((lowest, index) => Math.min(lowest, index), value.length);
  const clean = value.slice(0, cutAt);

  try {
    const parsed = new URL(clean);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return `/${parsed.host}${parsed.pathname}`;
    }
    return parsed.pathname || "/";
  } catch {
    return clean;
  }
}

export function sanitizeSentryValue(value: unknown, key = "", seen = new WeakSet<object>()): unknown {
  if (SENSITIVE_KEY.test(key)) return FILTERED;
  if (typeof value === "string") return URL_KEY.test(key) ? stripUrlSecrets(value) : value;
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return FILTERED;

  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSentryValue(item, key, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeSentryValue(entryValue, entryKey, seen),
    ]),
  );
}

export function sanitizeSentryEvent<T>(event: T): T {
  return sanitizeSentryValue(event) as T;
}
