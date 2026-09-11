import type { Request } from "express";
import { logError } from "../logging/logger";
import { sanitizeTelemetryUrl } from "../observability/telemetrySanitizer";

export function logControllerError(req: Request, message: string, error: unknown) {
  logError(req, error, message, {
    requestId: req.requestId,
    method: req.method,
    path: sanitizeTelemetryUrl(req.originalUrl),
  });
}
