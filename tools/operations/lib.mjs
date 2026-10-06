import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const REQUIRED_RELEASE_PROJECTS = ["promy-api", "promy-web", "promy-landing", "promy-mobile"];

const PLACEHOLDER_PATTERN = /(^\s*$|^\s*<[^>]+>\s*$|change[-_ ]?me|replace[-_ ]?me|placeholder|example|sample|demo|development|testing|test[-_ ]|local[-_ ]|your[-_ ]|x{4,})/i;

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function parseCsv(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function isPlaceholder(value) {
  return PLACEHOLDER_PATTERN.test(String(value || ""));
}

export function requireConfigured(env, name, errors, { secret = false } = {}) {
  const value = env[name];
  if (!value || isPlaceholder(value)) {
    errors.push(`${name} es obligatoria y no puede ser un placeholder${secret ? " ni un secreto de ejemplo" : ""}.`);
    return undefined;
  }
  return value;
}

export function parseUrl(value, name, errors) {
  try {
    return new URL(value);
  } catch {
    errors.push(`${name} debe ser una URL valida.`);
    return null;
  }
}

export function isLocalHost(hostname) {
  const normalized = hostname.trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized.endsWith(".localhost");
}

export function requireSecurePublicUrl(env, name, errors) {
  const value = requireConfigured(env, name, errors);
  if (!value) return null;
  const url = parseUrl(value, name, errors);
  if (!url) return null;
  if (url.protocol !== "https:" || isLocalHost(url.hostname) || url.username || url.password) {
    errors.push(`${name} debe usar HTTPS, host no local y no incluir credenciales.`);
  }
  return url;
}

export function parseMysqlUrl(rawValue, name, errors) {
  const value = requireConfigured({ [name]: rawValue }, name, errors, { secret: true });
  if (!value) return null;
  const url = parseUrl(value, name, errors);
  if (!url) return null;
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim();
  if (url.protocol !== "mysql:" || !url.hostname || !url.username || !database) {
    errors.push(`${name} debe ser mysql:// con host, usuario y base.`);
    return null;
  }
  return { host: url.hostname, port: url.port || "3306", username: decodeURIComponent(url.username), database };
}

export function redactDatabaseTarget(target) {
  return target ? { host: target.host, port: target.port, database: target.database } : null;
}

export function assertAllowedStagingUrls(env, { requireWeb = true } = {}) {
  const errors = [];
  const allowedHosts = new Set(parseCsv(env.STAGING_ALLOWED_HOSTS).map((host) => host.toLowerCase()));
  if (allowedHosts.size === 0) errors.push("STAGING_ALLOWED_HOSTS debe declarar explícitamente los hosts remotos autorizados.");
  const names = requireWeb ? ["STAGING_API_URL", "STAGING_WEB_URL"] : ["STAGING_API_URL"];
  const urls = {};
  for (const name of names) {
    const url = requireSecurePublicUrl(env, name, errors);
    if (url) {
      urls[name] = url;
      if (allowedHosts.size > 0 && !allowedHosts.has(url.hostname.toLowerCase())) errors.push(`${name} no coincide con STAGING_ALLOWED_HOSTS.`);
    }
  }
  assert(errors.length === 0, errors.join(" "));
  return urls;
}

export function assertIsolatedRestoreTarget(rawUrl) {
  const errors = [];
  const target = parseMysqlUrl(rawUrl, "RESTORE_TARGET_DATABASE_URL", errors);
  assert(errors.length === 0, errors.join(" "));
  const normalized = target.database.toLowerCase();
  const isolated = /(^|[_-])(restore|recovery|isolated|test|tests|qa)([_-]|$)/.test(normalized);
  const forbidden = /(^|[_-])(prod|production|staging|stage|dev|development)([_-]|$)/.test(normalized) || new Set(["promy", "promy_db"]).has(normalized);
  assert(isolated && !forbidden, "El restore sólo acepta una DB aislada con nombre restore/recovery/isolated/test/qa y nunca staging/production.");
  return target;
}

export async function sha256File(filePath) {
  return createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

export async function validateReleaseArtifact(bundlePath, expectedSha) {
  assert(expectedSha && /^[0-9a-f]{40}$/i.test(expectedSha), "STAGING_EXPECTED_SHA debe ser un SHA Git de 40 caracteres.");
  const absoluteBundle = path.resolve(bundlePath || "");
  const manifest = JSON.parse(await fs.readFile(path.join(absoluteBundle, "release-manifest.json"), "utf8"));
  const checksumsPath = path.join(absoluteBundle, "SHA256SUMS.txt");
  assert(manifest.commitSha === expectedSha, "El SHA del manifest no coincide con el SHA esperado.");
  assert(JSON.stringify([...(manifest.projects || [])].sort()) === JSON.stringify([...REQUIRED_RELEASE_PROJECTS].sort()), "El manifest no declara exactamente los cuatro proyectos PROMY.");
  assert(Array.isArray(manifest.artifacts) && manifest.artifacts.length === REQUIRED_RELEASE_PROJECTS.length, "El manifest no declara los cuatro artifacts requeridos.");
  const expectedLines = [];
  for (const project of REQUIRED_RELEASE_PROJECTS) {
    const file = `${project}.zip`;
    const artifact = manifest.artifacts.find((item) => item.file === file);
    assert(artifact, `Falta ${file} en el manifest.`);
    const actualHash = await sha256File(path.join(absoluteBundle, file));
    assert(actualHash === artifact.sha256, `Checksum inválido: ${file}.`);
    expectedLines.push(`${actualHash}  ${file}`);
  }
  const actualLines = (await fs.readFile(checksumsPath, "utf8")).split(/\r?\n/).filter(Boolean).sort();
  assert(JSON.stringify(actualLines) === JSON.stringify(expectedLines.sort()), "SHA256SUMS.txt no coincide con el manifest.");
  return { bundlePath: absoluteBundle, commitSha: manifest.commitSha, artifacts: REQUIRED_RELEASE_PROJECTS.map((project) => `${project}.zip`) };
}

export function safeErrorMessage(error) {
  return error instanceof Error ? error.message.replace(/mysql:\/\/[^\s]+/gi, "mysql://[REDACTED]") : "Error desconocido";
}
