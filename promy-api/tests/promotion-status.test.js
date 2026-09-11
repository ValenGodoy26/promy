require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PUBLIC_PROMOTION_STATUS,
  getWeekdayFromDate,
  hasPromotionSchedules,
  isPromotionCurrentlyAvailable,
  isPromotionScheduleActiveNow,
  isPromotionPubliclyVisibleNow,
  isPromotionRedeemableNow,
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

test("isPromotionPubliclyVisibleNow rejects hidden promotions and hidden commerces", () => {
  const now = new Date("2026-04-28T15:00:00.000Z");
  const visible = {
    status: PUBLIC_PROMOTION_STATUS,
    isHiddenByAdmin: false,
    startDate: new Date("2026-04-28T10:00:00.000Z"),
    endDate: new Date("2026-04-28T20:00:00.000Z"),
    commerce: { status: "APPROVED", isHiddenByAdmin: false },
  };

  assert.equal(isPromotionPubliclyVisibleNow(visible, now), true);
  assert.equal(isPromotionPubliclyVisibleNow({ ...visible, isHiddenByAdmin: true }, now), false);
  assert.equal(
    isPromotionPubliclyVisibleNow(
      { ...visible, commerce: { status: "APPROVED", isHiddenByAdmin: true } },
      now,
    ),
    false,
  );
});

test("isPromotionRedeemableNow requires an approved available commerce", () => {
  const now = new Date("2026-04-28T15:00:00.000Z");
  const promotion = {
    status: PUBLIC_PROMOTION_STATUS,
    isHiddenByAdmin: false,
    startDate: new Date("2026-04-28T10:00:00.000Z"),
    endDate: new Date("2026-04-28T20:00:00.000Z"),
    commerce: { status: "APPROVED", isHiddenByAdmin: false },
  };

  assert.equal(isPromotionRedeemableNow(promotion, now), true);
  assert.equal(
    isPromotionRedeemableNow(
      { ...promotion, commerce: { status: "INACTIVE", isHiddenByAdmin: false } },
      now,
    ),
    false,
  );
});

test("weekday helper maps JS dates to promotion weekdays", () => {
  assert.equal(getWeekdayFromDate(new Date("2026-05-11T15:00:00.000Z")), "MONDAY");
  assert.equal(getWeekdayFromDate(new Date("2026-05-17T15:00:00.000Z")), "SUNDAY");
});

test("isPromotionScheduleActiveNow matches weekday and time window", () => {
  const now = new Date("2026-05-11T17:30:00.000Z");

  assert.equal(
    isPromotionScheduleActiveNow(
      {
        weekday: "MONDAY",
        startTime: "14:00",
        endTime: "15:00",
      },
      now,
    ),
    true,
  );

  assert.equal(
    isPromotionScheduleActiveNow(
      {
        weekday: "TUESDAY",
        startTime: "14:00",
        endTime: "15:00",
      },
      now,
    ),
    false,
  );
});

test("isPromotionCurrentlyAvailable uses schedules as authoritative when present", () => {
  const mondayNow = new Date("2026-05-11T17:30:00.000Z");
  const mondayLate = new Date("2026-05-11T21:30:00.000Z");

  const promotion = {
    startDate: new Date("2026-05-01T00:00:00.000Z"),
    endDate: new Date("2026-05-31T23:59:59.000Z"),
    startTime: "00:00",
    endTime: "23:59",
    schedules: [
      {
        weekday: "MONDAY",
        startTime: "14:00",
        endTime: "15:00",
      },
    ],
  };

  assert.equal(hasPromotionSchedules(promotion), true);
  assert.equal(isPromotionCurrentlyAvailable(promotion, mondayNow), true);
  assert.equal(isPromotionCurrentlyAvailable(promotion, mondayLate), false);
});
