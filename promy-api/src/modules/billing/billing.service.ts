import {
  BillingAccessState,
  BillingCoverageSource,
  BillingMode,
  BillingPaymentSource,
  BillingPaymentStatus,
  BillingSubscriptionStatus,
  CommerceStatus,
  Prisma,
} from "@prisma/client";
import prisma from "../../config/prisma";
import { createAppNotification } from "../notifications/notifications.service";

export const BILLING_GRACE_DAYS = 5;
export const BILLING_TIMEZONE = "America/Argentina/Buenos_Aires";

export class BillingServiceError extends Error {
  constructor(message: string, public readonly statusCode = 400, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = "BillingServiceError";
  }
}

export function isBillingServiceError(error: unknown): error is BillingServiceError {
  return error instanceof BillingServiceError;
}

export type CoverageInput = {
  settings: { mode: BillingMode; billingStartsAt: Date | null };
  commerce: { status: CommerceStatus; approvedAt: Date | null };
  subscription?: {
    status: BillingSubscriptionStatus;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    paymentFailedAt: Date | null;
    graceEndsAt: Date | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  payments?: Array<{ source: BillingPaymentSource; status: BillingPaymentStatus; periodStart: Date; periodEnd: Date; reversed?: boolean }>;
  grants?: Array<{ source: BillingCoverageSource; startsAt: Date; endsAt: Date | null; revokedAt: Date | null }>;
};

export type BillingCoverage = {
  hasCoverage: boolean;
  source: BillingCoverageSource | null;
  status: BillingSubscriptionStatus | "BETA_FREE" | "NOT_REQUIRED" | "NO_COVERAGE";
  periodStart: Date | null;
  periodEnd: Date | null;
  graceEndsAt: Date | null;
  reason: string;
};

function isActivePeriod(start: Date, end: Date | null, now: Date) {
  return start.getTime() <= now.getTime() && (!end || end.getTime() > now.getTime());
}

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BILLING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day") };
}

/**
 * Business-calendar month addition. The returned instant is local midday in
 * Buenos Aires represented in UTC, preventing host/browser timezone drift.
 */
export function addBillingMonthPreservingAnchor(date: Date, months = 1, anchorDay?: number | null) {
  const source = dateParts(date);
  const anchor = Math.max(1, Math.min(31, Math.trunc(anchorDay ?? source.day)));
  const monthIndex = source.year * 12 + (source.month - 1) + Math.trunc(months);
  const year = Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(anchor, lastDay), 12, 0, 0, 0));
}

