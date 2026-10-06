import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  formatBusinessDate,
  getCommercePhoneError,
  getOwnerEditablePromotionStatus,
  serializeBusinessDate,
  validateCommerceProfileForm,
} from "../src/features/commerce/commerceRules.ts";
import { getAvailablePromotionTransitions } from "../src/features/admin/promotionLifecycle.ts";
import { formatBillingDate, formatMoneyARS, getSubscriptionPaymentAction, getSubscriptionPresentation, hasSubscriptionPrice, isBetaSubscriptionAccess, shouldShowSubscriptionActionPanel } from "../src/features/commerce/commerceSubscription.ts";
import { getSubscriptionConfirmation, pollSubscriptionConfirmation, submitSubscriptionEnrollment, SubscriptionPaymentAttempt } from "../src/features/commerce/subscriptionPayment.ts";
import { formatBillingMoney, getBillingModePresentation, getMercadoPagoPlanPresentation, parseMonthlyPrice } from "../src/features/admin/adminBilling.ts";
import { adminBillingSubscriptionFilters, formatAdminBillingDate, getAdminBillingCoverageLabel, getAdminBillingSubscriptionPresentation, truncateOperationalId } from "../src/features/admin/adminBillingSubscriptions.ts";

const commerceContract = JSON.parse(
  readFileSync(new URL("../../contracts/promy-commerce-v1.json", import.meta.url), "utf8"),
);

test("commerce phone policy accepts local and +54 formats and rejects invalid values", () => {
  for (const value of ["", "3454 123456", "3454-123456", "+54 9 3454 123456"]) {
    assert.equal(getCommercePhoneError(value), null, value);
  }

  for (const value of ["abc", "1234567", "+1 202 555 0199", "12345678901234"]) {
    assert.ok(getCommercePhoneError(value), value);
  }
});

test("commerce profile blocks required no-op fields and invalid coordinates", () => {
  const errors = validateCommerceProfileForm({
    name: "",
    address: "",
    phone: "abc",
    cityId: "",
    categoryId: "",
    latitude: "-31.4",
    longitude: "",
  });

  assert.deepEqual(Object.keys(errors).sort(), [
    "address",
    "categoryId",
    "cityId",
    "latitude",
    "longitude",
    "name",
    "phone",
  ]);

  assert.deepEqual(validateCommerceProfileForm({
    name: "Local QA",
    address: "Mitre 123",
    phone: "+54 9 3454 123456",
    cityId: "1",
    categoryId: "1",
    latitude: "-31.3929",
    longitude: "-58.0209",
  }), {});
});

test("web promotion lifecycle helpers match the versioned commerce contract", () => {
  const { promotionLifecycle } = commerceContract;

  for (const status of promotionLifecycle.admin.statuses) {
    assert.deepEqual(
      getAvailablePromotionTransitions(status).sort(),
      [...promotionLifecycle.admin.allowedTransitions[status]].sort(),
      `admin transitions for ${status}`,
    );
    assert.equal(
      getOwnerEditablePromotionStatus(status),
      promotionLifecycle.commerceEditing.ownerEditableStatus[status],
      `owner edit status for ${status}`,
    );
  }
});

test("business dates preserve their calendar day across month and year boundaries", () => {
  assert.equal(serializeBusinessDate("2026-09-12"), "2026-09-12T00:00:00.000Z");
  assert.equal(serializeBusinessDate("2026-12-31"), "2026-12-31T00:00:00.000Z");
  assert.match(formatBusinessDate("2026-09-12T00:00:00.000Z"), /^12\D/);
  assert.match(formatBusinessDate("2026-12-31T00:00:00.000Z"), /^31\D/);
  assert.match(formatBusinessDate("2027-01-01T00:00:00.000Z"), /^01\D/);
});

test("commerce analytics contract keeps measured coverage and unambiguous rates", () => {
  const analytics = commerceContract.promotionAnalytics;
  assert.equal(analytics.commerceStatistics.timezone, "PROMOTION_TIMEZONE");
  assert.equal(analytics.commerceStatistics.nullBeforeCoverage, true);
  assert.equal(analytics.commerceStatistics.rates.finalConversion, "validated/impressions");
});

