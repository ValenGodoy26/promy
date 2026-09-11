import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { logError, logWarn } from "../shared/logging/logger";
import { captureApiException } from "../shared/observability/sentry";
import { sanitizeTelemetryUrl } from "../shared/observability/telemetrySanitizer";
import { isServiceError } from "../shared/utils/service";

type RequestErrorResponse = {
  statusCode: number;
  message: string;
  details?: Record<string, unknown>;
};

type ParserError = Error & {
  status?: number;
  statusCode?: number;
  type?: string;
};

export function mapRequestError(error: unknown): RequestErrorResponse | null {
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      message: "Datos invalidos",
      details: { errors: error.flatten() },
    };
  }

  if (isServiceError(error) && error.statusCode >= 400 && error.statusCode < 500) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return { statusCode: 413, message: "El archivo supera el limite permitido" };
    }

    return { statusCode: 400, message: "La carga de archivos no es valida" };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { statusCode: 409, message: "El recurso ya existe" };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    return { statusCode: 409, message: "La operacion entro en conflicto con otra solicitud" };
  }

  if (error instanceof Error && error.message === "Origin no permitida por CORS") {
    return { statusCode: 403, message: "Origin no permitida" };
  }

  if (error instanceof Error) {
    const parserError = error as ParserError;

    if (parserError.type === "entity.too.large" || parserError.status === 413) {
      return { statusCode: 413, message: "El cuerpo de la solicitud supera el limite permitido" };
    }

    if (
      parserError.type === "encoding.unsupported" ||
      parserError.type === "charset.unsupported" ||
      parserError.status === 415
    ) {
      return { statusCode: 415, message: "Tipo de contenido no soportado" };
    }

    if (
      parserError.type === "entity.parse.failed" ||
      parserError.type === "entity.verify.failed" ||
      parserError.status === 400
    ) {
      return { statusCode: 400, message: "JSON invalido" };
    }
  }

  return null;
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const mappedError = mapRequestError(error);
  const context = {
    requestId: req.requestId,
    method: req.method,
    path: sanitizeTelemetryUrl(req.originalUrl),
  };

  if (mappedError) {
    logWarn(req, "Request rejected", {
      ...context,
      statusCode: mappedError.statusCode,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  } else {
    logError(req, error, "Unhandled request error", context);
    captureApiException(error, req, {
      ...context,
    });
  }

  if (mappedError) {
    return res.status(mappedError.statusCode).json({
      ok: false,
      message: mappedError.message,
      requestId: req.requestId,
      ...(mappedError.details ?? {}),
    });
  }

  return res.status(500).json({
    ok: false,
    message: "Error interno del servidor",
    requestId: req.requestId,
  });
};