export function resolveBillingCoverage(input: CoverageInput, now = new Date()): BillingCoverage {
  const { settings, commerce, subscription, payments = [], grants = [] } = input;
  if (commerce.status !== CommerceStatus.APPROVED) {
    return { hasCoverage: false, source: null, status: "NO_COVERAGE", periodStart: null, periodEnd: null, graceEndsAt: null, reason: "commerce_not_approved" };
  }

  const activeGrant = grants
    .filter((grant) => grant.source === BillingCoverageSource.COMPLIMENTARY && !grant.revokedAt && isActivePeriod(grant.startsAt, grant.endsAt, now))
    .sort((a, b) => (b.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (a.endsAt?.getTime() ?? Number.MAX_SAFE_INTEGER))[0];
  if (activeGrant) {
    return { hasCoverage: true, source: BillingCoverageSource.COMPLIMENTARY, status: "ACTIVE", periodStart: activeGrant.startsAt, periodEnd: activeGrant.endsAt, graceEndsAt: null, reason: "complimentary_grant" };
  }

  const activeManual = payments
    .filter((payment) => payment.source === BillingPaymentSource.MANUAL && payment.status === BillingPaymentStatus.APPROVED && !payment.reversed && isActivePeriod(payment.periodStart, payment.periodEnd, now))
    .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime())[0];
  if (activeManual) {
    return { hasCoverage: true, source: BillingCoverageSource.MANUAL, status: "ACTIVE", periodStart: activeManual.periodStart, periodEnd: activeManual.periodEnd, graceEndsAt: null, reason: "manual_payment" };
  }

  if (subscription?.status === BillingSubscriptionStatus.PAST_DUE && subscription.graceEndsAt && subscription.graceEndsAt.getTime() > now.getTime()) {
    return { hasCoverage: true, source: BillingCoverageSource.MERCADO_PAGO, status: BillingSubscriptionStatus.PAST_DUE, periodStart: subscription.currentPeriodStart, periodEnd: subscription.currentPeriodEnd, graceEndsAt: subscription.graceEndsAt, reason: "payment_grace" };
  }
  if (subscription && (subscription.status === BillingSubscriptionStatus.ACTIVE || (subscription.status === BillingSubscriptionStatus.PAST_DUE && subscription.cancelAtPeriodEnd)) && subscription.currentPeriodStart && subscription.currentPeriodEnd && isActivePeriod(subscription.currentPeriodStart, subscription.currentPeriodEnd, now)) {
    return { hasCoverage: true, source: BillingCoverageSource.MERCADO_PAGO, status: subscription.status, periodStart: subscription.currentPeriodStart, periodEnd: subscription.currentPeriodEnd, graceEndsAt: subscription.graceEndsAt, reason: subscription.cancelAtPeriodEnd ? "cancel_at_period_end" : "subscription_period" };
  }

  if (settings.mode === BillingMode.OFF || (settings.mode === BillingMode.SCHEDULED && (!settings.billingStartsAt || now.getTime() < settings.billingStartsAt.getTime()))) {
    return { hasCoverage: true, source: BillingCoverageSource.BETA_FREE, status: "BETA_FREE", periodStart: null, periodEnd: settings.billingStartsAt, graceEndsAt: null, reason: settings.mode === BillingMode.OFF ? "billing_off" : "billing_scheduled" };
  }

  if (settings.billingStartsAt && commerce.approvedAt && commerce.approvedAt.getTime() < settings.billingStartsAt.getTime()) {
    const transitionEnd = new Date(settings.billingStartsAt.getTime() + BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000);
    if (now.getTime() < transitionEnd.getTime()) {
      return { hasCoverage: true, source: BillingCoverageSource.BETA_FREE, status: "BETA_FREE", periodStart: settings.billingStartsAt, periodEnd: transitionEnd, graceEndsAt: transitionEnd, reason: "beta_migration_transition" };
    }
  }

  return { hasCoverage: false, source: null, status: subscription?.status === BillingSubscriptionStatus.CANCELLED ? BillingSubscriptionStatus.CANCELLED : BillingSubscriptionStatus.PENDING_PAYMENT, periodStart: null, periodEnd: null, graceEndsAt: subscription?.graceEndsAt ?? null, reason: "payment_required" };
}

export async function getBillingSettings() {
  return prisma.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, mode: BillingMode.OFF, currency: "ARS" } });
}

type BillingTx = Prisma.TransactionClient;

async function getCoverageInput(tx: BillingTx, commerceId: number) {
  const [settings, commerce, subscription, payments, grants] = await Promise.all([
    tx.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, mode: BillingMode.OFF, currency: "ARS" } }),
    tx.commerce.findUniqueOrThrow({ where: { id: commerceId }, select: { status: true, approvedAt: true } }),
    tx.billingSubscription.findUnique({ where: { commerceId }, select: { status: true, currentPeriodStart: true, currentPeriodEnd: true, paymentFailedAt: true, graceEndsAt: true, cancelAtPeriodEnd: true } }),
    tx.billingPayment.findMany({ where: { commerceId }, select: { source: true, status: true, periodStart: true, periodEnd: true, reversalOf: { select: { id: true } } } }),
    tx.billingCoverageGrant.findMany({ where: { commerceId }, select: { source: true, startsAt: true, endsAt: true, revokedAt: true } }),
  ]);
  return { settings, commerce, subscription, payments: payments.map((payment) => ({ ...payment, reversed: Boolean(payment.reversalOf) })), grants };
}

export async function refreshCommerceBillingProjection(tx: BillingTx, commerceId: number, now = new Date()) {
  const coverage = resolveBillingCoverage(await getCoverageInput(tx, commerceId), now);
  await tx.commerce.update({ where: { id: commerceId }, data: {
    billingAccessState: coverage.hasCoverage ? BillingAccessState.COVERED : BillingAccessState.NO_COVERAGE,
    billingCoverageUntil: coverage.periodEnd,
    billingSuspendedAt: coverage.hasCoverage ? null : now,
  } });
  return coverage;
}