test("commerce subscription presentation keeps beta and payment states human-readable", () => {
  assert.deepEqual(
    getSubscriptionPresentation({
      billingMode: "OFF",
      coverageSource: "BETA_FREE",
      status: "BETA_FREE",
      hasCoverage: true,
      cancelAtPeriodEnd: false,
      graceEndsAt: null,
    }).label,
    "Beta activa",
  );
  const betaSubscription = {
    billingMode: "OFF",
    coverageSource: "BETA_FREE",
    status: "BETA_FREE",
    hasCoverage: true,
    cancelAtPeriodEnd: false,
    graceEndsAt: null,
  };
  assert.equal(isBetaSubscriptionAccess(betaSubscription), true);
  assert.equal(shouldShowSubscriptionActionPanel(betaSubscription), false);
  assert.equal(shouldShowSubscriptionActionPanel({ ...betaSubscription, billingMode: "ON" }), true);
  assert.equal(
    getSubscriptionPresentation({
      billingMode: "ON",
      coverageSource: "MERCADO_PAGO",
      status: "PAST_DUE",
      hasCoverage: true,
      cancelAtPeriodEnd: false,
      graceEndsAt: "2026-10-10T12:00:00.000Z",
    }).label,
    "Pago pendiente",
  );
  assert.equal(
    getSubscriptionPresentation({
      billingMode: "ON",
      coverageSource: "MERCADO_PAGO",
      status: "ACTIVE",
      hasCoverage: true,
      cancelAtPeriodEnd: true,
      graceEndsAt: null,
    }).label,
    "Cancelación programada",
  );
  for (const [coverageSource, status, label] of [
    ["MERCADO_PAGO", "ACTIVE", "Suscripción activa"],
    ["MERCADO_PAGO", "SUSPENDED", "Suscripción suspendida"],
    ["MERCADO_PAGO", "CANCELLED", "Suscripción cancelada"],
    ["COMPLIMENTARY", "ACTIVE", "Acceso bonificado"],
    ["MANUAL", "ACTIVE", "Cobertura registrada"],
  ]) {
    assert.equal(
      getSubscriptionPresentation({
        billingMode: "ON",
        coverageSource,
        status,
        hasCoverage: status === "ACTIVE",
        cancelAtPeriodEnd: false,
        graceEndsAt: null,
      }).label,
      label,
    );
  }
  assert.equal(formatMoneyARS("1000", "ARS"), "$ 1.000");
  assert.match(formatBillingDate("2026-12-31T12:00:00.000Z"), /^31\/12\/2026$/);
});

test("admin billing subscriptions keep beta coverage and cancellation status human", () => {
  const beta = { status: "BETA_FREE", coverageSource: "BETA_FREE", hasCoverage: true, cancelAtPeriodEnd: false };
  assert.equal(getAdminBillingSubscriptionPresentation(beta).statusLabel, "Beta");
  assert.equal(getAdminBillingCoverageLabel(beta), "Acceso completo");
  const cancelled = { status: "ACTIVE", coverageSource: "MERCADO_PAGO", hasCoverage: true, cancelAtPeriodEnd: true };
  assert.equal(getAdminBillingSubscriptionPresentation(cancelled).statusLabel, "Activa");
  assert.equal(getAdminBillingSubscriptionPresentation(cancelled).cancellationLabel, "Cancelación programada");
  assert.equal(getAdminBillingSubscriptionPresentation({ status: "PAST_DUE", coverageSource: "MERCADO_PAGO", cancelAtPeriodEnd: false }).statusLabel, "Pago pendiente");
  assert.equal(getAdminBillingSubscriptionPresentation({ status: "SUSPENDED", coverageSource: null, cancelAtPeriodEnd: false }).statusLabel, "Suspendida");
  assert.equal(getAdminBillingSubscriptionPresentation({ status: "CANCELLED", coverageSource: null, cancelAtPeriodEnd: false }).statusLabel, "Cancelada");
  assert.equal(getAdminBillingSubscriptionPresentation({ status: "ACTIVE", coverageSource: "MANUAL", cancelAtPeriodEnd: false }).statusLabel, "Cobertura registrada");
});

test("admin billing subscription helpers are safe with absent optional values", () => {
  assert.equal(formatAdminBillingDate(null), "No disponible");
  assert.equal(truncateOperationalId(null), "No disponible");
  assert.equal(truncateOperationalId("abcdefghijklmnop"), "abcdef…mnop");
});

