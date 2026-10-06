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

export const ADMIN_BILLING_SUBSCRIPTION_FILTERS = ["ALL", "BETA", "ACTIVE", "PENDING_PAYMENT", "PAST_DUE", "SUSPENDED", "COMPLIMENTARY", "CANCELLED"] as const;
export type AdminBillingSubscriptionFilter = typeof ADMIN_BILLING_SUBSCRIPTION_FILTERS[number];

type AdminBillingCommerceSnapshot = {
  id: number;
  name: string;
  status: CommerceStatus;
  approvedAt: Date | null;
  billingSubscription: {
    status: BillingSubscriptionStatus;
    provider: string | null;
    providerSubscriptionId: string | null;
    providerExternalReference: string | null;
    providerStatus: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    graceEndsAt: Date | null;
    cancelAtPeriodEnd: boolean;
    cancelRequestedAt: Date | null;
    cancelledAt: Date | null;
    updatedAt: Date;
  } | null;
  billingPayments: Array<{ source: BillingPaymentSource; status: BillingPaymentStatus; periodStart: Date; periodEnd: Date; reversalOf: { id: number } | null }>;
  billingCoverageGrants: Array<{ id: number; source: BillingCoverageSource; startsAt: Date; endsAt: Date | null; reason: string | null; revokedAt: Date | null; activeKey: string | null }>;
};

const adminBillingCommerceSelect = {
  id: true,
  name: true,
  status: true,
  approvedAt: true,
  owner: { select: { email: true } },
  billingSubscription: { select: {
    status: true, provider: true, providerSubscriptionId: true, providerExternalReference: true, providerStatus: true,
    currentPeriodStart: true, currentPeriodEnd: true, graceEndsAt: true, cancelAtPeriodEnd: true,
    cancelRequestedAt: true, cancelledAt: true, updatedAt: true,
  } },
  billingPayments: { select: { source: true, status: true, periodStart: true, periodEnd: true, reversalOf: { select: { id: true } } } },
  billingCoverageGrants: { select: { id: true, source: true, startsAt: true, endsAt: true, reason: true, revokedAt: true, activeKey: true } },
} satisfies Prisma.CommerceSelect;

function readOnlyBillingSettings(settings: { mode: BillingMode; billingStartsAt: Date | null; monthlyPrice: Prisma.Decimal | null; currency: string } | null) {
  return settings ?? { mode: BillingMode.OFF, billingStartsAt: null, monthlyPrice: null, currency: "ARS" };
}

function resolveSnapshotCoverage(commerce: AdminBillingCommerceSnapshot, settings: { mode: BillingMode; billingStartsAt: Date | null }) {
  return resolveBillingCoverage({
    settings,
    commerce: { status: commerce.status, approvedAt: commerce.approvedAt },
    subscription: commerce.billingSubscription ? {
      status: commerce.billingSubscription.status,
      currentPeriodStart: commerce.billingSubscription.currentPeriodStart,
      currentPeriodEnd: commerce.billingSubscription.currentPeriodEnd,
      paymentFailedAt: null,
      graceEndsAt: commerce.billingSubscription.graceEndsAt,
      cancelAtPeriodEnd: commerce.billingSubscription.cancelAtPeriodEnd,
    } : null,
    payments: commerce.billingPayments.map((payment) => ({ ...payment, reversed: Boolean(payment.reversalOf) })),
    grants: commerce.billingCoverageGrants,
  });
}

function toAdminBillingSubscription(commerce: AdminBillingCommerceSnapshot, settings: { mode: BillingMode; billingStartsAt: Date | null }) {
  const coverage = resolveSnapshotCoverage(commerce, settings);
  const subscription = commerce.billingSubscription;
  const status = coverage.hasCoverage || !subscription ? coverage.status : subscription.status;
  return {
    commerce: { id: commerce.id, name: commerce.name },
    status,
    hasCoverage: coverage.hasCoverage,
    coverageSource: coverage.source,
    periodStart: coverage.periodStart,
    periodEnd: coverage.periodEnd,
    graceEndsAt: coverage.graceEndsAt,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    provider: subscription?.provider ?? null,
    providerStatus: subscription?.providerStatus ?? null,
    updatedAt: subscription?.updatedAt ?? null,
  };
}

