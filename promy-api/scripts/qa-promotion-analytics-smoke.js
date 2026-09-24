const prisma = require("../dist/config/prisma").default;
const { assert, createMobileClient, createWebClient, loginMobile, loginWeb } = require("./qa-http-client");
const { assertCurrentTestDatabase } = require("./qa-database-guard");
const { cleanupExpiredPromotionAnalyticsReceipts } = require("../dist/modules/analytics/analytics.service");
const { addProductDays, getProductDateKey } = require("../dist/shared/utils/productDate");

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
  let idlePromotionId = null;
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
    const idlePromotion = await prisma.promotion.create({
      data: {
        commerceId: commerce.id,
        title: `Analytics idle ${stamp}`,
        description: "Promoción temporal sin eventos para validar cobertura.",
        promotionType: "BENEFIT",
        validationMethod: "QR",
        status: "APPROVED_VISIBLE",
      },
    });
    idlePromotionId = idlePromotion.id;
    const mobile = createMobileClient();
    const web = createWebClient();
    const clientSession = await loginMobile(mobile, "cliente@promy.com", "demo1234");
    const commerceSession = await loginWeb(web, "comercio@promy.com", "demo1234");
    const adminSession = await loginWeb(web, "admin@promy.com", "demo1234");
    const beforeTracking = await web.request("/commerce/statistics?range=today", { headers: { Authorization: `Bearer ${commerceSession.accessToken}` } });
    assert(beforeTracking.ok, "Commerce statistics should be available before the first analytics event");
    assert(beforeTracking.data.statistics.analyticsDataFrom === null, "Analytics coverage must be null before global tracking starts");
    assert(beforeTracking.data.statistics.summary.impressions === null && beforeTracking.data.statistics.summary.opens === null, "Analytics without coverage must not be represented as zero");
    assert(beforeTracking.data.statistics.summary.openRate === null, "Rates with a null denominator must remain null");
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
    const secondCleanup = await cleanupExpiredPromotionAnalyticsReceipts();
    assert(secondCleanup.count === 0, "A second receipt cleanup must be idempotent");

    const analyticsColumns = await prisma.$queryRawUnsafe("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('PromotionAnalyticsDaily', 'PromotionAnalyticsReceipt')");
    const forbiddenAnalyticsColumns = new Set(["userid", "email", "phone", "name", "sessionid", "ip", "useragent", "coordinates", "deviceid", "advertisingid"]);
    assert(analyticsColumns.every((column) => !forbiddenAnalyticsColumns.has(String(column.COLUMN_NAME).toLowerCase())), "Analytics tables must not contain direct PII or raw session columns");
    assert(analyticsColumns.some((column) => column.TABLE_NAME === "PromotionAnalyticsReceipt" && column.COLUMN_NAME === "dedupeKey"), "Analytics receipts must retain only the opaque dedupe key");

    assert(getProductDateKey(new Date("2026-09-24T02:59:00.000Z")) === "2026-09-23" && getProductDateKey(new Date("2026-09-24T03:00:00.000Z")) === "2026-09-24", "PROMOTION_TIMEZONE must define the product-day boundary");
    const today = getProductDateKey(new Date());
    const yesterday = addProductDays(today, -1);
    const coverageRange = await web.request(`/commerce/statistics?range=custom&from=${yesterday}&to=${today}`, { headers: { Authorization: `Bearer ${commerceSession.accessToken}` } });
    assert(coverageRange.ok, "Custom product-date statistics range failed");
    const beforeCoverage = coverageRange.data.statistics.series.find((item) => item.date === yesterday);
    const afterCoverage = coverageRange.data.statistics.series.find((item) => item.date === today);
    assert(beforeCoverage?.impressions === null && beforeCoverage?.opens === null, "Dates before analyticsDataFrom must remain null");
    assert(afterCoverage?.impressions === 1 && afterCoverage?.opens === 1, "Dates in coverage must expose real analytics counts");
    const idleRow = coverageRange.data.statistics.promotions.find((item) => item.promotionId === idlePromotionId);
    assert(idleRow?.impressions === 0 && idleRow?.opens === 0 && idleRow?.openRate === null, "Covered promotions without events must expose zero counts and null rates");
    const baselineGeneratedYesterday = beforeCoverage.generated;
    const baselineValidatedYesterday = beforeCoverage.validated;
    const baselineValidatedToday = afterCoverage.validated;

    const createRedemption = await mobile.request("/redemptions", { method: "POST", headers: { Authorization: `Bearer ${clientSession.accessToken}` }, body: JSON.stringify({ promotionId }) });
    assert(createRedemption.status === 201, `Analytics smoke redemption failed: ${JSON.stringify(createRedemption.data)}`);
    await prisma.redemption.update({ where: { id: createRedemption.data.redemption.id }, data: { createdAt: new Date(`${yesterday}T15:00:00.000Z`) } });
    const beforeValidation = await web.request(`/commerce/statistics?range=custom&from=${yesterday}&to=${today}`, { headers: { Authorization: `Bearer ${commerceSession.accessToken}` } });
    assert(beforeValidation.ok, "Commerce statistics should be owner-scoped");
    const rowBefore = beforeValidation.data.statistics.promotions.find((item) => item.promotionId === promotionId);
    assert(rowBefore?.impressions === 1 && rowBefore?.opens === 1 && rowBefore?.generated === 1 && rowBefore?.validated === 0, "Commerce stats before validation mismatch");
    const validate = await web.request("/commerce/redemptions/validate", { method: "POST", headers: { Authorization: `Bearer ${commerceSession.accessToken}` }, body: JSON.stringify({ validationCode: createRedemption.data.redemption.validationCode }) });
    assert(validate.ok, `Analytics smoke validation failed: ${JSON.stringify(validate.data)}`);
    const afterValidation = await web.request(`/commerce/statistics?range=custom&from=${yesterday}&to=${today}`, { headers: { Authorization: `Bearer ${commerceSession.accessToken}` } });
    const rowAfter = afterValidation.data.statistics.promotions.find((item) => item.promotionId === promotionId);
    assert(rowAfter?.validated === 1, "Validated redemptions must use the real redeemedAt transition");
    const generatedDay = afterValidation.data.statistics.series.find((item) => item.date === yesterday);
    const validatedDay = afterValidation.data.statistics.series.find((item) => item.date === today);
    assert(generatedDay?.generated === baselineGeneratedYesterday + 1 && generatedDay?.validated === baselineValidatedYesterday && validatedDay?.validated === baselineValidatedToday + 1, "Generated and validated redemptions must use createdAt and redeemedAt respectively");
    console.log(JSON.stringify({ smoke: "promotion-analytics", impressions: 1, opens: 1, generated: 1, validated: 1, concurrency: "PASS", privacy: "PASS", status: "PASS" }));
  } finally {
    const promotionIds = [promotionId, idlePromotionId].filter(Boolean);
    if (promotionIds.length) {
      await prisma.promotionAnalyticsReceipt.deleteMany({ where: { promotionId: { in: promotionIds } } });
      await prisma.promotionAnalyticsDaily.deleteMany({ where: { promotionId: { in: promotionIds } } });
      await prisma.redemption.deleteMany({ where: { promotionId: { in: promotionIds } } });
      await prisma.promotion.deleteMany({ where: { id: { in: promotionIds } } });
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
