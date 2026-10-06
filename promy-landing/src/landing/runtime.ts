export function getEnvUrl(name: "VITE_PANEL_BASE_URL" | "VITE_API_BASE_URL") {
  const value = import.meta.env[name]?.trim();

  if (!value) {
    return "";
  }

  return value.replace(/\/$/, "");
}

// Local defaults keep the standalone landing renderable without borrowing an .env
// from another worktree. Public release builds are still blocked by releaseEnv.ts.
export const PANEL_BASE_URL = getEnvUrl("VITE_PANEL_BASE_URL") || "http://localhost:5173";
export const API_BASE_URL = getEnvUrl("VITE_API_BASE_URL") || "http://localhost:4000/api";

export async function fetchJsonWithDeadline<T>(url: string, init?: RequestInit, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = (await response.json().catch(() => null)) as T | null;
    return { response, data };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function buildPanelUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!PANEL_BASE_URL) return normalizedPath;
  return new URL(normalizedPath, `${PANEL_BASE_URL}/`).toString();
}
