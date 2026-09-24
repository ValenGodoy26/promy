import { createHash, randomUUID } from "crypto";
import { BillingAccessState, BillingPaymentSource, BillingPaymentStatus, BillingSubscriptionStatus, CommerceStatus, Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { env } from "../../config/env";
import { BillingServiceError, addBillingMonthPreservingAnchor, refreshCommerceBillingProjection } from "./billing.service";
import { BillingProviderError, ProviderAuthorizedPayment, ProviderSubscription } from "./providers/billing-provider";
import { getBillingProvider } from "./providers/provider-factory";

export function mapMercadoPagoSubscriptionStatus(status: string): BillingSubscriptionStatus | null {
  switch (status.toLowerCase()) { case "authorized": case "active": return BillingSubscriptionStatus.ACTIVE; case "pending": return BillingSubscriptionStatus.PENDING_PAYMENT; case "cancelled": case "canceled": return BillingSubscriptionStatus.CANCELLED; case "paused": return BillingSubscriptionStatus.PAST_DUE; default: return null; }
}
export function isMercadoPagoApprovedPayment(status: string) { return status.toLowerCase() === "approved"; }
function providerError(error: unknown): never { if (error instanceof BillingProviderError) throw new BillingServiceError(error.code === "disabled" ? "Mercado Pago no está habilitado." : "No pudimos confirmar Mercado Pago. Intentá nuevamente.", error.code === "not_found" ? 404 : error.code === "disabled" ? 409 : 502); throw error; }
function nextReconciliation(status: BillingSubscriptionStatus) { const hours = status === BillingSubscriptionStatus.PAST_DUE || status === BillingSubscriptionStatus.PENDING_PAYMENT ? 6 : 24; return new Date(Date.now() + hours * 3600_000); }

export async function ensureMercadoPagoPlan(actorUserId: number) {
  const settings = await prisma.billingSettings.findUniqueOrThrow({ where: { id: 1 } });
  if (!settings.monthlyPrice || Number(settings.monthlyPrice) <= 0) throw new BillingServiceError("Configurá un precio mensual antes de crear el plan.", 400);
  let plan; try { plan = await getBillingProvider().ensurePlan({ existingPlanId: settings.mercadoPagoPlanId, amount: Number(settings.monthlyPrice), currency: settings.currency, reason: "Suscripción mensual PROMY" }); } catch (error) { return providerError(error); }
  return prisma.$transaction(async (tx) => { const saved = await tx.billingSettings.update({ where: { id: 1 }, data: { mercadoPagoPlanId: plan.id } }); await tx.adminActionLog.create({ data: { adminUserId: actorUserId, action: "MERCADO_PAGO_PLAN_ENSURED", targetType: "BILLING_SETTINGS", targetId: 1, metadata: JSON.stringify({ providerPlanId: plan.id, amount: plan.amount, currency: plan.currency }) } }); return saved; });
}

export async function startMercadoPagoEnrollment(commerceId: number, cardToken: string) {
  if (!cardToken || cardToken.length > 512) throw new BillingServiceError("Token de tarjeta inválido.", 400);
  const reservation = await prisma.$transaction(async (tx) => {
    const [commerce, settings] = await Promise.all([tx.commerce.findUniqueOrThrow({ where: { id: commerceId }, select: { status: true, owner: { select: { email: true } } } }), tx.billingSettings.findUniqueOrThrow({ where: { id: 1 } })]);
    if (commerce.status !== CommerceStatus.APPROVED) throw new BillingServiceError("Tu comercio debe estar aprobado para suscribirse.", 409);
    if (!settings.mercadoPagoPlanId || !settings.monthlyPrice) throw new BillingServiceError("El plan de suscripción todavía no está disponible.", 409);
    const subscription = await tx.billingSubscription.upsert({ where: { commerceId }, update: {}, create: { commerceId, status: BillingSubscriptionStatus.PENDING_PAYMENT } });
    if (subscription.providerSubscriptionId) return { duplicate: true, subscription, settings, email: commerce.owner.email };
    // A timeout after POST may mean Mercado Pago created the resource. Do not
    // automatically issue a second non-idempotent enrollment request.
    if (subscription.enrollmentStartedAt) return { duplicate: true, subscription, settings, email: commerce.owner.email };
    const externalReference = subscription.providerExternalReference ?? randomUUID();
    const updated = await tx.billingSubscription.update({ where: { id: subscription.id }, data: { provider: "mercado_pago", providerPlanId: settings.mercadoPagoPlanId, providerExternalReference: externalReference, enrollmentStartedAt: new Date(), status: BillingSubscriptionStatus.PENDING_PAYMENT } });
    return { duplicate: false, subscription: updated, settings, email: commerce.owner.email };
  });
  if (reservation.duplicate) return { duplicate: true, status: reservation.subscription.status, initPoint: null };
  if (!env.MERCADO_PAGO_BACK_URL) throw new BillingServiceError("Falta configurar la URL de retorno de Mercado Pago.", 409);
  let remote; try { remote = await getBillingProvider().createEnrollment({ planId: reservation.settings.mercadoPagoPlanId!, externalReference: reservation.subscription.providerExternalReference!, payerEmail: reservation.email, cardToken, backUrl: env.MERCADO_PAGO_BACK_URL, amount: Number(reservation.settings.monthlyPrice), currency: reservation.settings.currency }); } catch (error) { return providerError(error); }
  if (remote.externalReference !== reservation.subscription.providerExternalReference) throw new BillingServiceError("Mercado Pago devolvió una referencia no asociada al comercio.", 502);
  await applyMercadoPagoSubscription(remote, commerceId);
  return { duplicate: false, status: mapMercadoPagoSubscriptionStatus(remote.status) ?? BillingSubscriptionStatus.PENDING_PAYMENT, initPoint: remote.initPoint };
}

export async function applyMercadoPagoSubscription(remote: ProviderSubscription, expectedCommerceId?: number) {
  return prisma.$transaction(async (tx) => {
    const subscription = await tx.billingSubscription.findFirstOrThrow({ where: expectedCommerceId ? { commerceId: expectedCommerceId } : { providerSubscriptionId: remote.id }, include: { commerce: { select: { id: true } } } });
    if (!subscription.providerExternalReference || remote.externalReference !== subscription.providerExternalReference) throw new BillingServiceError("La referencia de Mercado Pago no coincide.", 409);
    if (subscription.providerVersion !== null && remote.version !== null && remote.version < subscription.providerVersion) return subscription;
    const mapped = mapMercadoPagoSubscriptionStatus(remote.status);
    const status = mapped ?? subscription.status; // Unknown external statuses never degrade local coverage.
    const updated = await tx.billingSubscription.update({ where: { id: subscription.id }, data: { provider: "mercado_pago", providerSubscriptionId: remote.id, providerPlanId: remote.planId ?? subscription.providerPlanId, providerStatus: remote.status.slice(0, 190), providerVersion: remote.version, providerLastModifiedAt: remote.lastModifiedAt, currentPeriodStart: remote.currentPeriodStart ?? subscription.currentPeriodStart, currentPeriodEnd: remote.currentPeriodEnd ?? subscription.currentPeriodEnd, status, enrollmentStartedAt: null, reconciliationDueAt: nextReconciliation(status), cancelAtPeriodEnd: status === BillingSubscriptionStatus.CANCELLED ? true : subscription.cancelAtPeriodEnd, cancelledAt: status === BillingSubscriptionStatus.CANCELLED ? new Date() : subscription.cancelledAt } });
    await refreshCommerceBillingProjection(tx, subscription.commerce.id); return updated;
  });
}

export async function refreshMercadoPagoSubscription(commerceId: number) { const local = await prisma.billingSubscription.findUniqueOrThrow({ where: { commerceId } }); if (!local.providerSubscriptionId) throw new BillingServiceError("No hay suscripción Mercado Pago para actualizar.", 404); try { return await applyMercadoPagoSubscription(await getBillingProvider().getSubscription(local.providerSubscriptionId), commerceId); } catch (error) { return providerError(error); } }
export async function reconcileMercadoPagoSubscription(commerceId: number, actorUserId: number) { const subscription = await refreshMercadoPagoSubscription(commerceId); await prisma.adminActionLog.create({ data: { adminUserId: actorUserId, action: "MERCADO_PAGO_RECONCILED", targetType: "BILLING_SUBSCRIPTION", targetId: subscription.id, commerceId, metadata: JSON.stringify({ status: subscription.status, providerStatus: subscription.providerStatus }) } }); return subscription; }
export async function cancelMercadoPagoSubscription(commerceId: number) { const local = await prisma.billingSubscription.findUniqueOrThrow({ where: { commerceId } }); if (!local.providerSubscriptionId) throw new BillingServiceError("No hay suscripción Mercado Pago activa.", 404); let remote; try { remote = await getBillingProvider().cancelSubscription(local.providerSubscriptionId); } catch (error) { return providerError(error); } return prisma.$transaction(async (tx) => { const result = await tx.billingSubscription.update({ where: { id: local.id }, data: { providerStatus: remote.status.slice(0, 190), providerVersion: remote.version, providerLastModifiedAt: remote.lastModifiedAt, cancelAtPeriodEnd: true, cancelRequestedAt: new Date(), reconciliationDueAt: nextReconciliation(BillingSubscriptionStatus.ACTIVE) } }); await refreshCommerceBillingProjection(tx, commerceId); return result; }); }

export async function importMercadoPagoAuthorizedPayment(payment: ProviderAuthorizedPayment) {
  const subscription = await prisma.billingSubscription.findFirst({ where: { providerSubscriptionId: payment.subscriptionId } }); if (!subscription) throw new BillingServiceError("Pago sin suscripción PROMY asociada.", 409);
  if (!Number.isFinite(payment.amount) || payment.amount <= 0 || payment.currency !== "ARS") throw new BillingServiceError("Pago Mercado Pago inválido.", 502);
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.billingPayment.findUnique({ where: { providerPaymentId: payment.id } }); if (duplicate) return duplicate;
    const now = new Date(); const start = payment.periodStart ?? subscription.currentPeriodEnd ?? now; const end = payment.periodEnd ?? addBillingMonthPreservingAnchor(start, 1, subscription.anchorDay);
    const approved = isMercadoPagoApprovedPayment(payment.status); const record = await tx.billingPayment.create({ data: { commerceId: subscription.commerceId, subscriptionId: subscription.id, source: BillingPaymentSource.MERCADO_PAGO, status: approved ? BillingPaymentStatus.APPROVED : BillingPaymentStatus.REJECTED, amount: new Prisma.Decimal(payment.amount), currency: payment.currency, periodStart: start, periodEnd: end, paidAt: approved ? (payment.paidAt ?? now) : null, providerPaymentId: payment.id, reference: payment.id } });
    await tx.billingSubscription.update({ where: { id: subscription.id }, data: approved ? { status: BillingSubscriptionStatus.ACTIVE, currentPeriodStart: start, currentPeriodEnd: end, paymentFailedAt: null, graceEndsAt: null, reconciliationDueAt: nextReconciliation(BillingSubscriptionStatus.ACTIVE) } : { status: BillingSubscriptionStatus.PAST_DUE, paymentFailedAt: now, graceEndsAt: new Date(now.getTime() + 5 * 86400_000), reconciliationDueAt: nextReconciliation(BillingSubscriptionStatus.PAST_DUE) } });
    await refreshCommerceBillingProjection(tx, subscription.commerceId); return record;
  });
}

