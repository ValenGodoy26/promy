require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const { buildBetaAccessRequestLogContext } = require("../dist/modules/beta/beta.service.js");

test("beta operational log context excludes synthetic contact data", () => {
  const syntheticEmail = "privacy-log@example.test";
  const context = buildBetaAccessRequestLogContext({
    requestId: "req_privacy_123",
    betaAccessRequestId: 42,
    platform: "ANDROID",
    source: "landing",
    outcome: "upserted",
  });

  assert.deepEqual(context, {
    requestId: "req_privacy_123",
    betaAccessRequestId: 42,
    platform: "ANDROID",
    source: "landing",
    outcome: "upserted",
  });
  assert.equal(JSON.stringify(context).includes(syntheticEmail), false);
  assert.equal(Object.hasOwn(context, "email"), false);
  assert.equal(Object.hasOwn(context, "city"), false);
});