function activeCoverageWhere(now: Date) {
  const grant: Prisma.BillingCoverageGrantWhereInput = { source: BillingCoverageSource.COMPLIMENTARY, revokedAt: null, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
  const manual: Prisma.BillingPaymentWhereInput = { source: BillingPaymentSource.MANUAL, status: BillingPaymentStatus.APPROVED, periodStart: { lte: now }, periodEnd: { gt: now }, reversalOf: { is: null } };
  const provider: Prisma.BillingSubscriptionWhereInput = {
    OR: [
      { status: BillingSubscriptionStatus.ACTIVE, currentPeriodStart: { lte: now }, currentPeriodEnd: { gt: now } },
      { status: BillingSubscriptionStatus.PAST_DUE, graceEndsAt: { gt: now } },
      { status: BillingSubscriptionStatus.PAST_DUE, cancelAtPeriodEnd: true, currentPeriodStart: { lte: now }, currentPeriodEnd: { gt: now } },
    ],
  };
  return {
    grant,
    manual,
    provider,
    withoutOverrides: { NOT: [{ billingCoverageGrants: { some: grant } }, { billingPayments: { some: manual } }] } satisfies Prisma.CommerceWhereInput,
  };
}

function billingFilterWhere(filter: AdminBillingSubscriptionFilter, settings: { mode: BillingMode; billingStartsAt: Date | null }, now: Date): Prisma.CommerceWhereInput {
  if (filter === "ALL") return {};
  const { grant, manual, provider, withoutOverrides } = activeCoverageWhere(now);
  const hasActiveProvider = { billingSubscription: { is: provider } } satisfies Prisma.CommerceWhereInput;
  const noActiveProvider = { NOT: [hasActiveProvider] } satisfies Prisma.CommerceWhereInput;
  const isBetaMode = settings.mode === BillingMode.OFF || (settings.mode === BillingMode.SCHEDULED && (!settings.billingStartsAt || settings.billingStartsAt > now));
  // While global billing is not enforceable, presentation follows the beta
  // policy for every approved commerce. Historical support records remain in
  // the detail/audit trail, but must not make the admin filters contradict the
  // effective coverage shown to Commerce.
  if (isBetaMode) {
    if (filter === "BETA") return { status: CommerceStatus.APPROVED };
    return { id: -1 };
  }
  if (filter === "COMPLIMENTARY") return { billingCoverageGrants: { some: grant } };
  if (filter === "ACTIVE") return { OR: [{ billingCoverageGrants: { some: grant } }, { billingPayments: { some: manual } }, hasActiveProvider] };
  if (filter === "BETA") {
    if (settings.billingStartsAt) {
      const transitionEnd = new Date(settings.billingStartsAt.getTime() + BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000);
      if (now.getTime() < transitionEnd.getTime()) return { AND: [withoutOverrides, noActiveProvider, { approvedAt: { lt: settings.billingStartsAt } }] };
    }
    return { id: -1 };
  }
  if (filter === "PENDING_PAYMENT") {
    if (isBetaMode) return { id: -1 };
    return { AND: [withoutOverrides, noActiveProvider, { OR: [{ billingSubscription: { is: null } }, { billingSubscription: { is: { status: BillingSubscriptionStatus.PENDING_PAYMENT } } }] }] };
  }
  if (filter === "PAST_DUE") {
    return isBetaMode
      ? { AND: [withoutOverrides, hasActiveProvider, { billingSubscription: { is: { status: BillingSubscriptionStatus.PAST_DUE } } }] }
      : { AND: [withoutOverrides, { billingSubscription: { is: { status: BillingSubscriptionStatus.PAST_DUE } } }] };
  }
  const status = filter === "SUSPENDED" ? BillingSubscriptionStatus.SUSPENDED : BillingSubscriptionStatus.CANCELLED;
  return { AND: [withoutOverrides, noActiveProvider, { billingSubscription: { is: { status } } }] };
}

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

  // Billing OFF (and the pre-start scheduled period) is intentionally the
  // public beta policy. Support records remain historically valid, but do not
  // replace that presentation until billing becomes enforceable.
  if (settings.mode === BillingMode.OFF || (settings.mode === BillingMode.SCHEDULED && (!settings.billingStartsAt || now.getTime() < settings.billingStartsAt.getTime()))) {
    return { hasCoverage: true, source: BillingCoverageSource.BETA_FREE, status: "BETA_FREE", periodStart: null, periodEnd: settings.billingStartsAt, graceEndsAt: null, reason: settings.mode === BillingMode.OFF ? "billing_off" : "billing_scheduled" };
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

export async function registerManualPayment(input: { actorUserId: number; commerceId: number; amount: number; currency?: string; paidAt?: Date; periodStart?: Date; periodEnd?: Date; months?: number; reference?: string; note?: string; idempotencyKey?: string }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new BillingServiceError("El monto debe ser mayor a cero.", 400);
  const currency = (input.currency ?? "ARS").trim().toUpperCase();
  if (currency !== "ARS") throw new BillingServiceError("La moneda de cobertura manual debe ser ARS.", 400);
  const months = Math.trunc(input.months ?? 1);
  if (months < 1 || months > 24) throw new BillingServiceError("Los meses deben estar entre 1 y 24.", 400);
  if (input.periodStart && input.periodEnd && input.periodEnd.getTime() <= input.periodStart.getTime()) throw new BillingServiceError("El período de cobertura es inválido.", 400);
  if (input.periodStart && input.months) throw new BillingServiceError("Usá un período explícito o meses, no ambos.", 400);
  if (!input.idempotencyKey?.trim()) throw new BillingServiceError("Falta la clave de idempotencia del pago manual.", 400);
  let result: { payment: { id: number }; ownerUserId: number; duplicate: boolean };
  try {
    result = await prisma.$transaction(async (tx) => {
    const commerce = await tx.commerce.findUnique({ where: { id: input.commerceId }, select: { id: true, ownerUserId: true } });
    if (!commerce) throw new BillingServiceError("Comercio no encontrado.", 404);
    const existing = await tx.billingPayment.findUnique({ where: { idempotencyKey: input.idempotencyKey!.trim() } });
    if (existing) return { payment: existing, ownerUserId: commerce.ownerUserId, duplicate: true };
    const subscription = await tx.billingSubscription.findUnique({ where: { commerceId: input.commerceId } });
    if (subscription?.provider && subscription.status === BillingSubscriptionStatus.ACTIVE) throw new BillingServiceError("No se puede registrar un pago manual mientras una recurrencia externa permanezca activa.", 409);
    const coverage = resolveBillingCoverage(await getCoverageInput(tx, input.commerceId));
    const periodStart = input.periodStart ?? (coverage.hasCoverage && coverage.periodEnd && coverage.periodEnd.getTime() > Date.now() ? coverage.periodEnd : new Date());
    const periodEnd = input.periodEnd ?? addBillingMonthPreservingAnchor(periodStart, months, subscription?.anchorDay);
    if (periodEnd.getTime() <= periodStart.getTime()) throw new BillingServiceError("El período de cobertura es inválido.", 400);
    const payment = await tx.billingPayment.create({ data: { commerceId: input.commerceId, subscriptionId: subscription?.id ?? null, source: BillingPaymentSource.MANUAL, status: BillingPaymentStatus.APPROVED, amount: new Prisma.Decimal(input.amount), currency, periodStart, periodEnd, paidAt: input.paidAt ?? new Date(), reference: input.reference?.trim() || null, note: input.note?.trim() || null, idempotencyKey: input.idempotencyKey!.trim(), registeredByUserId: input.actorUserId } });
    const coverageAfter = await refreshCommerceBillingProjection(tx, input.commerceId);
    await tx.adminActionLog.create({ data: { adminUserId: input.actorUserId, action: "MANUAL_PAYMENT_REGISTERED", targetType: "BILLING_PAYMENT", targetId: payment.id, commerceId: input.commerceId, metadata: JSON.stringify({ amount: payment.amount.toString(), currency, periodStart, periodEnd, source: coverageAfter.source, reference: payment.reference }) } });
    return { payment, ownerUserId: commerce.ownerUserId, duplicate: false };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.billingPayment.findUnique({ where: { idempotencyKey: input.idempotencyKey!.trim() }, select: { id: true, commerceId: true, commerce: { select: { ownerUserId: true } } } });
      if (existing && existing.commerceId === input.commerceId) return { payment: { id: existing.id }, ownerUserId: existing.commerce.ownerUserId, duplicate: true };
      if (existing) throw new BillingServiceError("La clave de idempotencia ya pertenece a otra operación.", 409);
    }
    throw error;
  }
  if (!result.duplicate) await createAppNotification({ userId: result.ownerUserId, type: "BILLING_MANUAL_PAYMENT_REGISTERED", title: "Pago registrado", body: "Registramos una cobertura manual para tu comercio.", data: { commerceId: input.commerceId, billingPaymentId: result.payment.id } });
  return result;
}

export async function grantComplimentaryCoverage(input: { actorUserId: number; commerceId: number; startsAt?: Date; endsAt?: Date | null; months?: number; reason: string }) {
  const now = new Date();
  const startsAt = input.startsAt ?? now;
  const endsAt = input.endsAt ?? (input.months ? addBillingMonthPreservingAnchor(startsAt, input.months) : null);
  const reason = input.reason.trim();
  if (!reason) throw new BillingServiceError("Indicá el motivo de la bonificación.", 400);
  if (endsAt && (endsAt.getTime() <= startsAt.getTime() || endsAt.getTime() <= now.getTime())) throw new BillingServiceError("La fecha final debe ser futura.", 400);
  let result: { grant: { id: number }; ownerUserId: number };
  try {
    result = await prisma.$transaction(async (tx) => {
    const commerce = await tx.commerce.findUnique({ where: { id: input.commerceId }, select: { ownerUserId: true } });
    if (!commerce) throw new BillingServiceError("Comercio no encontrado.", 404);
    const subscription = await tx.billingSubscription.findUnique({ where: { commerceId: input.commerceId } });
    if (subscription?.provider && subscription.status === BillingSubscriptionStatus.ACTIVE) throw new BillingServiceError("No se puede bonificar mientras una recurrencia externa permanezca activa.", 409);
    await tx.billingCoverageGrant.updateMany({ where: { commerceId: input.commerceId, source: BillingCoverageSource.COMPLIMENTARY, revokedAt: null, activeKey: { not: null }, endsAt: { lte: now } }, data: { activeKey: null } });
    const activeGrant = await tx.billingCoverageGrant.findFirst({ where: { commerceId: input.commerceId, source: BillingCoverageSource.COMPLIMENTARY, revokedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, select: { id: true } });
    if (activeGrant) throw new BillingServiceError("El comercio ya tiene una bonificación activa.", 409);
    const grant = await tx.billingCoverageGrant.create({ data: { commerceId: input.commerceId, source: BillingCoverageSource.COMPLIMENTARY, startsAt, endsAt, reason, activeKey: `complimentary:${input.commerceId}`, createdByUserId: input.actorUserId } });
    await refreshCommerceBillingProjection(tx, input.commerceId);
    await tx.adminActionLog.create({ data: { adminUserId: input.actorUserId, action: "COMPLIMENTARY_GRANTED", targetType: "BILLING_COVERAGE_GRANT", targetId: grant.id, commerceId: input.commerceId, metadata: JSON.stringify({ startsAt, endsAt, reason }) } });
    return { grant, ownerUserId: commerce.ownerUserId };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new BillingServiceError("El comercio ya tiene una bonificación activa.", 409);
    throw error;
  }
  await createAppNotification({ userId: result.ownerUserId, type: "BILLING_COMPLIMENTARY_GRANTED", title: "Cobertura bonificada", body: "Tu comercio recibió una bonificación de suscripción.", data: { commerceId: input.commerceId, billingGrantId: result.grant.id } });
  return result.grant;
}

export async function revokeComplimentaryCoverage(input: { actorUserId: number; commerceId: number; grantId: number; reason: string }) {
  const reason = input.reason.trim();
  if (!reason) throw new BillingServiceError("Indicá el motivo de finalización.", 400);
  return prisma.$transaction(async (tx) => {
    const grant = await tx.billingCoverageGrant.findFirst({ where: { id: input.grantId, commerceId: input.commerceId, source: BillingCoverageSource.COMPLIMENTARY, revokedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] } });
    if (!grant) throw new BillingServiceError("Bonificación activa no encontrada.", 404);
    const revoked = await tx.billingCoverageGrant.update({ where: { id: grant.id }, data: { revokedAt: new Date(), revokedByUserId: input.actorUserId, revocationReason: reason, activeKey: null } });
    await refreshCommerceBillingProjection(tx, input.commerceId);
    await tx.adminActionLog.create({ data: { adminUserId: input.actorUserId, action: "COMPLIMENTARY_REVOKED", targetType: "BILLING_COVERAGE_GRANT", targetId: grant.id, commerceId: input.commerceId, metadata: JSON.stringify({ reason }) } });
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

export async function listBillingSubscriptions(input: {
  page?: number;
  limit?: number;
  filter?: AdminBillingSubscriptionFilter;
  search?: string;
} = {}) {
  const page = input.page ?? 1;
  const limit = input.limit ?? 25;
  const filter = input.filter ?? "ALL";
  const search = input.search?.trim();
  const searchWhere: Prisma.CommerceWhereInput[] = [];

  if (search) {
    if (/^\d+$/u.test(search)) searchWhere.push({ id: Number(search) });
    else searchWhere.push({ name: { contains: search } }, { owner: { is: { email: { contains: search } } } });
  }

  const settings = readOnlyBillingSettings(await prisma.billingSettings.findUnique({ where: { id: 1 } }));
  const where: Prisma.CommerceWhereInput = {
    status: CommerceStatus.APPROVED,
    AND: [billingFilterWhere(filter, settings, new Date())],
    ...(searchWhere.length ? { OR: searchWhere } : {}),
  };
  const [total, commerces] = await Promise.all([
    prisma.commerce.count({ where }),
    prisma.commerce.findMany({
      where,
      select: adminBillingCommerceSelect,
      orderBy: { id: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  const subscriptions = commerces.map((commerce) => toAdminBillingSubscription(commerce as AdminBillingCommerceSnapshot, settings));

  return { subscriptions, page, limit, total };
}

export async function getAdminBillingSubscription(commerceId: number) {
  const [settingsRecord, commerce, reconciliations] = await Promise.all([
    prisma.billingSettings.findUnique({ where: { id: 1 } }),
    prisma.commerce.findUnique({ where: { id: commerceId }, select: adminBillingCommerceSelect }),
    prisma.billingReconciliationObservation.findMany({
      where: { commerceId },
      orderBy: [{ checkedAt: "desc" }, { id: "desc" }],
      take: 8,
      select: {
        id: true, result: true, mismatchFields: true, localStatus: true, localProviderStatus: true,
        observedStatus: true, observedProviderPlanId: true, providerErrorCode: true, checkedAt: true,
      },
    }),
  ]);
  if (!commerce) throw new BillingServiceError("Comercio no encontrado.", 404);

  const settings = readOnlyBillingSettings(settingsRecord);
  const snapshot = commerce as AdminBillingCommerceSnapshot;
  const summary = toAdminBillingSubscription(snapshot, settings);
  const subscription = snapshot.billingSubscription;
  const now = new Date();
  const activeComplimentary = snapshot.billingCoverageGrants.find((grant) => grant.source === BillingCoverageSource.COMPLIMENTARY && !grant.revokedAt && isActivePeriod(grant.startsAt, grant.endsAt, now));

  return {
    commerce: summary.commerce,
    summary,
    subscription: subscription ? {
      status: subscription.status,
      provider: subscription.provider,
      providerStatus: subscription.providerStatus,
      providerSubscriptionId: subscription.providerSubscriptionId,
      providerExternalReference: subscription.providerExternalReference,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      graceEndsAt: subscription.graceEndsAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelRequestedAt: subscription.cancelRequestedAt,
      cancelledAt: subscription.cancelledAt,
      updatedAt: subscription.updatedAt,
    } : null,
    support: {
      activeComplimentary: activeComplimentary ? {
        id: activeComplimentary.id,
        startsAt: activeComplimentary.startsAt,
        endsAt: activeComplimentary.endsAt,
        reason: activeComplimentary.reason,
      } : null,
    },
    reconciliation: reconciliations.map((observation) => ({
      id: observation.id,
      result: observation.result,
      mismatchFields: parseReconciliationMismatchFields(observation.mismatchFields),
      localStatus: observation.localStatus,
      localProviderStatus: observation.localProviderStatus,
      observedStatus: observation.observedStatus,
      observedProviderPlanId: observation.observedProviderPlanId,
      providerErrorCode: observation.providerErrorCode,
      checkedAt: observation.checkedAt,
    })),
  };
}

function parseReconciliationMismatchFields(value: string | null) {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
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
