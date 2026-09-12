import { API_BASE_URL, API_BASE_URL_CANDIDATES } from "./base";

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown;
  auth?: boolean;
  skipAuthRefresh?: boolean;
};

type ApiAuthHandlers = {
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  clearSession: () => Promise<void>;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const defaultAuthHandlers: ApiAuthHandlers = {
  getAccessToken: () => null,
  refreshAccessToken: async () => null,
  clearSession: async () => undefined,
};

let authHandlers = defaultAuthHandlers;

export function configureApiClient(nextHandlers: Partial<ApiAuthHandlers>) {
  authHandlers = {
    ...authHandlers,
    ...nextHandlers,
  };
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const configuredTargets = API_BASE_URL_CANDIDATES.length
    ? API_BASE_URL_CANDIDATES
    : [API_BASE_URL];
  const targets = (options.method || "GET") === "GET"
    ? configuredTargets
    : configuredTargets.slice(0, 1);
  let lastNetworkError: unknown = null;
  const shouldAttachAuth = options.auth !== false;
  const initialToken = options.token ?? (shouldAttachAuth ? authHandlers.getAccessToken() : null);

  for (const baseUrl of targets) {
    try {
      let result = await performRequest(baseUrl, path, options, initialToken);

      if (
        result.response.status === 401 &&
        shouldAttachAuth &&
        !options.token &&
        !options.skipAuthRefresh
      ) {
        const refreshedAccessToken = await authHandlers.refreshAccessToken();

        if (refreshedAccessToken) {
          result = await performRequest(baseUrl, path, options, refreshedAccessToken);
        } else {
          await authHandlers.clearSession();
          throw new ApiError("Tu sesión expiró. Inicia sesión nuevamente.", 401);
        }
      }

      const { response, data } = result;

      if (!response.ok) {
        const message =
          (data &&
          typeof data === "object" &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : null) || `Error ${response.status}`;

        if (response.status === 401 && shouldAttachAuth && !options.token) {
          await authHandlers.clearSession();
        }

        throw new ApiError(message, response.status);
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      lastNetworkError = error;
      continue;
    }
  }

  throw new ApiError(buildNetworkErrorMessage(lastNetworkError), 0);
}

async function performRequest(
  baseUrl: string,
  path: string,
  options: ApiRequestOptions,
  token?: string | null,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-promy-client": "mobile",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const rawText = await response.text();
    return { response, data: rawText ? safeJsonParse(rawText) : null };
  } finally {
    clearTimeout(timeoutId);
  }
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, message: text };
  }
}

function buildNetworkErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return "La conexion esta tardando mas de lo esperado. Proba nuevamente en unos segundos.";
  }

  return "No pudimos conectar con PROMY en este momento. Revisa tu conexion e intenta de nuevo.";
}
