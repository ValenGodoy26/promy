require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const { createPublicRegistrationGate } = require("../dist/shared/privacy/publicRegistration.js");

function invokeGate(config) {
  let payload;
  let nextCalled = false;
  const response = {
    status(code) {
      assert.equal(code, 503);
      return this;
    },
    json(value) {
      payload = value;
      return this;
    },
  };

  createPublicRegistrationGate(config)({}, response, () => {
    nextCalled = true;
  });
  return { nextCalled, payload };
}

test("public registration middleware blocks real environments by default", () => {
  const result = invokeGate({ APP_ENV: "production", PUBLIC_REGISTRATION_ENABLED: "0" });
  assert.equal(result.nextCalled, false);
  assert.deepEqual(result.payload, {
    ok: false,
    code: "PUBLIC_REGISTRATION_DISABLED",
    message: "El registro público todavía no está habilitado para este entorno.",
  });
});

test("public registration middleware remains available in test and explicit production opt-in", () => {
  assert.equal(invokeGate({ APP_ENV: "test" }).nextCalled, true);
  assert.equal(
    invokeGate({ APP_ENV: "production", PUBLIC_REGISTRATION_ENABLED: "1" }).nextCalled,
    true,
  );
});
