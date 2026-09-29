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

test("admin subscription read model is paginated and does not return provider secrets", () => {
  const service = fs.readFileSync(path.join(__dirname, "../src/modules/billing/billing.service.ts"), "utf8");
  assert.match(service, /prisma\.commerce\.count\(\{ where \}\)/u);
  assert.match(service, /skip: \(page - 1\) \* limit/u);
  assert.match(service, /take: limit/u);
  assert.match(service, /if \(\/\^\\d\+\$\/u\.test\(search\)\) searchWhere\.push\(\{ id: Number\(search\) \}\);/u);
  assert.match(service, /throw new BillingServiceError\("Comercio no encontrado\."\s*, 404\)/u);
  assert.doesNotMatch(service, /accessToken|cardToken|authorization|webhookSecret/iu);
});