export async function processMercadoPagoWebhook(input: { topic: string; resourceId: string; fingerprint: string }) {
  const receipt = await prisma.mercadoPagoWebhookReceipt.create({ data: { topic: input.topic, resourceId: input.resourceId, fingerprint: input.fingerprint } }).catch((error) => { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null; throw error; }); if (!receipt) return { duplicate: true };
  try { if (input.topic === "subscription_preapproval") { await applyMercadoPagoSubscription(await getBillingProvider().getSubscription(input.resourceId)); } else if (input.topic === "subscription_authorized_payment") { await importMercadoPagoAuthorizedPayment(await getBillingProvider().getAuthorizedPayment(input.resourceId)); } await prisma.mercadoPagoWebhookReceipt.update({ where: { id: receipt.id }, data: { status: "PROCESSED", processedAt: new Date() } }); return { duplicate: false }; } catch (error) { await prisma.mercadoPagoWebhookReceipt.update({ where: { id: receipt.id }, data: { status: "RETRY", errorCode: error instanceof BillingProviderError ? error.code : "internal" } }); throw error; }
}
export function webhookFingerprint(topic: string, resourceId: string) { return createHash("sha256").update(`${topic}:${resourceId}`).digest("hex"); }

export async function reconcileDueMercadoPagoSubscriptions(now = new Date()) {
  const due = await prisma.billingSubscription.findMany({ where: { provider: "mercado_pago", providerSubscriptionId: { not: null }, status: { in: [BillingSubscriptionStatus.ACTIVE, BillingSubscriptionStatus.PAST_DUE, BillingSubscriptionStatus.PENDING_PAYMENT] }, OR: [{ reconciliationDueAt: null }, { reconciliationDueAt: { lte: now } }] }, select: { commerceId: true, providerSubscriptionId: true } });
  let reconciled = 0;
  for (const entry of due) {
    try { await refreshMercadoPagoSubscription(entry.commerceId); reconciled += 1; }
    catch { await prisma.billingSubscription.updateMany({ where: { commerceId: entry.commerceId, providerSubscriptionId: entry.providerSubscriptionId }, data: { reconciliationDueAt: new Date(now.getTime() + 6 * 3600_000) } }); }
  }
  return reconciled;
}
let reconciliationTimer: NodeJS.Timeout | null = null;
export function startMercadoPagoReconciliationLoop() { if (reconciliationTimer) return; reconciliationTimer = setInterval(() => { void reconcileDueMercadoPagoSubscriptions().catch(() => undefined); }, 60 * 60_000); reconciliationTimer.unref(); }
export function stopMercadoPagoReconciliationLoop() { if (!reconciliationTimer) return; clearInterval(reconciliationTimer); reconciliationTimer = null; }