export async function refreshAllCommerceBillingProjections(now = new Date()) {
  const commerces = await prisma.commerce.findMany({ select: { id: true } });
  for (const commerce of commerces) {
    await prisma.$transaction((tx) => refreshCommerceBillingProjection(tx, commerce.id, now));
  }
}

function assertBillingSettings(input: { mode: BillingMode; billingStartsAt?: Date | null; monthlyPrice?: Prisma.Decimal | number | null }) {
  if ((input.mode === BillingMode.SCHEDULED || input.mode === BillingMode.ON) && (!input.monthlyPrice || Number(input.monthlyPrice) <= 0)) {
    throw new BillingServiceError("Billing programado o activo requiere un precio mensual ARS mayor a cero.", 400);
  }
  if (input.mode === BillingMode.SCHEDULED && (!input.billingStartsAt || input.billingStartsAt.getTime() <= Date.now())) {
    throw new BillingServiceError("Billing programado requiere una fecha futura de inicio.", 400);
  }
}

export async function updateBillingSettings(input: { actorUserId: number; mode: BillingMode; billingStartsAt?: Date | null; monthlyPrice?: number | null }) {
  const current = await getBillingSettings();
  const next = {
    mode: input.mode,
    billingStartsAt: input.billingStartsAt === undefined ? current.billingStartsAt : input.billingStartsAt,
    monthlyPrice: input.monthlyPrice === undefined ? current.monthlyPrice : input.monthlyPrice,
  };
  assertBillingSettings(next);
  const settings = await prisma.$transaction(async (tx) => {
    const previous = await tx.billingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, mode: BillingMode.OFF, currency: "ARS" } });
    const settings = await tx.billingSettings.update({ where: { id: 1 }, data: { mode: next.mode, billingStartsAt: next.billingStartsAt, monthlyPrice: next.monthlyPrice, currency: "ARS" } });
    await tx.adminActionLog.create({ data: { adminUserId: input.actorUserId, action: `BILLING_${input.mode}`, targetType: "BILLING_SETTINGS", targetId: 1, metadata: JSON.stringify({ previousMode: previous.mode, mode: settings.mode, billingStartsAt: settings.billingStartsAt, monthlyPrice: settings.monthlyPrice?.toString() }) } });
    return settings;
  });
  await refreshAllCommerceBillingProjections();
  if (settings.mode === BillingMode.SCHEDULED || settings.mode === BillingMode.ON) {
    const owners = await prisma.commerce.findMany({ where: { status: CommerceStatus.APPROVED }, select: { id: true, ownerUserId: true } });
    const type = settings.mode === BillingMode.SCHEDULED ? "BILLING_SCHEDULED" : "BILLING_ENFORCEMENT_ACTIVE";
    const title = settings.mode === BillingMode.SCHEDULED ? "Suscripción programada" : "Suscripción activa";
    const body = settings.mode === BillingMode.SCHEDULED
      ? "PROMY activará la suscripción obligatoria en la fecha informada."
      : "La suscripción de PROMY ya está activa. Revisá el estado de cobertura de tu comercio.";
    await Promise.all(owners.map((owner) => createAppNotification({ userId: owner.ownerUserId, type, title, body, data: { commerceId: owner.id, billingMode: settings.mode } })));
  }
  return settings;
}

export async function getCommerceBillingSummary(commerceId: number) {
  const snapshot = await prisma.$transaction(async (tx) => {
    const input = await getCoverageInput(tx, commerceId);
    const coverage = await refreshCommerceBillingProjection(tx, commerceId);
    const subscription = await tx.billingSubscription.findUnique({ where: { commerceId }, select: { status: true, cancelAtPeriodEnd: true, currentPeriodStart: true, currentPeriodEnd: true, graceEndsAt: true } });
    return { settings: input.settings, coverage, subscription };
  });
  return {
    billingMode: snapshot.settings.mode, billingStartsAt: snapshot.settings.billingStartsAt, monthlyPrice: snapshot.settings.monthlyPrice?.toString() ?? null, currency: snapshot.settings.currency,
    status: snapshot.coverage.status, hasCoverage: snapshot.coverage.hasCoverage, coverageSource: snapshot.coverage.source,
    periodStart: snapshot.coverage.periodStart, periodEnd: snapshot.coverage.periodEnd, graceEndsAt: snapshot.coverage.graceEndsAt,
    cancelAtPeriodEnd: snapshot.subscription?.cancelAtPeriodEnd ?? false,
    canCreatePromotion: snapshot.coverage.hasCoverage, canPublishPromotion: snapshot.coverage.hasCoverage,
    canValidateExistingRedemption: true, needsPayment: !snapshot.coverage.hasCoverage,
  };
}

