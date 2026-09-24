import { BillingMode } from "@prisma/client";
import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { logControllerError } from "../../shared/http/controllerLogger";
import {
  getAdminBillingSubscription as getAdminBillingSubscriptionData,
  getBillingSettings,
  getCommerceBillingSummary,
  grantComplimentaryCoverage,
  isBillingServiceError,
  listBillingSubscriptions,
  registerManualPayment,
  reverseManualPayment as reverseManualPaymentRecord,
  revokeComplimentaryCoverage,
  updateBillingSettings,
} from "./billing.service";
import { cancelMercadoPagoSubscription, ensureMercadoPagoPlan, reconcileMercadoPagoSubscription, refreshMercadoPagoSubscription, startMercadoPagoEnrollment } from "./mercado-pago.service";

const dateSchema = z.string().datetime().transform((value) => new Date(value));
const settingsSchema = z.object({ mode: z.nativeEnum(BillingMode), billingStartsAt: dateSchema.nullable().optional(), monthlyPrice: z.number().positive().finite().nullable().optional() });
const complimentarySchema = z.object({ startsAt: dateSchema.optional(), endsAt: dateSchema.nullable().optional(), months: z.number().int().min(1).max(120).optional(), reason: z.string().trim().max(1000).optional() }).refine((value) => !(value.endsAt && value.months), { message: "Usa fecha final o meses, no ambos." });
const manualPaymentSchema = z.object({ amount: z.number().positive().finite(), months: z.number().int().min(1).max(24).optional(), reference: z.string().trim().max(190).optional(), note: z.string().trim().max(2000).optional(), idempotencyKey: z.string().trim().min(8).max(190).optional() });
const reverseSchema = z.object({ note: z.string().trim().max(2000).optional() });
const enrollmentSchema = z.object({ cardToken: z.string().trim().min(8).max(512) });

function sendError(req: AuthRequest, res: Response, label: string, error: unknown) {
  if (isBillingServiceError(error)) return res.status(error.statusCode).json({ ok: false, message: error.message, ...(error.details ?? {}) });
  logControllerError(req, label, error);
  return res.status(500).json({ ok: false, message: "Error interno de billing" });
}

export async function getCommerceSubscription(req: AuthRequest, res: Response) {
  try {
    if (!req.managedCommerce) return res.status(500).json({ ok: false, message: "No pudimos resolver tu comercio." });
    return res.json({ ok: true, subscription: await getCommerceBillingSummary(req.managedCommerce.id) });
  } catch (error) { return sendError(req, res, "Get commerce billing subscription error", error); }
}

export async function startCommerceSubscription(req: AuthRequest, res: Response) {
  try { if (!req.managedCommerce) return res.status(500).json({ ok: false, message: "No pudimos resolver tu comercio." }); const parsed = enrollmentSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ ok: false, message: "Datos de suscripción inválidos." }); const result = await startMercadoPagoEnrollment(req.managedCommerce.id, parsed.data.cardToken); return res.status(result.duplicate ? 200 : 201).json({ ok: true, enrollment: result }); } catch (error) { return sendError(req, res, "Start commerce subscription error", error); }
}
export async function cancelCommerceSubscription(req: AuthRequest, res: Response) {
  try { if (!req.managedCommerce) return res.status(500).json({ ok: false, message: "No pudimos resolver tu comercio." }); return res.json({ ok: true, subscription: await cancelMercadoPagoSubscription(req.managedCommerce.id) }); } catch (error) { return sendError(req, res, "Cancel commerce subscription error", error); }
}
export async function refreshCommerceSubscription(req: AuthRequest, res: Response) {
  try { if (!req.managedCommerce) return res.status(500).json({ ok: false, message: "No pudimos resolver tu comercio." }); return res.json({ ok: true, subscription: await refreshMercadoPagoSubscription(req.managedCommerce.id) }); } catch (error) { return sendError(req, res, "Refresh commerce subscription error", error); }
}

export async function getAdminBillingSettings(req: AuthRequest, res: Response) {
  try { return res.json({ ok: true, settings: await getBillingSettings() }); }
  catch (error) { return sendError(req, res, "Get billing settings error", error); }
}

