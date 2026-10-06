const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(?:1[6-9]|2\d|3[01])\./,
  /\.local$/i,
  /\.invalid$/i,
];

const REQUIRED_PUBLIC_FIELDS = [
  "VITE_LEGAL_RESPONSIBLE",
  "VITE_LEGAL_ADDRESS",
  "VITE_RETENTION_POLICY",
] as const;

function looksLikePlaceholder(value: string) {
  return /reemplazar|placeholder|example\.invalid|pendiente/i.test(value);
}

function isPrivateOrLocalHostname(hostname: string) {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function validateHttpsPublicUrl(name: string, value: string | undefined, errors: string[]) {
  const normalized = value?.trim();
  if (!normalized) {
    errors.push(`Falta ${name}.`);
    return;
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:") {
      errors.push(`${name} debe usar HTTPS en un release público.`);
    }
    if (isPrivateOrLocalHostname(url.hostname)) {
      errors.push(`${name} no puede apuntar a localhost, LAN, .local o dominios .invalid.`);
    }
  } catch {
    errors.push(`${name} no es una URL válida.`);
  }
}

function validateEmail(name: string, value: string | undefined, errors: string[]) {
  const normalized = value?.trim();
  if (!normalized) {
    errors.push(`Falta ${name}.`);
    return;
  }
  if (looksLikePlaceholder(normalized) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    errors.push(`${name} debe contener un email público real.`);
  }
}

export function validatePublicReleaseEnv(env: Record<string, string | undefined>) {
  const errors: string[] = [];

  validateHttpsPublicUrl("VITE_API_BASE_URL", env.VITE_API_BASE_URL, errors);
  validateHttpsPublicUrl("VITE_PANEL_BASE_URL", env.VITE_PANEL_BASE_URL, errors);

  for (const field of REQUIRED_PUBLIC_FIELDS) {
    const value = env[field]?.trim();
    if (!value || looksLikePlaceholder(value)) {
      errors.push(`Falta completar ${field} con el dato público definitivo.`);
    }
  }

  validateEmail("VITE_PRIVACY_EMAIL", env.VITE_PRIVACY_EMAIL, errors);
  validateEmail("VITE_SUPPORT_EMAIL", env.VITE_SUPPORT_EMAIL, errors);
  validateEmail("VITE_COMPLAINTS_EMAIL", env.VITE_COMPLAINTS_EMAIL, errors);

  if (env.VITE_LEGAL_REVIEWED?.trim().toLowerCase() !== "true") {
    errors.push("VITE_LEGAL_REVIEWED debe ser true después de la revisión jurídica final.");
  }

  return errors;
}
