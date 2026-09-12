import assert from "node:assert/strict";
import test from "node:test";
import {
  formatBusinessDate,
  getCommercePhoneError,
  getOwnerEditablePromotionStatus,
  serializeBusinessDate,
  validateCommerceProfileForm,
} from "../src/features/commerce/commerceRules.ts";

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

test("approved, rejected and expired promotions reopen as pending review", () => {
  assert.equal(getOwnerEditablePromotionStatus("DRAFT"), "DRAFT");
  assert.equal(getOwnerEditablePromotionStatus("PENDING_REVIEW"), "PENDING_REVIEW");
  assert.equal(getOwnerEditablePromotionStatus("APPROVED_VISIBLE"), "PENDING_REVIEW");
  assert.equal(getOwnerEditablePromotionStatus("REJECTED"), "PENDING_REVIEW");
  assert.equal(getOwnerEditablePromotionStatus("EXPIRED"), "PENDING_REVIEW");
});

test("business dates preserve their calendar day across month and year boundaries", () => {
  assert.equal(serializeBusinessDate("2026-09-12"), "2026-09-12T00:00:00.000Z");
  assert.equal(serializeBusinessDate("2026-12-31"), "2026-12-31T00:00:00.000Z");
  assert.match(formatBusinessDate("2026-09-12T00:00:00.000Z"), /^12\D/);
  assert.match(formatBusinessDate("2026-12-31T00:00:00.000Z"), /^31\D/);
  assert.match(formatBusinessDate("2027-01-01T00:00:00.000Z"), /^01\D/);
});
