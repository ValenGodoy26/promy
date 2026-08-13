import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logError } from "../shared/logging/logger";
import { captureApiException } from "../shared/observability/sentry";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logError(req, error, "Unhandled request error", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
  });

  if (!(error instanceof ZodError) && error.message !== "Origin no permitida por CORS") {
    captureApiException(error, req, {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      message: "Datos invalidos",
      requestId: req.requestId,
      errors: error.flatten(),
    });
  }

  if (error.message === "Origin no permitida por CORS") {
    return res.status(403).json({
      ok: false,
      message: "Origin no permitida",
      requestId: req.requestId,
    });
  }

  return res.status(500).json({
    ok: false,
    message: "Error interno del servidor",
    requestId: req.requestId,
  });
};