async function ensureBillingSubscription(tx: BillingTx, commerceId: number) {
  return tx.billingSubscription.upsert({ where: { commerceId }, update: {}, create: { commerceId, status: BillingSubscriptionStatus.PENDING_PAYMENT } });
}

export async function registerManualPayment(input: { actorUserId: number; commerceId: number; amount: number; months?: number; reference?: string; note?: string; idempotencyKey?: string }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new BillingServiceError("El monto debe ser mayor a cero.", 400);
  const months = Math.trunc(input.months ?? 1);
  if (months < 1 || months > 24) throw new BillingServiceError("Los meses deben estar entre 1 y 24.", 400);
  const result = await prisma.$transaction(async (tx) => {
    const commerce = await tx.commerce.findUniqueOrThrow({ where: { id: input.commerceId }, select: { id: true, ownerUserId: true } });
    const existing = input.idempotencyKey ? await tx.billingPayment.findFirst({ where: { commerceId: input.commerceId, source: BillingPaymentSource.MANUAL, reference: input.idempotencyKey, status: BillingPaymentStatus.APPROVED } }) : null;
    if (existing) return { payment: existing, ownerUserId: commerce.ownerUserId, duplicate: true };
    const subscription = await ensureBillingSubscription(tx, input.commerceId);
    if (subscription.provider && subscription.status === BillingSubscriptionStatus.ACTIVE) throw new BillingServiceError("No se puede registrar un pago manual mientras una recurrencia externa permanezca activa.", 409);
    const coverage = resolveBillingCoverage(await getCoverageInput(tx, input.commerceId));
    const periodStart = coverage.hasCoverage && coverage.periodEnd && coverage.periodEnd.getTime() > Date.now() ? coverage.periodEnd : new Date();
    const anchorDay = subscription.anchorDay ?? dateParts(periodStart).day;
    const periodEnd = addBillingMonthPreservingAnchor(periodStart, months, anchorDay);
    const payment = await tx.billingPayment.create({ data: { commerceId: input.commerceId, subscriptionId: subscription.id, source: BillingPaymentSource.MANUAL, status: BillingPaymentStatus.APPROVED, amount: new Prisma.Decimal(input.amount), currency: "ARS", periodStart, periodEnd, paidAt: new Date(), reference: input.idempotencyKey ?? input.reference ?? null, note: input.note ?? null, registeredByUserId: input.actorUserId } });
    await tx.billingSubscription.update({ where: { id: subscription.id }, data: { status: BillingSubscriptionStatus.ACTIVE, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, anchorDay, paymentFailedAt: null, graceEndsAt: null, cancelAtPeriodEnd: false, cancelledAt: null } });
    const coverageAfter = await refreshCommerceBillingProjection(tx, input.commerceId);
    await tx.adminActionLog.create({ data: { adminUserId: input.actorUserId, action: "MANUAL_PAYMENT_REGISTERED", targetType: "BILLING_PAYMENT", targetId: payment.id, commerceId: input.commerceId, metadata: JSON.stringify({ amount: payment.amount.toString(), currency: "ARS", months, periodStart, periodEnd, source: coverageAfter.source }) } });
    return { payment, ownerUserId: commerce.ownerUserId, duplicate: false };
  });
  if (!result.duplicate) await createAppNotification({ userId: result.ownerUserId, type: "BILLING_MANUAL_PAYMENT_REGISTERED", title: "Pago registrado", body: "Registramos una cobertura manual para tu comercio.", data: { commerceId: input.commerceId, billingPaymentId: result.payment.id } });
  return result;
}