test("admin subscription list keeps the SUPER_ADMIN guard, filters, search and detail UI wired", () => {
  const panelSource = readFileSync(new URL("../src/features/admin/AdminPanel.tsx", import.meta.url), "utf8");
  const pageSource = readFileSync(new URL("../src/features/admin/AdminBillingPage.tsx", import.meta.url), "utf8");
  const apiSource = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");
  assert.match(panelSource, /isSuperAdmin \? <AdminBillingPage/u);
  assert.deepEqual(adminBillingSubscriptionFilters.map((filter) => filter.value), ["ALL", "BETA", "ACTIVE", "PENDING_PAYMENT", "PAST_DUE", "SUSPENDED", "COMPLIMENTARY", "CANCELLED"]);
  assert.match(apiSource, /\/admin\/subscriptions\$\{suffix\}/u);
  assert.match(apiSource, /\/admin\/subscriptions\/\$\{commerceId\}/u);
  assert.match(pageSource, /No encontramos suscripciones para este criterio/u);
  assert.match(pageSource, /Reintentar/u);
  assert.match(pageSource, /Ver detalle/u);
});

test("super admin support actions use human copy, guarded endpoints and no technical payment details", () => {
  const pageSource = readFileSync(new URL("../src/features/admin/AdminBillingPage.tsx", import.meta.url), "utf8");
  const apiSource = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");
  assert.match(pageSource, /Acciones de soporte/u);
  assert.match(pageSource, /Otorgar acceso bonificado/u);
  assert.match(pageSource, /Finalizar bonificación/u);
  assert.match(pageSource, /Registrar pago manual/u);
  assert.match(pageSource, /Estado local y Mercado Pago/u);
  assert.match(pageSource, /No cambia la suscripción local ni inicia cobros/u);
  assert.match(apiSource, /\/admin\/billing\/\$\{commerceId\}\/reconcile/u);
  assert.match(pageSource, /Sin fecha de finalización/u);
  assert.match(pageSource, /submitting \? "Guardando\.\.\."/u);
  assert.doesNotMatch(pageSource, /window\.confirm|APP_USR-|MERCADO_PAGO_ACCESS_TOKEN|Authorization|cardToken/u);
  assert.match(apiSource, /\/admin\/billing\/\$\{commerceId\}\/complimentary/u);
  assert.match(apiSource, /\/admin\/billing\/\$\{commerceId\}\/revoke-complimentary/u);
  assert.match(apiSource, /\/admin\/billing\/\$\{commerceId\}\/manual-payment/u);
});

function subscriptionForPayment(overrides = {}) {
  return {
    billingMode: "ON",
    monthlyPrice: "1000",
    currency: "ARS",
    status: "PENDING_PAYMENT",
    hasCoverage: false,
    coverageSource: null,
    periodStart: null,
    periodEnd: null,
    graceEndsAt: null,
    cancelAtPeriodEnd: false,
    canCreatePromotion: false,
    canPublishPromotion: false,
    canValidateExistingRedemption: true,
    needsPayment: true,
    ...overrides,
  };
}

test("subscription payment actions stay off during beta and use the real billing state", () => {
  const beta = subscriptionForPayment({ billingMode: "OFF", status: "BETA_FREE", coverageSource: "BETA_FREE", hasCoverage: true, needsPayment: false });
  assert.equal(getSubscriptionPaymentAction(beta), null);

  assert.equal(getSubscriptionPaymentAction(subscriptionForPayment())?.label, "Activar suscripción");
  assert.equal(getSubscriptionPaymentAction(subscriptionForPayment({ status: "PAST_DUE", hasCoverage: true, needsPayment: false }))?.label, "Regularizar pago");
  assert.equal(getSubscriptionPaymentAction(subscriptionForPayment({ status: "SUSPENDED" }))?.label, "Regularizar pago");
  assert.equal(hasSubscriptionPrice(subscriptionForPayment()), true);
  assert.equal(hasSubscriptionPrice(subscriptionForPayment({ monthlyPrice: null })), false);
});

