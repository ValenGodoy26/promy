const API_PROTOCOL = process.env.EXPO_PUBLIC_API_PROTOCOL?.trim() || "http";
const API_PORT = Number(process.env.EXPO_PUBLIC_API_PORT || 4000);

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

function buildApiUrl(host: string) {
  return normalizeBaseUrl(`${API_PROTOCOL}://${host}:${API_PORT}/api`);
}

function appendCandidate(targets: string[], next?: string | null) {
  if (!next) return;

  const normalized = normalizeBaseUrl(next);
  if (!targets.includes(normalized)) {
    targets.push(normalized);
  }
}

function getEnvList(name: string) {
  return (process.env[name]?.trim() || "")
    .split(",")
    .map((value: string) => value.trim())
    .filter(Boolean);
}

export function getApiBaseUrls() {
  const targets: string[] = [];
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  const fromEnvList = getEnvList("EXPO_PUBLIC_API_URLS");
  const envHosts = getEnvList("EXPO_PUBLIC_API_HOSTS");
  const envHost = process.env.EXPO_PUBLIC_API_HOST?.trim();

  appendCandidate(targets, fromEnv);
  fromEnvList.forEach((candidate: string) => appendCandidate(targets, candidate));

  if (envHost) {
    appendCandidate(targets, buildApiUrl(envHost));
  }

  envHosts.forEach((host: string) => appendCandidate(targets, buildApiUrl(host)));

  return targets;
}

export function getPrimaryApiBaseUrl() {
  const [primary] = getApiBaseUrls();

  if (!primary) {
    throw new Error(
      "Falta EXPO_PUBLIC_API_URL o EXPO_PUBLIC_API_HOST. Configura promy-mobile/.env para usar el modo local real.",
    );
  }

  return primary;
}

export const API_BASE_URL = getPrimaryApiBaseUrl();
export const API_BASE_URL_CANDIDATES = getApiBaseUrls();