export async function grantComplimentaryCoverage(input: { actorUserId: number; commerceId: number; startsAt?: Date; endsAt?: Date | null; months?: number; reason?: string }) {
  const now = new Date();
  const startsAt = input.startsAt ?? now;
  const endsAt = input.endsAt ?? (input.months ? addBillingMonthPreservingAnchor(startsAt, input.months) : null);
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) throw new BillingServiceError("La fecha final debe ser posterior al inicio.", 400);
  const result = await prisma.$transaction(async (tx) => {
    const commerce = await tx.commerce.findUniqueOrThrow({ where: { id: input.commerceId }, select: { ownerUserId: true } });
    const subscription = await tx.billingSubscription.findUnique({ where: { commerceId: input.commerceId } });
    if (subscription?.provider && subscription.status === BillingSubscriptionStatus.ACTIVE) throw new BillingServiceError("No se puede bonificar mientras una recurrencia externa permanezca activa.", 409);
    const grant = await tx.billingCoverageGrant.create({ data: { commerceId: input.commerceId, source: BillingCoverageSource.COMPLIMENTARY, startsAt, endsAt, reason: input.reason ?? null, createdByUserId: input.actorUserId } });
    await refreshCommerceBillingProjection(tx, input.commerceId);
    await tx.adminActionLog.create({ data: { adminUserId: input.actorUserId, action: "COMPLIMENTARY_GRANTED", targetType: "BILLING_COVERAGE_GRANT", targetId: grant.id, commerceId: input.commerceId, metadata: JSON.stringify({ startsAt, endsAt }) } });
    return { grant, ownerUserId: commerce.ownerUserId };
  });
  await createAppNotification({ userId: result.ownerUserId, type: "BILLING_COMPLIMENTARY_GRANTED", title: "Cobertura bonificada", body: "Tu comercio recibió una bonificación de suscripción.", data: { commerceId: input.commerceId, billingGrantId: result.grant.id } });
  return result.grant;
}

export async function revokeComplimentaryCoverage(input: { actorUserId: number; commerceId: number; grantId: number }) {
  return prisma.$transaction(async (tx) => {
    const grant = await tx.billingCoverageGrant.findFirst({ where: { id: input.grantId, commerceId: input.commerceId, source: BillingCoverageSource.COMPLIMENTARY, revokedAt: null } });
    if (!grant) throw new BillingServiceError("Bonificación activa no encontrada.", 404);
    const revoked = await tx.billingCoverageGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date(), revokedByUserId: input.actorUserId } });
    await refreshCommerceBillingProjection(tx, input.commerceId);
    await tx.adminActionLog.create({ data: { adminUserId: input.actorUserId, action: "COMPLIMENTARY_REVOKED", targetType: "BILLING_COVERAGE_GRANT", targetId: grant.id, commerceId: input.commerceId } });
    return revoked;
  });
}

export async function reverseManualPayment(input: { actorUserId: number; commerceId: number; paymentId: number; note?: string }) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.billingPayment.findFirst({ where: { id: input.paymentId, commerceId: input.commerceId, source: BillingPaymentSource.MANUAL, status: BillingPaymentStatus.APPROVED } });
    if (!payment) throw new BillingServiceError("Pago manual aprobado no encontrado.", 404);
    const alreadyReversed = await tx.billingPayment.findFirst({ where: { reversedPaymentId: payment.id } });
    if (alreadyReversed) return alreadyReversed;
    const reversal = await tx.billingPayment.create({ data: { commerceId: payment.commerceId, subscriptionId: payment.subscriptionId, source: BillingPaymentSource.MANUAL, status: BillingPaymentStatus.REVERSED, amount: payment.amount, currency: payment.currency, periodStart: payment.periodStart, periodEnd: payment.periodEnd, note: input.note ?? "Reversión administrativa", registeredByUserId: input.actorUserId, reversedPaymentId: payment.id } });
    await refreshCommerceBillingProjection(tx, input.commerceId);
    await tx.adminActionLog.create({ data: { adminUserId: input.actorUserId, action: "MANUAL_PAYMENT_REVERSED", targetType: "BILLING_PAYMENT", targetId: reversal.id, commerceId: input.commerceId, metadata: JSON.stringify({ reversedPaymentId: payment.id }) } });
    return reversal;
  });
}

export async function listBillingSubscriptions() {
  return prisma.commerce.findMany({ where: { status: CommerceStatus.APPROVED }, select: { id: true, name: true, slug: true, billingAccessState: true, billingCoverageUntil: true, billingSubscription: { select: { status: true, currentPeriodEnd: true, graceEndsAt: true, cancelAtPeriodEnd: true } } }, orderBy: { id: "asc" } });
}

