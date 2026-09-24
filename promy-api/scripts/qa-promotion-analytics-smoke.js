const prisma = require("../dist/config/prisma").default;
const { assert, createMobileClient, createWebClient, loginMobile, loginWeb } = require("./qa-http-client");
const { assertCurrentTestDatabase } = require("./qa-database-guard");
const { cleanupExpiredPromotionAnalyticsReceipts } = require("../dist/modules/analytics/analytics.service");

const stamp = `${Date.now()}-${process.pid}`;
const sessionId = `123e4567-e89b-42d3-a456-${stamp.replace(/\D/g, "").slice(-12).padStart(12, "0")}`;

async function requestAnalytics(client, token, events) {
  return client.request("/analytics/promotion-events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId, events }),
  });
}

async function main() {
  await assertCurrentTestDatabase(prisma, "Promotion analytics smoke");
  const [commerce, clientUser] = await Promise.all([
    prisma.commerce.findFirst({ where: { owner: { email: "comercio@promy.com" } }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: "cliente@promy.com" }, select: { id: true } }),
  ]);
  assert(commerce && clientUser, "Analytics smoke baseline missing");
  let promotionId = null;
  try {
    const promotion = await prisma.promotion.create({
      data: {
        commerceId: commerce.id,
        title: `Analytics smoke ${stamp}`,
        description: "Promoción temporal para validar analytics.",
        promotionType: "BENEFIT",
        validationMethod: "QR",
        status: "APPROVED_VISIBLE",
      },
    });
    promotionId = promotion.id;
    const mobile = createMobileClient();
    const web = createWebClient();
    const clientSession = await loginMobile(mobile, "cliente@promy.com", "demo1234");
    const commerceSession = await loginWeb(web, "comercio@promy.com", "demo1234");
    const adminSession = await loginWeb(web, "admin@promy.com", "demo1234");
    const event = { promotionId, type: "IMPRESSION" };
    const unauthenticated = await mobile.request("/analytics/promotion-events", { method: "POST", body: JSON.stringify({ sessionId, events: [event] }) });
    assert(unauthenticated.status === 401, "Analytics requires a CLIENT session");
    const commerceRejected = await requestAnalytics(web, commerceSession.accessToken, [event]);
    assert(commerceRejected.status === 403, "Commerce must not ingest CLIENT analytics");
    const adminRejected = await requestAnalytics(web, adminSession.accessToken, [event]);
    assert(adminRejected.status === 403, "Admin must not ingest CLIENT analytics");
    const malformed = await mobile.request("/analytics/promotion-events", { method: "POST", headers: { Authorization: `Bearer ${clientSession.accessToken}` }, body: JSON.stringify({ sessionId, events: [] }) });
    assert(malformed.status === 400, "Analytics payload validation must reject empty batches");
    const [first, second] = await Promise.all([
      requestAnalytics(mobile, clientSession.accessToken, [event]),
      requestAnalytics(mobile, clientSession.accessToken, [event]),
    ]);
    assert(first.status === 204 && second.status === 204, "Concurrent analytics payloads must be accepted silently");
    const open = await requestAnalytics(mobile, clientSession.accessToken, [{ promotionId, type: "OPEN" }]);
    assert(open.status === 204, "Open analytics event failed");
    const duplicateOpen = await requestAnalytics(mobile, clientSession.accessToken, [{ promotionId, type: "OPEN" }]);
    assert(duplicateOpen.status === 204, "Duplicate analytics event must remain opaque");

    const persistedDaily = await prisma.promotionAnalyticsDaily.findFirst({ where: { promotionId } });
    assert(persistedDaily?.impressions === 1 && persistedDaily?.opens === 1, "Concurrent receipt claim must increment each analytics type exactly once");
    const receipts = await prisma.promotionAnalyticsReceipt.findMany({ where: { promotionId } });
    assert(receipts.length === 2, "Analytics must persist one opaque receipt per event type");
    assert(receipts.every((receipt) => receipt.dedupeKey !== sessionId && receipt.dedupeKey.length === 64), "Raw analytics sessionId leaked to DB");
    await prisma.promotionAnalyticsReceipt.create({ data: { dedupeKey: `a${stamp}`.padEnd(64, "0"), promotionId, eventType: "OPEN", expiresAt: new Date(Date.now() - 1_000) } });
    await cleanupExpiredPromotionAnalyticsReceipts();
    assert((await prisma.promotionAnalyticsReceipt.count({ where: { dedupeKey: `a${stamp}`.padEnd(64, "0") } })) === 0, "Expired analytics receipts must be removed idempotently");

    const createRedemption = await mobile.request("/redemptions", { method: "POST", headers: { Authorization: `Bearer ${clientSession.accessToken}` }, body: JSON.stringify({ promotionId }) });
    assert(createRedemption.status === 201, `Analytics smoke redemption failed: ${JSON.stringify(createRedemption.data)}`);
    const beforeValidation = await web.request("/commerce/statistics?range=today", { headers: { Authorization: `Bearer ${commerceSession.accessToken}` } });
    assert(beforeValidation.ok, "Commerce statistics should be owner-scoped");
    const rowBefore = beforeValidation.data.statistics.promotions.find((item) => item.promotionId === promotionId);
    assert(rowBefore?.impressions === 1 && rowBefore?.opens === 1 && rowBefore?.generated === 1 && rowBefore?.validated === 0, "Commerce stats before validation mismatch");
    const validate = await web.request("/commerce/redemptions/validate", { method: "POST", headers: { Authorization: `Bearer ${commerceSession.accessToken}` }, body: JSON.stringify({ validationCode: createRedemption.data.redemption.validationCode }) });
    assert(validate.ok, `Analytics smoke validation failed: ${JSON.stringify(validate.data)}`);
    const afterValidation = await web.request("/commerce/statistics?range=today", { headers: { Authorization: `Bearer ${commerceSession.accessToken}` } });
    const rowAfter = afterValidation.data.statistics.promotions.find((item) => item.promotionId === promotionId);
    assert(rowAfter?.validated === 1, "Validated redemptions must use the real redeemedAt transition");
    console.log(JSON.stringify({ smoke: "promotion-analytics", impressions: 1, opens: 1, generated: 1, validated: 1, concurrency: "PASS", privacy: "PASS", status: "PASS" }));
  } finally {
    if (promotionId) {
      await prisma.promotionAnalyticsReceipt.deleteMany({ where: { promotionId } });
      await prisma.promotionAnalyticsDaily.deleteMany({ where: { promotionId } });
      await prisma.redemption.deleteMany({ where: { promotionId } });
      await prisma.promotion.deleteMany({ where: { id: promotionId } });
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
