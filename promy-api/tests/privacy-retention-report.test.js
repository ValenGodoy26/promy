require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createPrivacyRetentionReport,
  requireTimestamp,
} = require("../scripts/privacy-retention-report.js");

test("retention reporter requires an explicit ISO threshold", () => {
  assert.throws(() => requireTimestamp([]), /--before/);
  assert.throws(() => requireTimestamp(["--before=not-a-date"]), /ISO-8601/);
  assert.equal(
    requireTimestamp(["--before=2026-09-01T00:00:00.000Z"]).toISOString(),
    "2026-09-01T00:00:00.000Z",
  );
});

test("retention reporter returns aggregate-only dry-run data", async () => {
  const calls = [];
  const model = (name) => ({
    aggregate: async (input) => {
      calls.push({ name, input });
      return { _count: { _all: 2 }, _min: { [input ? Object.keys(input._min)[0] : "createdAt"]: new Date("2026-01-01T00:00:00.000Z") }, _max: { [Object.keys(input._max)[0]]: new Date("2026-02-01T00:00:00.000Z") } };
    },
  });
  const client = {
    session: model("session"),
    user: model("user"),
    appNotification: model("notification"),
    betaAccessRequest: model("beta"),
    adminActionLog: model("audit"),
    pushToken: model("push"),
  };
  const report = await createPrivacyRetentionReport(client, {
    before: new Date("2026-09-01T00:00:00.000Z"),
    now: new Date("2026-09-20T00:00:00.000Z"),
  });

  assert.equal(report.mode, "dry-run");
  assert.equal(report.categories.length, 8);
  assert.equal(report.categories.every((category) => Object.keys(category).every((key) => ["type", "count", "oldestAt", "newestAt"].includes(key))), true);
  assert.equal(JSON.stringify(report).includes("privacy-report@example.test"), false);
  assert.equal(calls.length, 8);
  assert.equal(calls.every(({ input }) => !Object.hasOwn(input, "delete")), true);
  assert.equal(
    calls.some(({ input }) => Object.hasOwn(input._min, "pendingEmailTokenExpiresAt")),
    true,
  );
});
