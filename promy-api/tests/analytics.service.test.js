require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  commerceStatisticsQuerySchema,
  promotionAnalyticsEventsSchema,
} = require("../dist/modules/analytics/analytics.service.js");
const {
  addProductDays,
  getProductDateKey,
  productDateKeyToDate,
} = require("../dist/shared/utils/productDate.js");

const sessionId = "123e4567-e89b-42d3-a456-426614174000";

test("analytics ingestion accepts only a bounded strict CLIENT payload", () => {
  assert.equal(promotionAnalyticsEventsSchema.safeParse({
    sessionId,
    events: [{ promotionId: 1, type: "IMPRESSION" }],
  }).success, true);
  assert.equal(promotionAnalyticsEventsSchema.safeParse({ sessionId, events: [] }).success, false);
  assert.equal(promotionAnalyticsEventsSchema.safeParse({ sessionId, events: [{ promotionId: 1, type: "VIEW" }] }).success, false);
  assert.equal(promotionAnalyticsEventsSchema.safeParse({ sessionId, events: [{ promotionId: 1, type: "OPEN", commerceId: 1 }] }).success, false);
  assert.equal(promotionAnalyticsEventsSchema.safeParse({ sessionId, events: [{ promotionId: 1, type: "OPEN" }], userId: 1 }).success, false);
});

test("analytics calendar keys follow the PROMOTION_TIMEZONE without UTC day leakage", () => {
  assert.equal(getProductDateKey(new Date("2026-09-24T02:59:00.000Z")), "2026-09-23");
  assert.equal(getProductDateKey(new Date("2026-09-24T03:00:00.000Z")), "2026-09-24");
  assert.equal(addProductDays("2026-12-31", 1), "2027-01-01");
  assert.equal(productDateKeyToDate("2026-02-30"), null);
});

test("commerce statistics permits bounded custom product-date ranges only", () => {
  assert.equal(commerceStatisticsQuerySchema.safeParse({ range: "today" }).success, true);
  assert.equal(commerceStatisticsQuerySchema.safeParse({ range: "custom", from: "2026-09-01", to: "2026-09-30" }).success, true);
  assert.equal(commerceStatisticsQuerySchema.safeParse({ range: "custom", from: "2026-09-30", to: "2026-09-01" }).success, false);
  assert.equal(commerceStatisticsQuerySchema.safeParse({ range: "7d", from: "2026-09-01" }).success, false);
});
