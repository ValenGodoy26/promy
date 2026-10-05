const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("billing settings are guarded by SUPER_ADMIN on the backend", () => {
  const routes = fs.readFileSync(path.join(__dirname, "../src/modules/billing/billing.routes.ts"), "utf8");
  assert.match(
    routes,
    /adminBillingRouter\.get\("\/billing\/settings", requireRole\(UserRole\.SUPER_ADMIN\), getAdminBillingSettings\)/u,
  );
});

test("billing subscription reads are guarded by SUPER_ADMIN", () => {
  const routes = fs.readFileSync(path.join(__dirname, "../src/modules/billing/billing.routes.ts"), "utf8");
  assert.match(routes, /adminBillingRouter\.get\("\/subscriptions", requireRole\(UserRole\.SUPER_ADMIN\), getAdminBillingSubscriptions\)/u);
  assert.match(routes, /adminBillingRouter\.get\("\/subscriptions\/:commerceId", requireRole\(UserRole\.SUPER_ADMIN\), getAdminBillingSubscription\)/u);
});

test("billing support actions are guarded by SUPER_ADMIN", () => {
  const routes = fs.readFileSync(path.join(__dirname, "../src/modules/billing/billing.routes.ts"), "utf8");
  assert.match(routes, /adminBillingRouter\.post\("\/billing\/:commerceId\/reconcile", adminWriteLimiter, requireRole\(UserRole\.SUPER_ADMIN\), reconcileAdminBillingSubscription\)/u);
  for (const route of ["complimentary", "revoke-complimentary", "manual-payment"]) {
    assert.match(routes, new RegExp(`adminBillingRouter\\.post\\("\\/billing\\/:commerceId\\/${route}", adminWriteLimiter, requireRole\\(UserRole\\.SUPER_ADMIN\\)`));
  }
});

test("reconciliation is append-only observation, not a silent provider sync", () => {
  const service = fs.readFileSync(path.join(__dirname, "../src/modules/billing/mercado-pago.service.ts"), "utf8");
  assert.match(service, /BillingReconciliationResult\.MISMATCH/u);
  assert.match(service, /billingReconciliationObservation\.create/u);
  assert.match(service, /MERCADO_PAGO_RECONCILIATION_OBSERVED/u);
  assert.doesNotMatch(service, /reconcileMercadoPagoSubscription[\s\S]{0,180}applyMercadoPagoSubscription/u);
});

test("admin subscription read model is paginated and does not return provider secrets", () => {
  const service = fs.readFileSync(path.join(__dirname, "../src/modules/billing/billing.service.ts"), "utf8");
  assert.match(service, /prisma\.commerce\.count\(\{ where \}\)/u);
  assert.match(service, /skip: \(page - 1\) \* limit/u);
  assert.match(service, /take: limit/u);
  assert.match(service, /if \(\/\^\\d\+\$\/u\.test\(search\)\) searchWhere\.push\(\{ id: Number\(search\) \}\);/u);
  assert.match(service, /throw new BillingServiceError\("Comercio no encontrado\."\s*, 404\)/u);
  assert.doesNotMatch(service, /accessToken|cardToken|authorization|webhookSecret/iu);
});

test("manual payments and complimentary grants remain append-only coverage sources", () => {
  const service = fs.readFileSync(path.join(__dirname, "../src/modules/billing/billing.service.ts"), "utf8");
  assert.match(service, /source: BillingPaymentSource\.MANUAL/u);
  assert.match(service, /idempotencyKey: input\.idempotencyKey/u);
  assert.match(service, /source: BillingCoverageSource\.COMPLIMENTARY/u);
  assert.match(service, /revocationReason: reason/u);
  assert.match(service, /activeKey: null/u);
  assert.doesNotMatch(service, /billingCoverageGrant\.delete/u);
});
