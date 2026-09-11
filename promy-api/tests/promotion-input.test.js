require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const { createPromotionSchema } = require("../dist/modules/commerce/commerce.service.js");

const basePromotion = {
  title: "Promo nocturna",
  description: "Beneficio durante la noche",
  promotionType: "BENEFIT",
  validationMethod: "QR",
};

test("promotion input accepts overnight schedules anchored to their start day", () => {
  const parsed = createPromotionSchema.safeParse({
    ...basePromotion,
    schedules: [
      { weekday: "MONDAY", startTime: "22:00", endTime: "02:00" },
      { weekday: "FRIDAY", startTime: "23:30", endTime: "01:15" },
    ],
  });

  assert.equal(parsed.success, true);
});

test("promotion input still rejects zero-length schedule windows", () => {
  const parsed = createPromotionSchema.safeParse({
    ...basePromotion,
    schedules: [{ weekday: "MONDAY", startTime: "22:00", endTime: "22:00" }],
  });

  assert.equal(parsed.success, false);
});

test("promotion input rejects overlap with the next day of an overnight schedule", () => {
  const parsed = createPromotionSchema.safeParse({
    ...basePromotion,
    schedules: [
      { weekday: "MONDAY", startTime: "22:00", endTime: "02:00" },
      { weekday: "TUESDAY", startTime: "01:00", endTime: "03:00" },
    ],
  });

  assert.equal(parsed.success, false);
});
