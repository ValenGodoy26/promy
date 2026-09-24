import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  formatBusinessDate,
  getCommercePhoneError,
  getOwnerEditablePromotionStatus,
  serializeBusinessDate,
  validateCommerceProfileForm,
} from "../src/features/commerce/commerceRules.ts";
import { getAvailablePromotionTransitions } from "../src/features/admin/promotionLifecycle.ts";

const commerceContract = JSON.parse(
  readFileSync(new URL("../../contracts/promy-commerce-v1.json", import.meta.url), "utf8"),
);

test("commerce phone policy accepts local and +54 formats and rejects invalid values", () => {
  for (const value of ["", "3454 123456", "3454-123456", "+54 9 3454 123456"]) {
    assert.equal(getCommercePhoneError(value), null, value);
  }

  for (const value of ["abc", "1234567", "+1 202 555 0199", "12345678901234"]) {
    assert.ok(getCommercePhoneError(value), value);
  }
});

test("commerce profile blocks required no-op fields and invalid coordinates", () => {
  const errors = validateCommerceProfileForm({
    name: "",
    address: "",
    phone: "abc",
    cityId: "",
    categoryId: "",
    latitude: "-31.4",
    longitude: "",
  });

  assert.deepEqual(Object.keys(errors).sort(), [
    "address",
    "categoryId",
    "cityId",
    "latitude",
    "longitude",
    "name",
    "phone",
  ]);

  assert.deepEqual(validateCommerceProfileForm({
    name: "Local QA",
    address: "Mitre 123",
    phone: "+54 9 3454 123456",
    cityId: "1",
    categoryId: "1",
    latitude: "-31.3929",
    longitude: "-58.0209",
  }), {});
});

test("web promotion lifecycle helpers match the versioned commerce contract", () => {
  const { promotionLifecycle } = commerceContract;

  for (const status of promotionLifecycle.admin.statuses) {
    assert.deepEqual(
      getAvailablePromotionTransitions(status).sort(),
      [...promotionLifecycle.admin.allowedTransitions[status]].sort(),
      `admin transitions for ${status}`,
    );
    assert.equal(
      getOwnerEditablePromotionStatus(status),
      promotionLifecycle.commerceEditing.ownerEditableStatus[status],
      `owner edit status for ${status}`,
    );
  }
});

test("business dates preserve their calendar day across month and year boundaries", () => {
  assert.equal(serializeBusinessDate("2026-09-12"), "2026-09-12T00:00:00.000Z");
  assert.equal(serializeBusinessDate("2026-12-31"), "2026-12-31T00:00:00.000Z");
  assert.match(formatBusinessDate("2026-09-12T00:00:00.000Z"), /^12\D/);
  assert.match(formatBusinessDate("2026-12-31T00:00:00.000Z"), /^31\D/);
  assert.match(formatBusinessDate("2027-01-01T00:00:00.000Z"), /^01\D/);
});
