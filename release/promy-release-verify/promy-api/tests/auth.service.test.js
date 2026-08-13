require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  registerSchema,
  resetPasswordSchema,
  normalizeEmail,
  buildRefreshTokenFingerprint,
  buildPublicAppUrl,
  buildAuthActionPreview,
} = require("../dist/modules/auth/auth.service.js");

test("normalizeEmail trims and lowercases values", () => {
  assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
});

test("buildRefreshTokenFingerprint is stable and opaque", () => {
  const fingerprint = buildRefreshTokenFingerprint("refresh-token-demo");
  assert.equal(fingerprint.length, 64);
  assert.match(fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(fingerprint, buildRefreshTokenFingerprint("refresh-token-demo"));
  assert.notEqual(fingerprint, buildRefreshTokenFingerprint("refresh-token-demo-2"));
});

test("registerSchema accepts a valid payload", () => {
  const parsed = registerSchema.parse({
    fullName: "Usuario Demo",
    email: "demo@promy.app",
    password: "DemoPass123",
    phone: "3454556677",
  });

  assert.equal(parsed.email, "demo@promy.app");
});

test("registerSchema rejects weak passwords", () => {
  assert.throws(
    () =>
      registerSchema.parse({
        fullName: "Usuario Demo",
        email: "demo@promy.app",
        password: "demopass",
      }),
    /mayuscula|numero/i,
  );
});

test("resetPasswordSchema rejects short tokens", () => {
  assert.throws(
    () =>
      resetPasswordSchema.parse({
        token: "short-token",
        password: "DemoPass123",
      }),
    /Token invalido/i,
  );
});

test("buildPublicAppUrl returns localhost links in current dev env", () => {
  assert.equal(
    buildPublicAppUrl("/verify-email?token=abc"),
    "http://localhost:5173/verify-email?token=abc",
  );
});

test("buildAuthActionPreview exposes token and link in development", () => {
  const preview = buildAuthActionPreview("/reset-password", "demo-token");
  assert.deepEqual(preview, {
    token: "demo-token",
    link: "http://localhost:5173/reset-password?token=demo-token",
  });
});
