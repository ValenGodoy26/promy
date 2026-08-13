import rateLimit from "express-rate-limit";

const buildMessage = (message: string) => ({
  ok: false,
  message,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 18,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage("Demasiados intentos. Proba nuevamente en unos minutos."),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage(
    "Llegaste al limite temporal de intentos de ingreso. Espera unos minutos antes de volver a probar.",
  ),
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage(
    "Ya solicitaste demasiados correos de recuperacion desde este origen. Espera un rato antes de volver a intentar.",
  ),
});

export const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage(
    "Llegaste al limite temporal de cambios de contrasena. Espera unos minutos antes de volver a intentar.",
  ),
});

export const changeEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 4,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage(
    "Llegaste al limite temporal de solicitudes para cambiar el email. Espera unos minutos antes de volver a intentar.",
  ),
});

export const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "GET",
  message: buildMessage(
    "Se alcanzo el limite temporal de consultas. Espera unos segundos antes de seguir navegando.",
  ),
});

export const publicCatalogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "GET",
  message: buildMessage(
    "Hiciste muchas consultas al catalogo en poco tiempo. Espera unos segundos antes de seguir explorando.",
  ),
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 45,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "GET",
  message: buildMessage(
    "La busqueda recibio demasiados intentos seguidos. Espera unos segundos y volve a probar.",
  ),
});

export const redemptionCreateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage(
    "Hiciste demasiados intentos de canje en poco tiempo. Espera unos minutos antes de volver a probar.",
  ),
});

export const redemptionValidationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage(
    "Se alcanzo el limite temporal de validaciones. Espera unos minutos antes de seguir.",
  ),
});

export const adminWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage(
    "Hay demasiadas acciones administrativas en curso desde este origen. Intenta nuevamente en unos minutos.",
  ),
});

export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage(
    "Se alcanzo el limite temporal de subidas. Espera unos minutos antes de volver a intentar.",
  ),
});

export const realtimeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage(
    "Se alcanzo el limite temporal de conexiones en tiempo real. Espera unos minutos antes de reconectar.",
  ),
});
