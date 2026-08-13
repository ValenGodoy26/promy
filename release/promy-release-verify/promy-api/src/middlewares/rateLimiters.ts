import rateLimit from "express-rate-limit";

const buildMessage = (message: string) => ({
  ok: false,
  message,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildMessage("Demasiados intentos. Proba nuevamente en unos minutos."),
});

export const publicReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "GET",
  message: buildMessage(
    "Se alcanzo el limite temporal de consultas. Espera unos segundos antes de seguir navegando.",
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
