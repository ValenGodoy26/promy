require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const { registerCommerceSchema } = require("../dist/modules/auth/auth.service.js");
const { updateCommerceSchema } = require("../dist/modules/commerce/commerce.service.js");

const registrationBase = {
  fullName: "Responsable QA",
  email: "commerce-phone@example.test",
  password: "PhonePolicy123!",
  commerceName: "Comercio telefono",
  address: "Mitre 123, Concordia",
  cityId: 1,
  categoryId: 1,
};

test("commerce registration and profile share the Argentina phone policy", () => {
  const valid = ["", "3454 123456", "3454-123456", "+54 9 3454 123456"];
  const invalid = ["abc", "1234567", "+1 202 555 0199", "12345678901234"];

  for (const phone of valid) {
    assert.equal(registerCommerceSchema.safeParse({ ...registrationBase, phone }).success, true, phone);
    assert.equal(updateCommerceSchema.safeParse({ phone }).success, true, phone);
  }

  for (const phone of invalid) {
    assert.equal(registerCommerceSchema.safeParse({ ...registrationBase, phone }).success, false, phone);
    assert.equal(updateCommerceSchema.safeParse({ phone }).success, false, phone);
  }

  assert.equal(registerCommerceSchema.safeParse(registrationBase).success, true);
  assert.equal(updateCommerceSchema.safeParse({ phone: null }).success, true);
});
