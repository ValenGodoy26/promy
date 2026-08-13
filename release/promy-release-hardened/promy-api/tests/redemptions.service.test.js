require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseTimeToMinutes,
  isCurrentTimeWithinPromotionWindow,
  isPromotionCurrentlyAvailable,
  isValidationStillAvailable,
  buildValidationCode,
  RedemptionServiceError,
  isRedemptionServiceError,
} = require("../dist/modules/redemptions/redemptions.service.js");

test("parseTimeToMinutes parses valid HH:mm values", () => {
  assert.equal(parseTimeToMinutes("00:00"), 0);
  assert.equal(parseTimeToMinutes("09:30"), 570);
  assert.equal(parseTimeToMinutes("23:59"), 1439);
});

test("parseTimeToMinutes rejects invalid time values", () => {
  assert.equal(parseTimeToMinutes("24:00"), null);
  assert.equal(parseTimeToMinutes("12:60"), null);
  assert.equal(parseTimeToMinutes("nope"), null);
  assert.equal(parseTimeToMinutes(undefined), null);
});

test("isCurrentTimeWithinPromotionWindow supports open-ended windows", () => {
  assert.equal(
    isCurrentTimeWithinPromotionWindow({ startTime: "00:00", endTime: "23:59" }),
    true,
  );
  assert.equal(isCurrentTimeWithinPromotionWindow({ startTime: null, endTime: null }), true);
});

test("isPromotionCurrentlyAvailable honors date limits", () => {
  const now = Date.now();
  assert.equal(
    isPromotionCurrentlyAvailable({
      startDate: new Date(now - 60_000),
      endDate: new Date(now + 60_000),
      startTime: "00:00",
      endTime: "23:59",
    }),
    true,
  );

  assert.equal(
    isPromotionCurrentlyAvailable({
      startDate: new Date(now + 60_000),
      endDate: new Date(now + 120_000),
      startTime: "00:00",
      endTime: "23:59",
    }),
    false,
  );
});

test("isPromotionCurrentlyAvailable honors weekday schedules in redemptions", () => {
  assert.equal(
    isPromotionCurrentlyAvailable(
      {
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.000Z"),
        startTime: "00:00",
        endTime: "23:59",
        schedules: [
          {
            weekday: "MONDAY",
            startTime: "14:00",
            endTime: "16:00",
          },
        ],
      },
      new Date("2026-05-11T17:30:00.000Z"),
    ),
    true,
  );

  assert.equal(
    isPromotionCurrentlyAvailable(
      {
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-05-31T23:59:59.000Z"),
        startTime: "00:00",
        endTime: "23:59",
        schedules: [
          {
            weekday: "MONDAY",
            startTime: "14:00",
            endTime: "16:00",
          },
        ],
      },
      new Date("2026-05-11T21:30:00.000Z"),
    ),
    false,
  );
});

test("isValidationStillAvailable checks expiration timestamps", () => {
  assert.equal(isValidationStillAvailable(null), true);
  assert.equal(isValidationStillAvailable(new Date(Date.now() + 60_000)), true);
  assert.equal(isValidationStillAvailable(new Date(Date.now() - 60_000)), false);
});

test("isRedemptionServiceError recognizes service errors", () => {
  const error = new RedemptionServiceError("demo", 409, { reason: "already-used" });
  assert.equal(isRedemptionServiceError(error), true);
  assert.equal(isRedemptionServiceError(new Error("nope")), false);
  assert.equal(error.statusCode, 409);
});

test("buildValidationCode creates opaque hexadecimal redemption codes", () => {
  const codes = new Set(Array.from({ length: 32 }, () => buildValidationCode()));

  assert.equal(codes.size, 32);
  for (const code of codes) {
    assert.match(code, /^PROMY-[A-F0-9]{8}$/);
  }
});
