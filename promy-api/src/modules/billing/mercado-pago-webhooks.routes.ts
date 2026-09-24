import { Request, Response, Router } from "express";
import { env } from "../../config/env";
import { logger } from "../../shared/logging/logger";
import { processMercadoPagoWebhook, webhookFingerprint } from "./mercado-pago.service";
import { verifyMercadoPagoWebhookSignature } from "./mercado-pago.webhook";

const router = Router();
router.post("/mercado-pago", async (req: Request, res: Response) => {
  const topic = typeof req.body?.type === "string" ? req.body.type : typeof req.query.type === "string" ? req.query.type : "";
  const resourceId = typeof req.body?.data?.id === "string" ? req.body.data.id : typeof req.query["data.id"] === "string" ? req.query["data.id"] : "";
  const signatureValid = Boolean(env.MERCADO_PAGO_WEBHOOK_SECRET) && verifyMercadoPagoWebhookSignature({ signature: req.header("x-signature") ?? undefined, requestId: req.header("x-request-id") ?? undefined, dataId: resourceId, secret: env.MERCADO_PAGO_WEBHOOK_SECRET! });
  if (!signatureValid) { logger.warn({ topic: topic || undefined }, "billing.mp.webhook_invalid"); return res.sendStatus(401); }
  if (!new Set(["subscription_preapproval", "subscription_authorized_payment"]).has(topic) || !resourceId) return res.sendStatus(204);
  try { const result = await processMercadoPagoWebhook({ topic, resourceId, fingerprint: webhookFingerprint(topic, resourceId) }); logger.info({ topic, duplicate: result.duplicate }, "billing.mp.webhook_processed"); return res.sendStatus(200); }
  catch (error) { logger.error({ topic, reason: error instanceof Error ? error.name : "unknown" }, "billing.mp.request_failed"); return res.sendStatus(502); }
});
export default router;