test("subscription enrollment never submits without a token or more than once per attempt", async () => {
  let enrollCalls = 0;
  const missingTokenAttempt = new SubscriptionPaymentAttempt();
  missingTokenAttempt.markReady();
  const missingToken = await submitSubscriptionEnrollment({
    attempt: missingTokenAttempt,
    tokenize: async () => null,
    enroll: async () => { enrollCalls += 1; },
  });
  assert.equal(missingToken.outcome, "tokenization_error");
  assert.equal(enrollCalls, 0);

  const attempt = new SubscriptionPaymentAttempt();
  attempt.markReady();
  const accepted = await submitSubscriptionEnrollment({
    attempt,
    tokenize: async () => "token-only-in-memory",
    enroll: async () => { enrollCalls += 1; },
  });
  const repeated = await submitSubscriptionEnrollment({
    attempt,
    tokenize: async () => "another-token",
    enroll: async () => { enrollCalls += 1; },
  });
  assert.equal(accepted.outcome, "accepted");
  assert.equal(repeated.outcome, "blocked");
  assert.equal(enrollCalls, 1);
});

test("subscription enrollment treats network uncertainty as status-only confirmation and polls without false success", async () => {
  const ambiguousAttempt = new SubscriptionPaymentAttempt();
  ambiguousAttempt.markReady();
  const ambiguous = await submitSubscriptionEnrollment({
    attempt: ambiguousAttempt,
    tokenize: async () => "token-only-in-memory",
    enroll: async () => { throw { kind: "network" }; },
  });
  assert.equal(ambiguous.outcome, "ambiguous");

  const pending = subscriptionForPayment();
  const active = subscriptionForPayment({ status: "ACTIVE", hasCoverage: true, needsPayment: false, coverageSource: "MERCADO_PAGO" });
  let reads = 0;
  const confirmed = await pollSubscriptionConfirmation(async () => {
    reads += 1;
    return reads === 1 ? pending : active;
  }, { attempts: 4, delay: async () => undefined });
  assert.equal(reads, 2);
  assert.equal(getSubscriptionConfirmation(pending).state, "pending");
  assert.equal(getSubscriptionConfirmation(confirmed).state, "success");
});

test("subscription payment source never persists payment tokens or exposes provider diagnostics", () => {
  const source = readFileSync(new URL("../src/features/commerce/SubscriptionPaymentDialog.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|sessionStorage|console\.log|providerCode|causeCodes|Authorization/);
  assert.match(source, /No pudimos completar la activación/);
});

test("super admin billing presentation is safe, human-readable and validates prices before writes", () => {
  assert.equal(getBillingModePresentation("OFF").label, "Desactivado");
  assert.match(getBillingModePresentation("OFF").description, /no se realizan cobros/i);
  assert.equal(formatBillingMoney("1000", "ARS"), "$ 1.000");
  assert.equal(formatBillingMoney(null, "ARS"), "No configurado");
  assert.equal(parseMonthlyPrice("1000").value, 1000);
  assert.ok(parseMonthlyPrice("-1").error);
  assert.ok(parseMonthlyPrice("NaN").error);
  assert.equal(getMercadoPagoPlanPresentation({ mercadoPagoPlanId: "09503fb65eff4a37a1c26314ef65e593" }).planId, "09503f…e593");
});

test("billing configuration is super-admin only and uses the existing global settings contract", () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const panelSource = readFileSync(new URL("../src/features/admin/AdminPanel.tsx", import.meta.url), "utf8");
  const apiSource = readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8");
  const pageSource = readFileSync(new URL("../src/features/admin/AdminBillingPage.tsx", import.meta.url), "utf8");
  assert.match(appSource, /roles=\{\["ADMIN", "SUPER_ADMIN"\]\}/u);
  assert.match(panelSource, /const isSuperAdmin = session\?\.user\.role === "SUPER_ADMIN"/u);
  assert.match(panelSource, /isSuperAdmin \? <AdminBillingPage/u);
  assert.match(apiSource, /"\/admin\/billing\/settings"[\s\S]*method: "PATCH"/u);
  assert.match(pageSource, /setShowActivationConfirm\(true\)/u);
  assert.match(pageSource, /Precio mensual/u);
  assert.match(pageSource, /Fecha efectiva/u);
  assert.match(pageSource, /No pudimos cargar la configuración de Billing/u);
  assert.doesNotMatch(pageSource, /MERCADO_PAGO_ACCESS_TOKEN|APP_USR-|Authorization|webhook secret/u);
});
