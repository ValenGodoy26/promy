import type { Request } from "express";
import { logError } from "../logging/logger";

export function logControllerError(req: Request, message: string, error: unknown) {
  logError(req, error, message, {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
  });
}
