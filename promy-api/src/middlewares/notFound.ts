import { Request, Response } from "express";
import { sanitizeTelemetryUrl } from "../shared/observability/telemetrySanitizer";

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    message: `Ruta no encontrada: ${sanitizeTelemetryUrl(req.originalUrl)}`,
  });
};