export async function patchAdminBillingSettings(req: AuthRequest, res: Response) {
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, message: "Configuración de billing inválida.", errors: parsed.error.flatten() });
    if (!req.user) return res.status(401).json({ ok: false, message: "No autenticado." });
    const settings = await updateBillingSettings({ actorUserId: req.user.userId, ...parsed.data });
    return res.json({ ok: true, settings });
  } catch (error) { return sendError(req, res, "Update billing settings error", error); }
}
export async function provisionMercadoPagoPlan(req: AuthRequest, res: Response) {
  try { if (!req.user) return res.status(401).json({ ok: false, message: "No autenticado." }); return res.json({ ok: true, settings: await ensureMercadoPagoPlan(req.user.userId) }); } catch (error) { return sendError(req, res, "Provision Mercado Pago plan error", error); }
}
export async function reconcileAdminBillingSubscription(req: AuthRequest, res: Response) {
  try { const commerceId = Number(req.params.commerceId); if (!Number.isInteger(commerceId) || commerceId <= 0) return res.status(400).json({ ok: false, message: "Comercio inválido." }); if (!req.user) return res.status(401).json({ ok: false, message: "No autenticado." }); return res.json({ ok: true, subscription: await reconcileMercadoPagoSubscription(commerceId, req.user.userId) }); } catch (error) { return sendError(req, res, "Reconcile Mercado Pago subscription error", error); }
}

export async function getAdminBillingSubscriptions(req: AuthRequest, res: Response) {
  try { return res.json({ ok: true, subscriptions: await listBillingSubscriptions() }); }
  catch (error) { return sendError(req, res, "List billing subscriptions error", error); }
}

export async function getAdminBillingSubscription(req: AuthRequest, res: Response) {
  try {
    const commerceId = Number(req.params.commerceId);
    if (!Number.isInteger(commerceId) || commerceId <= 0) return res.status(400).json({ ok: false, message: "Comercio inválido." });
    return res.json({ ok: true, subscription: await getAdminBillingSubscriptionData(commerceId) });
  } catch (error) { return sendError(req, res, "Get admin billing subscription error", error); }
}

export async function createComplimentary(req: AuthRequest, res: Response) {
  try {
    const commerceId = Number(req.params.commerceId);
    const parsed = complimentarySchema.safeParse(req.body);
    if (!Number.isInteger(commerceId) || commerceId <= 0 || !parsed.success) return res.status(400).json({ ok: false, message: "Bonificación inválida.", ...(parsed.success ? {} : { errors: parsed.error.flatten() }) });
    if (!req.user) return res.status(401).json({ ok: false, message: "No autenticado." });
    const grant = await grantComplimentaryCoverage({ actorUserId: req.user.userId, commerceId, ...parsed.data });
    return res.status(201).json({ ok: true, grant });
  } catch (error) { return sendError(req, res, "Grant complimentary coverage error", error); }
}

export async function revokeComplimentary(req: AuthRequest, res: Response) {
  try {
    const commerceId = Number(req.params.commerceId); const grantId = Number(req.body?.grantId);
    if (!Number.isInteger(commerceId) || !Number.isInteger(grantId) || commerceId <= 0 || grantId <= 0) return res.status(400).json({ ok: false, message: "Bonificación inválida." });
    if (!req.user) return res.status(401).json({ ok: false, message: "No autenticado." });
    return res.json({ ok: true, grant: await revokeComplimentaryCoverage({ actorUserId: req.user.userId, commerceId, grantId }) });
  } catch (error) { return sendError(req, res, "Revoke complimentary coverage error", error); }
}

export async function createManualPayment(req: AuthRequest, res: Response) {
  try {
    const commerceId = Number(req.params.commerceId); const parsed = manualPaymentSchema.safeParse(req.body);
    if (!Number.isInteger(commerceId) || commerceId <= 0 || !parsed.success) return res.status(400).json({ ok: false, message: "Pago manual inválido.", ...(parsed.success ? {} : { errors: parsed.error.flatten() }) });
    if (!req.user) return res.status(401).json({ ok: false, message: "No autenticado." });
    const result = await registerManualPayment({ actorUserId: req.user.userId, commerceId, ...parsed.data });
    return res.status(result.duplicate ? 200 : 201).json({ ok: true, payment: result.payment, duplicate: result.duplicate });
  } catch (error) { return sendError(req, res, "Register manual payment error", error); }
}

export async function reverseManualPayment(req: AuthRequest, res: Response) {
  try {
    const commerceId = Number(req.params.commerceId); const paymentId = Number(req.params.paymentId); const parsed = reverseSchema.safeParse(req.body);
    if (!Number.isInteger(commerceId) || !Number.isInteger(paymentId) || commerceId <= 0 || paymentId <= 0 || !parsed.success) return res.status(400).json({ ok: false, message: "Reversión inválida." });
    if (!req.user) return res.status(401).json({ ok: false, message: "No autenticado." });
    return res.status(201).json({ ok: true, reversal: await reverseManualPaymentRecord({ actorUserId: req.user.userId, commerceId, paymentId, ...parsed.data }) });
  } catch (error) { return sendError(req, res, "Reverse manual payment error", error); }
}
