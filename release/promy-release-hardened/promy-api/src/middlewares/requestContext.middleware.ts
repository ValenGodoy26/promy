import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import { logger } from "../shared/logging/logger";

export function attachRequestContext(req: Request, res: Response, next: NextFunction) {
  const headerValue = req.header("x-request-id")?.trim();
  const requestId = headerValue || randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  req.log = logger.child({
    requestId,
    method: req.method,
    path: req.originalUrl || req.url,
  });

  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const payload = {
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    };

    if (res.statusCode >= 500) {
      req.log.warn(payload, "Request completed with server error");
      return;
    }

    if (res.statusCode >= 400) {
      req.log.warn(payload, "Request completed with client error");
      return;
    }

    req.log.info(payload, "Request completed");
  });

  next();
}
