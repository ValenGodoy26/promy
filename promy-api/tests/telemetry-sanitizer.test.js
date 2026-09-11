require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");
const { Writable } = require("node:stream");

const {
  createAppLogger,
  sanitizeError,
} = require("../dist/shared/logging/logger.js");
const {
  sanitizeSentryEvent,
} = require("../dist/shared/observability/sentry.js");
const {
  sanitizeTelemetryUrl,
  sanitizeTelemetryValue,
} = require("../dist/shared/observability/telemetrySanitizer.js");

const SECRETS = [
  "SUPER_SECRET_REFRESH_123",
  "RESET_SECRET_456",
  "ACCESS_SECRET_789",
];

function assertSecretsRemoved(value) {
  const serialized = JSON.stringify(value);
  for (const secret of SECRETS) assert.equal(serialized.includes(secret), false, secret);
  assert.match(serialized, /\[REDACTED\]/);
}

test("telemetry sanitizer removes secrets from nested values, URLs and Error fields", () => {
  const error = new Error(
    "refresh token SUPER_SECRET_REFRESH_123 at /reset?token=RESET_SECRET_456",
  );
  error.stack = "Error: Bearer ACCESS_SECRET_789\n at privacy-smoke.js:1:1";
  error.context = { nested: `authorization: Bearer ACCESS_SECRET_789` };

  const sanitized = sanitizeTelemetryValue({
    method: "POST",
    statusCode: 500,
    requestId: "request-123",
    actor: { role: "COMMERCE" },
    originalUrl: "/auth/reset?token=RESET_SECRET_456#SUPER_SECRET_REFRESH_123",
    headers: {
      authorization: "Bearer ACCESS_SECRET_789",
      cookie: "promy_refresh_token=SUPER_SECRET_REFRESH_123",
    },
    nested: { error },
  });

  assertSecretsRemoved(sanitized);
  assert.equal(sanitized.method, "POST");
  assert.equal(sanitized.statusCode, 500);
  assert.equal(sanitized.requestId, "request-123");
  assert.equal(sanitized.actor.role, "COMMERCE");
  assert.equal(sanitized.originalUrl, "/auth/reset");
  assert.equal(sanitized.nested.error.name, "Error");
  assert.match(sanitized.nested.error.stack, /privacy-smoke\.js:1:1/);
  assert.equal(sanitizeTelemetryUrl("/verify?token=RESET_SECRET_456#fragment"), "/verify");
});

test("logger output sanitizes object, message and Error content", async () => {
  let output = "";
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  const log = createAppLogger(destination);
  const error = new Error("resetToken=RESET_SECRET_456");
  error.stack = "Error: Bearer ACCESS_SECRET_789\n at logger-test.js:2:1";

  log.error(
    {
      method: "GET",
      path: "/recover?token=RESET_SECRET_456",
      authorization: "Bearer ACCESS_SECRET_789",
      nested: { refreshToken: "SUPER_SECRET_REFRESH_123" },
      err: sanitizeError(error),
    },
    "failed refresh token SUPER_SECRET_REFRESH_123",
  );
  await new Promise((resolve) => setImmediate(resolve));

  assertSecretsRemoved(output);
  const line = JSON.parse(output.trim());
  assert.equal(line.method, "GET");
  assert.equal(line.err.name, "Error");
  assert.match(line.err.stack, /logger-test\.js:2:1/);
});

test("Sentry beforeSend sanitizer removes secrets while preserving diagnostics", () => {
  const event = sanitizeSentryEvent({
    request: {
      method: "POST",
      url: "https://api.promy.test/auth/reset?token=RESET_SECRET_456#private",
      headers: {
        Authorization: "Bearer ACCESS_SECRET_789",
        Cookie: "refreshToken=SUPER_SECRET_REFRESH_123",
      },
    },
    exception: {
      values: [{ type: "Error", value: "secret: RESET_SECRET_456", stacktrace: "Bearer ACCESS_SECRET_789" }],
    },
    contexts: { trace: { requestId: "request-456", role: "ADMIN" } },
  });

  assertSecretsRemoved(event);
  assert.equal(event.request.method, "POST");
  assert.equal(event.request.url, "/auth/reset");
  assert.equal(event.exception.values[0].type, "Error");
  assert.equal(event.contexts.trace.requestId, "request-456");
});
