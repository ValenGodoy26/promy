const bcrypt = require("bcrypt");
const prisma = require("../dist/config/prisma").default;
const {
  assert,
  createWebClient,
  loginWeb,
} = require("./qa-http-client");
const { assertCurrentTestDatabase } = require("./qa-database-guard");
const {
  expireBillingCoverage,
  getCommerceBillingSummary,
  registerManualPayment,
  grantComplimentaryCoverage,
  revokeComplimentaryCoverage,
  updateBillingSettings,
} = require("../dist/modules/billing/billing.service");

const stamp = `${Date.now()}-${process.pid}`;
const PASSWORD = "BillingSmoke123!";

async function main() {
  await assertCurrentTestDatabase(prisma, "Billing domain");
  const [city, category, admin] = await Promise.all([
    prisma.city.findFirst({ where: { isActive: true } }),
    prisma.category.findFirst({ where: { isActive: true } }),
    prisma.user.findUnique({ where: { email: "admin@promy.com" } }),
  ]);
  assert(city && category && admin, "Faltan fixtures demo para Billing");
  const originalSettings = await prisma.billingSettings.findUnique({ where: { id: 1 } });
  const originalRole = admin.role;
  let owner;
  let commerce;
  try {
    await prisma.user.update({ where: { id: admin.id }, data: { role: "SUPER_ADMIN" } });
    owner = await prisma.user.create({ data: { fullName: `Billing owner ${stamp}`, email: `billing-owner-${stamp}@promy.test`, passwordHash: await bcrypt.hash(PASSWORD, 8), role: "COMMERCE", status: "ACTIVE", emailVerifiedAt: new Date() } });
    await prisma.$executeRaw`
      INSERT INTO Commerce (ownerUserId, cityId, categoryId, name, slug, address, latitude, longitude, location, status, approvedAt, isFeatured, featuredRank, isHiddenByAdmin, billingAccessState, createdAt, updatedAt)
      VALUES (${owner.id}, ${city.id}, ${category.id}, ${`Billing ${stamp}`}, ${`billing-${stamp}`}, 'QA Billing 123', -31.4, -58.0, ST_SRID(POINT(-58.0, -31.4), 0), 'APPROVED', ${new Date("2026-01-01T12:00:00.000Z")}, false, 0, false, 'COVERED', NOW(), NOW())
    `;
    commerce = await prisma.commerce.findUnique({ where: { ownerUserId: owner.id } });
    assert(commerce, "No se creó Commerce Billing");
    await updateBillingSettings({ actorUserId: admin.id, mode: "ON", billingStartsAt: new Date("2026-02-01T12:00:00.000Z"), monthlyPrice: 1000 });
    await expireBillingCoverage(new Date("2026-03-10T12:00:00.000Z"));
    const suspended = await getCommerceBillingSummary(commerce.id);
    assert(!suspended.hasCoverage && suspended.needsPayment, "Billing ON debe requerir cobertura para un Commerce beta vencido");

    const adminHttp = createWebClient({ forwardedIp: "198.18.72.1" });
    const adminSession = await loginWeb(adminHttp, admin.email, "demo1234");
    const forbiddenAdmin = await adminHttp.request("/admin/billing/settings", { method: "GET", headers: { Authorization: `Bearer ${adminSession.accessToken}` } });
    assert(forbiddenAdmin.status === 200, "SUPER_ADMIN debe leer settings Billing");

    const payment = await registerManualPayment({ actorUserId: admin.id, commerceId: commerce.id, amount: 1000, months: 2, idempotencyKey: `billing-manual-${stamp}` });
    assert(!payment.duplicate, "Primer manual payment no puede ser duplicado");
    const duplicate = await registerManualPayment({ actorUserId: admin.id, commerceId: commerce.id, amount: 1000, months: 2, idempotencyKey: `billing-manual-${stamp}` });
    assert(duplicate.duplicate && duplicate.payment.id === payment.payment.id, "Manual payment debe ser idempotente");
    const covered = await getCommerceBillingSummary(commerce.id);
    assert(covered.hasCoverage && covered.coverageSource === "MANUAL", "Pago manual debe habilitar cobertura");

    const grant = await grantComplimentaryCoverage({ actorUserId: admin.id, commerceId: commerce.id, reason: "QA billing", months: 1 });
    const complementary = await getCommerceBillingSummary(commerce.id);
    assert(complementary.coverageSource === "COMPLIMENTARY", "Bonificación debe tener prioridad determinista");
    await revokeComplimentaryCoverage({ actorUserId: admin.id, commerceId: commerce.id, grantId: grant.id });
    const afterRevoke = await getCommerceBillingSummary(commerce.id);
    assert(afterRevoke.coverageSource === "MANUAL", "Revocar bonificación debe restaurar la siguiente cobertura válida");

    console.log(JSON.stringify({ ok: true, commerceId: commerce.id, paymentId: payment.payment.id, grantId: grant.id, contracts: ["billing-settings", "super-admin", "manual-idempotency", "complimentary-priority", "projection"] }, null, 2));
  } finally {
    if (commerce) await prisma.commerce.delete({ where: { id: commerce.id } }).catch(() => undefined);
    if (owner) await prisma.user.delete({ where: { id: owner.id } }).catch(() => undefined);
    await prisma.user.update({ where: { id: admin.id }, data: { role: originalRole } }).catch(() => undefined);
    if (originalSettings) await prisma.billingSettings.update({ where: { id: 1 }, data: { mode: originalSettings.mode, billingStartsAt: originalSettings.billingStartsAt, monthlyPrice: originalSettings.monthlyPrice, currency: originalSettings.currency } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exit(1); });