export async function getAdminBillingSubscription(commerceId: number) {
  const summary = await getCommerceBillingSummary(commerceId);
  const [subscription, payments, grants] = await Promise.all([
    prisma.billingSubscription.findUnique({ where: { commerceId } }),
    prisma.billingPayment.findMany({ where: { commerceId }, orderBy: { createdAt: "desc" } }),
    prisma.billingCoverageGrant.findMany({ where: { commerceId }, orderBy: { createdAt: "desc" } }),
  ]);
  return { summary, subscription, payments, grants };
}

export async function markPaymentFailed(commerceId: number, failedAt = new Date()) {
  return prisma.$transaction(async (tx) => {
    const subscription = await ensureBillingSubscription(tx, commerceId);
    const graceEndsAt = new Date(failedAt.getTime() + BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000);
    await tx.billingSubscription.update({ where: { id: subscription.id }, data: { status: BillingSubscriptionStatus.PAST_DUE, paymentFailedAt: failedAt, graceEndsAt } });
    return refreshCommerceBillingProjection(tx, commerceId, failedAt);
  });
}

export async function recoverPayment(commerceId: number, periodStart: Date, periodEnd: Date, anchorDay = dateParts(periodStart).day) {
  return prisma.$transaction(async (tx) => {
    const subscription = await ensureBillingSubscription(tx, commerceId);
    await tx.billingSubscription.update({ where: { id: subscription.id }, data: { status: BillingSubscriptionStatus.ACTIVE, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, anchorDay, paymentFailedAt: null, graceEndsAt: null } });
    return refreshCommerceBillingProjection(tx, commerceId);
  });
}

export async function requestCancellationAtPeriodEnd(commerceId: number, requestedAt = new Date()) {
  return prisma.$transaction(async (tx) => {
    const subscription = await ensureBillingSubscription(tx, commerceId);
    if (!subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() <= requestedAt.getTime()) {
      throw new BillingServiceError("No existe un período activo para cancelar al finalizar.", 409);
    }
    await tx.billingSubscription.update({ where: { id: subscription.id }, data: { cancelAtPeriodEnd: true, cancelRequestedAt: requestedAt } });
    return refreshCommerceBillingProjection(tx, commerceId, requestedAt);
  });
}

export async function expireBillingCoverage(now = new Date()) {
  const graceExpirations = await prisma.billingSubscription.findMany({
    where: { status: BillingSubscriptionStatus.PAST_DUE, graceEndsAt: { lte: now } },
    select: { commerceId: true, commerce: { select: { ownerUserId: true } } },
  });
  await prisma.$transaction(async (tx) => {
    await tx.billingSubscription.updateMany({
      where: { status: BillingSubscriptionStatus.PAST_DUE, graceEndsAt: { lte: now } },
      data: { status: BillingSubscriptionStatus.SUSPENDED },
    });
    await tx.billingSubscription.updateMany({
      where: { cancelAtPeriodEnd: true, currentPeriodEnd: { lte: now }, status: { in: [BillingSubscriptionStatus.ACTIVE, BillingSubscriptionStatus.PAST_DUE] } },
      data: { status: BillingSubscriptionStatus.CANCELLED, cancelledAt: now },
    });
  });
  await refreshAllCommerceBillingProjections(now);
  await Promise.all(graceExpirations.map((entry) => createAppNotification({
    userId: entry.commerce.ownerUserId,
    type: "BILLING_SUSPENDED",
    title: "Suscripción suspendida",
    body: "La ventana de regularización terminó y tus promociones ya no están visibles públicamente.",
    data: { commerceId: entry.commerceId, reason: "grace_expired" },
  })));
  return graceExpirations.length;
}

let billingMaintenanceTimer: NodeJS.Timeout | null = null;

/** The resolver is safe on every request; this loop only materializes public
 * visibility and produces deterministic suspension transitions after restarts. */
export function startBillingMaintenanceLoop() {
  if (billingMaintenanceTimer) return;
  billingMaintenanceTimer = setInterval(() => {
    void expireBillingCoverage().catch(() => undefined);
  }, 15 * 60 * 1000);
  billingMaintenanceTimer.unref();
  void expireBillingCoverage().catch(() => undefined);
}

export function stopBillingMaintenanceLoop() {
  if (!billingMaintenanceTimer) return;
  clearInterval(billingMaintenanceTimer);
  billingMaintenanceTimer = null;
}
