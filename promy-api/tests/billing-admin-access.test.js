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
