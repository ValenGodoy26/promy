require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PUBLIC_PROMOTION_STATUS,
  isPromotionPubliclyVisibleNow,
  filterPublicPromotionsVisibleNow,
} = require("../dist/shared/utils/promotionStatus.js");

test("isPromotionPubliclyVisibleNow rejects promotions that have not started yet", () => {
  const now = new Date("2026-04-28T15:00:00.000Z");

  assert.equal(
    isPromotionPubliclyVisibleNow(
      {
        status: PUBLIC_PROMOTION_STATUS,
        startDate: new Date("2026-04-28T16:00:00.000Z"),
        endDate: new Date("2026-04-28T20:00:00.000Z"),
        startTime: null,
        endTime: null,
      },
      now,
    ),
    false,
  );
});

test("isPromotionPubliclyVisibleNow rejects approved promos outside daily window", () => {
  const now = new Date("2026-04-28T15:00:00.000Z");
  const result = isPromotionPubliclyVisibleNow(
    {
      status: PUBLIC_PROMOTION_STATUS,
      startDate: new Date("2026-04-28T10:00:00.000Z"),
      endDate: new Date("2026-04-29T10:00:00.000Z"),
      startTime: "18:00",
      endTime: "22:00",
    },
    now,
  );

  assert.equal(result, false);
});

test("filterPublicPromotionsVisibleNow keeps only promos visible right now", () => {
  const now = new Date("2026-04-28T15:00:00.000Z");
  const promotions = [
    {
      id: 1,
      status: PUBLIC_PROMOTION_STATUS,
      startDate: new Date("2026-04-28T10:00:00.000Z"),
      endDate: new Date("2026-04-28T20:00:00.000Z"),
      startTime: "00:00",
      endTime: "23:59",
    },
    {
      id: 2,
      status: PUBLIC_PROMOTION_STATUS,
      startDate: new Date("2026-04-28T16:00:00.000Z"),
      endDate: new Date("2026-04-28T20:00:00.000Z"),
      startTime: "00:00",
      endTime: "23:59",
    },
    {
      id: 3,
      status: "REJECTED",
      startDate: new Date("2026-04-28T10:00:00.000Z"),
      endDate: new Date("2026-04-28T20:00:00.000Z"),
      startTime: "00:00",
      endTime: "23:59",
    },
  ];

  assert.deepEqual(
    filterPublicPromotionsVisibleNow(promotions, now).map((promotion) => promotion.id),
    [1],
  );
});
