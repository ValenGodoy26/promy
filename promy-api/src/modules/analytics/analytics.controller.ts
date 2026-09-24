import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { logControllerError } from "../../shared/http/controllerLogger";
import { ingestPromotionAnalyticsEvents, promotionAnalyticsEventsSchema } from "./analytics.service";

export async function ingestPromotionEvents(req: AuthRequest, res: Response) {
  const parsed = promotionAnalyticsEventsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, message: "Eventos de analytics invalidos" });
  try {
    await ingestPromotionAnalyticsEvents(parsed.data);
    return res.status(204).send();
  } catch (error) {
    logControllerError(req, "Promotion analytics ingestion failed", error);
    return res.status(500).json({ ok: false, message: "No pudimos registrar la actividad" });
  }
}
