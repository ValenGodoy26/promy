import { NativeModules, Platform } from "react-native";

const API_PROTOCOL = process.env.EXPO_PUBLIC_API_PROTOCOL?.trim() || "http";
const API_PORT = Number(process.env.EXPO_PUBLIC_API_PORT || 4000);

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

function isPrivateLanHost(host: string) {
  return /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}

function getHostFromUrl(url?: string | null) {
  if (!url) return null;

  const match = url.match(/^[a-z]+:\/\/([^/:?#]+)/i);
  return match?.[1] || null;
}

function getHostFromBundle() {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  return getHostFromUrl(scriptURL);
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

  const bundleHost = getHostFromBundle();
  if (bundleHost) {
    appendCandidate(targets, buildApiUrl(bundleHost));
  }

  if (Platform.OS === "android") {
    appendCandidate(targets, buildApiUrl("10.0.2.2"));
  }

  if (!bundleHost || !isPrivateLanHost(bundleHost)) {
    appendCandidate(targets, buildApiUrl("localhost"));
  }

  return targets;
}

export function getPrimaryApiBaseUrl() {
  return getApiBaseUrls()[0] || buildApiUrl("localhost");
}

export const API_BASE_URL = getPrimaryApiBaseUrl();
export const API_BASE_URL_CANDIDATES = getApiBaseUrls();
