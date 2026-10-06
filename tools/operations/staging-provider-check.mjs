import { validateStagingConfiguration } from "./staging-preflight.mjs";
import { pathToFileURL } from "node:url";

export function buildProviderCheckPlan(env = process.env) {
  const { errors, warnings } = validateStagingConfiguration(env);
  const checks = [
    { provider: "mysql", enabled: Boolean(env.DATABASE_URL), liveProbe: "SELECT 1 con credencial de staging de sólo operación" },
    { provider: "redis", enabled: Boolean(env.REDIS_URL), liveProbe: "PING con deadline acotado; degradación a memoria si falla" },
    { provider: "resend", enabled: env.AUTH_EMAIL_PROVIDER === "resend", liveProbe: "entrega a buzón QA y verificación del enlace" },
    { provider: "storage", enabled: env.UPLOADS_DRIVER === "s3", liveProbe: "upload, lectura pública, replace, delete y uploads:audit con fixture QA" },
    { provider: "sentry", enabled: Boolean(env.SENTRY_DSN), liveProbe: "evento sintético sanitizado y recepción por canal de alerta" },
  ];
  return { ok: errors.length === 0, errors, warnings, checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = buildProviderCheckPlan();
  console.log(JSON.stringify({ status: result.ok ? "PASS" : "FAIL", mode: "dry-run", ...result }, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
