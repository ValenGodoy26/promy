import { validateReleaseArtifact, parseCsv, parseMysqlUrl, requireConfigured, requireSecurePublicUrl, isLocalHost, safeErrorMessage } from "./lib.mjs";
import { pathToFileURL } from "node:url";

function validateOrigins(env, errors) {
  const origins = parseCsv(env.CORS_ORIGIN);
  if (origins.length === 0 || origins.includes("*")) {
    errors.push("CORS_ORIGIN debe contener orígenes HTTPS explícitos y nunca '*'.");
    return;
  }
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.protocol !== "https:" || isLocalHost(url.hostname) || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
        errors.push("Cada CORS_ORIGIN debe ser un origen HTTPS sin path, query ni credenciales.");
        return;
      }
    } catch {
      errors.push("CORS_ORIGIN contiene una URL inválida.");
      return;
    }
  }
}

export function validateStagingConfiguration(env) {
  const errors = [];
  const warnings = [];
  if (env.APP_ENV !== "production" || env.NODE_ENV !== "production") errors.push("Staging usa semántica production: APP_ENV y NODE_ENV deben ser production.");
  if (!env.TRUST_PROXY || env.TRUST_PROXY.trim().toLowerCase() === "none") errors.push("TRUST_PROXY debe ser una lista explícita de IP/CIDR del proxy de staging.");
  if (/^(true|false|\d+|\*)$/i.test(env.TRUST_PROXY || "")) errors.push("TRUST_PROXY no admite booleanos, cantidad de saltos ni comodines.");
  parseMysqlUrl(env.DATABASE_URL, "DATABASE_URL", errors);
  const access = requireConfigured(env, "JWT_SECRET", errors, { secret: true });
  const refresh = requireConfigured(env, "JWT_REFRESH_SECRET", errors, { secret: true });
  if (access && access.length < 32) errors.push("JWT_SECRET debe tener al menos 32 caracteres.");
  if (refresh && refresh.length < 32) errors.push("JWT_REFRESH_SECRET debe tener al menos 32 caracteres.");
  if (access && refresh && access === refresh) errors.push("JWT_SECRET y JWT_REFRESH_SECRET deben ser independientes.");
  requireSecurePublicUrl(env, "PUBLIC_WEB_URL", errors);
  requireSecurePublicUrl(env, "PUBLIC_API_BASE_URL", errors);
  validateOrigins(env, errors);

  const registration = env.PUBLIC_REGISTRATION_ENABLED || "0";
  if (!/^[01]$/.test(registration)) errors.push("PUBLIC_REGISTRATION_ENABLED debe ser 0 o 1.");
  if (registration === "1") {
    const contact = requireConfigured(env, "PRIVACY_CONTACT_EMAIL", errors);
    if (contact && !/^\S+@\S+\.\S+$/.test(contact)) errors.push("PRIVACY_CONTACT_EMAIL debe ser un email válido.");
  }

  if (env.AUTH_EMAIL_PROVIDER !== "resend") errors.push("AUTH_EMAIL_PROVIDER debe ser resend en staging con semántica production.");
  requireConfigured(env, "AUTH_EMAIL_FROM", errors);
  requireConfigured(env, "RESEND_API_KEY", errors, { secret: true });

  const uploads = env.UPLOADS_DRIVER || "local";
  if (!["local", "s3"].includes(uploads)) errors.push("UPLOADS_DRIVER debe ser local o s3.");
  if (uploads === "s3") {
    for (const key of ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "UPLOADS_PUBLIC_BASE_URL"]) requireConfigured(env, key, errors, { secret: /KEY|SECRET/.test(key) });
    requireSecurePublicUrl(env, "S3_ENDPOINT", errors);
    requireSecurePublicUrl(env, "UPLOADS_PUBLIC_BASE_URL", errors);
  } else {
    warnings.push("UPLOADS_DRIVER=local exige volumen persistente, backup y acceso público controlado por la API.");
  }
  if (!env.REDIS_URL) warnings.push("Redis está deshabilitado: la API usará cache en memoria y no debe escalar a múltiples réplicas SSE.");
  if (!env.SENTRY_DSN) warnings.push("SENTRY_DSN no está configurado: no habrá alerta externa de excepciones.");
  if (!env.LOG_LEVEL) warnings.push("LOG_LEVEL no está definido; se aplicará el nivel por defecto del runtime.");
  return { errors, warnings };
}

export async function runStagingPreflight(env = process.env) {
  const { errors, warnings } = validateStagingConfiguration(env);
  let artifact = null;
  if (!env.STAGING_ARTIFACT_PATH || !env.STAGING_EXPECTED_SHA) {
    errors.push("STAGING_ARTIFACT_PATH y STAGING_EXPECTED_SHA son obligatorios para el preflight de deploy.");
  } else {
    try {
      artifact = await validateReleaseArtifact(env.STAGING_ARTIFACT_PATH, env.STAGING_EXPECTED_SHA);
    } catch (error) {
      errors.push(`Artifact inválido: ${safeErrorMessage(error)}`);
    }
  }
  return { ok: errors.length === 0, errors, warnings, artifact };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runStagingPreflight().then((result) => {
    console.log(JSON.stringify({ status: result.ok ? "PASS" : "FAIL", warnings: result.warnings, errors: result.errors, artifact: result.artifact }, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  }).catch((error) => {
    console.error(JSON.stringify({ status: "FAIL", errors: [safeErrorMessage(error)] }));
    process.exitCode = 1;
  });
}
