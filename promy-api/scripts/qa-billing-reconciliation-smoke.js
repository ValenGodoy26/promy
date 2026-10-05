const bcrypt = require("bcrypt");
const prisma = require("../dist/config/prisma").default;
const { assert, createWebClient, loginWeb } = require("./qa-http-client");
const { assertCurrentTestDatabase } = require("./qa-database-guard");
const { getCommerceBillingSummary, updateBillingSettings } = require("../dist/modules/billing/billing.service");

const stamp = `${Date.now()}-${process.pid}`;
const PASSWORD = "BillingReconciliation123!";
const start = new Date("2026-02-01T12:00:00.000Z");
const end = new Date("2026-03-01T12:00:00.000Z");

async function main() {
  await assertCurrentTestDatabase(prisma, "Billing reconciliation");
  const [city, category, admin] = await Promise.all([
    prisma.city.findFirst({ where: { isActive: true } }),
    prisma.category.findFirst({ where: { isActive: true } }),
    prisma.user.findUnique({ where: { email: "admin@promy.com" } }),
  ]);
  assert(city && category && admin, "Faltan fixtures demo para conciliación Billing");
  const originalSettings = await prisma.billingSettings.findUnique({ where: { id: 1 } });
  const originalRole = admin.role;
  let owner; let commerce;
  try {
    await prisma.user.update({ where: { id: admin.id }, data: { role: "SUPER_ADMIN" } });
    owner = await prisma.user.create({ data: { fullName: `Reconciliation owner ${stamp}`, email: `reconciliation-owner-${stamp}@promy.test`, passwordHash: await bcrypt.hash(PASSWORD, 8), role: "COMMERCE", status: "ACTIVE", emailVerifiedAt: new Date() } });
    await prisma.$executeRaw`
      INSERT INTO Commerce (ownerUserId, cityId, categoryId, name, slug, address, latitude, longitude, location, status, approvedAt, isFeatured, featuredRank, isHiddenByAdmin, billingAccessState, createdAt, updatedAt)
      VALUES (${owner.id}, ${city.id}, ${category.id}, ${`Reconciliation ${stamp}`}, ${`reconciliation-${stamp}`}, 'QA Reconciliation 123', -31.4, -58.0, ST_SRID(POINT(-58.0, -31.4), 0), 'APPROVED', ${new Date("2026-01-01T12:00:00.000Z")}, false, 0, false, 'COVERED', NOW(), NOW())
    `;
    commerce = await prisma.commerce.findUniqueOrThrow({ where: { ownerUserId: owner.id } });
    await updateBillingSettings({ actorUserId: admin.id, mode: "OFF", billingStartsAt: null, monthlyPrice: 1000 });

    const reference = `reconciliation-reference-${stamp}`;
    await prisma.billingSubscription.create({ data: {
      commerceId: commerce.id, status: "ACTIVE", provider: "mercado_pago",
      providerSubscriptionId: `fixture:match:${reference}`, providerPlanId: "plan_fixture",
      providerStatus: "authorized", providerExternalReference: reference,
      currentPeriodStart: start, currentPeriodEnd: end,
    } });

    const http = createWebClient({ forwardedIp: "198.18.73.1" });
    await prisma.user.update({ where: { id: admin.id }, data: { role: originalRole } });
    const adminSession = await loginWeb(http, admin.email, "demo1234");
    const forbidden = await http.request(`/admin/billing/${commerce.id}/reconcile`, { method: "POST", headers: { Authorization: `Bearer ${adminSession.accessToken}` } });
    assert(forbidden.status === 403, "ADMIN no debe consultar conciliación Billing");
    await prisma.user.update({ where: { id: admin.id }, data: { role: "SUPER_ADMIN" } });
    const restoredSuperAdminSession = await loginWeb(http, admin.email, "demo1234");

    const before = await prisma.billingSubscription.findUniqueOrThrow({ where: { commerceId: commerce.id } });
    const match = await http.request(`/admin/billing/${commerce.id}/reconcile`, { method: "POST", headers: { Authorization: `Bearer ${restoredSuperAdminSession.accessToken}` } });
    assert(match.status === 200 && match.data?.reconciliation?.result === "MATCH", "SUPER_ADMIN debe poder registrar una coincidencia remota");
    const afterMatch = await prisma.billingSubscription.findUniqueOrThrow({ where: { commerceId: commerce.id } });
    assert(afterMatch.status === before.status && afterMatch.providerStatus === before.providerStatus && afterMatch.currentPeriodEnd?.getTime() === before.currentPeriodEnd?.getTime(), "La conciliación coincidente no debe mutar el estado local");

    await prisma.billingSubscription.update({ where: { id: before.id }, data: { providerSubscriptionId: `fixture:mismatch:${reference}` } });
    const mismatch = await http.request(`/admin/billing/${commerce.id}/reconcile`, { method: "POST", headers: { Authorization: `Bearer ${restoredSuperAdminSession.accessToken}` } });
    assert(mismatch.status === 200 && mismatch.data?.reconciliation?.result === "MISMATCH", "Debe señalar diferencias remotas sin sincronizarlas");
    const afterMismatch = await prisma.billingSubscription.findUniqueOrThrow({ where: { commerceId: commerce.id } });
    assert(afterMismatch.status === "ACTIVE" && afterMismatch.providerStatus === "authorized", "Una diferencia remota no debe cambiar silenciosamente la suscripción local");

    await prisma.billingSubscription.update({ where: { id: before.id }, data: { providerSubscriptionId: "fixture:unavailable" } });
    const unavailable = await http.request(`/admin/billing/${commerce.id}/reconcile`, { method: "POST", headers: { Authorization: `Bearer ${restoredSuperAdminSession.accessToken}` } });
    assert(unavailable.status === 200 && unavailable.data?.reconciliation?.result === "UNAVAILABLE", "La indisponibilidad del provider debe quedar registrada sin reintentos de cobro");
    assert((await prisma.billingSubscription.count({ where: { commerceId: commerce.id } })) === 1, "La conciliación no debe iniciar enrollment ni crear suscripciones");
    assert((await prisma.billingReconciliationObservation.count({ where: { commerceId: commerce.id } })) === 3, "Cada consulta explícita debe conservar un historial append-only");
    assert((await prisma.adminActionLog.count({ where: { commerceId: commerce.id, action: "MERCADO_PAGO_RECONCILIATION_OBSERVED" } })) === 3, "Cada consulta de soporte debe dejar auditoría");
    const detail = await http.request(`/admin/subscriptions/${commerce.id}`, { method: "GET", headers: { Authorization: `Bearer ${restoredSuperAdminSession.accessToken}` } });
    assert(detail.status === 200 && detail.data?.subscription?.reconciliation?.length === 3, "El detalle debe mostrar el historial remoto seguro");
    const beta = await getCommerceBillingSummary(commerce.id);
    assert(beta.status === "BETA_FREE" && beta.coverageSource === "BETA_FREE", "Billing OFF debe mantener la proyección Beta durante la conciliación");
    console.log(JSON.stringify({ smoke: "billing-reconciliation", match: "PASS", mismatch: "PASS", providerUnavailable: "PASS", audit: "PASS", noSilentMutation: "PASS", betaOff: "PASS", noEnrollment: "PASS", noRealProvider: "PASS" }));
  } finally {
    if (commerce) await prisma.commerce.delete({ where: { id: commerce.id } }).catch(() => undefined);
    if (owner) await prisma.user.delete({ where: { id: owner.id } }).catch(() => undefined);
    await prisma.user.update({ where: { id: admin.id }, data: { role: originalRole } }).catch(() => undefined);
    if (originalSettings) await prisma.billingSettings.update({ where: { id: 1 }, data: { mode: originalSettings.mode, billingStartsAt: originalSettings.billingStartsAt, monthlyPrice: originalSettings.monthlyPrice, currency: originalSettings.currency, mercadoPagoPlanId: originalSettings.mercadoPagoPlanId } }).catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exit(1); });
