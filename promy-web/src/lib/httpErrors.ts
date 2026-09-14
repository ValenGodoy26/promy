export type ApiErrorKind = "http" | "network" | "timeout";

export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;

  constructor(message: string, status: number, kind: ApiErrorKind = "http") {
    super(message);
    this.status = status;
    this.kind = kind;
  }
}

export const NETWORK_UNAVAILABLE_MESSAGE =
  "No pudimos conectarnos con PROMY. Revisá tu conexión e intentá nuevamente.";
export const REQUEST_TIMEOUT_MESSAGE =
  "PROMY tardó demasiado en responder. Intentá nuevamente en unos instantes.";
export const SESSION_EXPIRED_MESSAGE = "Tu sesión expiró. Volvé a iniciar sesión.";

const TECHNICAL_MESSAGE = /(failed to fetch|typeerror|econn|networkerror|load failed)/i;

export function getUserFacingErrorMessage(
  error: unknown,
  context: "login" | "load" | "action" = "action",
) {
  if (error instanceof ApiError) {
    if (error.kind === "network") return NETWORK_UNAVAILABLE_MESSAGE;
    if (error.kind === "timeout") return REQUEST_TIMEOUT_MESSAGE;
    if (context === "login" && error.status === 401) {
      return "El email o la contraseña no son correctos.";
    }
    if (error.status >= 500) {
      return "PROMY no está disponible en este momento. Intentá nuevamente más tarde.";
    }
    if (error.message && !TECHNICAL_MESSAGE.test(error.message)) return error.message;
  }

  return context === "load"
    ? "No pudimos cargar la información. Intentá nuevamente."
    : "No pudimos completar la operación. Intentá nuevamente.";
}

export function getRefreshFailureAction(error: unknown): "expire" | "preserve" {
  return error instanceof ApiError && [400, 401, 403].includes(error.status)
    ? "expire"
    : "preserve";
}

export function shouldAttemptSessionRestore(pathname: string, hasRefreshHint: boolean) {
  if (!hasRefreshHint) return false;
  return pathname.startsWith("/admin") || pathname.startsWith("/commerce") || pathname === "/app";
}
