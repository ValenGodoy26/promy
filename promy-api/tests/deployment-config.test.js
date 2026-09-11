require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { validateEnvironment } = require("../dist/config/env.js");

const API_ROOT = path.resolve(__dirname, "..");
const ACCESS_SECRET = "A7zQ9mK2pR4sT6vW8yB1cD3fG5hJ7kL9nP2qS4uV6xZ8";
const REFRESH_SECRET = "R8xV6uS4qP2nL9kJ7hG5fD3cB1yW8vT6sR4pK2mQ9zA7";

function productionEnvironment(overrides = {}) {
  return {
    NODE_ENV: "production",
    APP_ENV: "production",
    TRUST_PROXY: "none",
    DATABASE_URL: "mysql://promy_owner:N7pQ4vM8xK2s@db.internal.internal.invalid/promy_prod",
    JWT_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
    CORS_ORIGIN: "https://panel.promy.invalid",
    PUBLIC_WEB_URL: "https://panel.promy.invalid",
    PUBLIC_API_BASE_URL: "https://api.promy.invalid",
    AUTH_EMAIL_PROVIDER: "resend",
    AUTH_EMAIL_FROM: "PROMY <no-reply@promy.invalid>",
    RESEND_API_KEY: "re_A9kLm3Np857nPqRs6VwX2",
    UPLOADS_DRIVER: "local",
    ALLOW_WEAK_SECRETS: "0",
    ...overrides,
  };
}

function runConfig(overrides = {}, removed = []) {
  const env = { ...process.env, ...productionEnvironment(), ...overrides };
  for (const key of removed) delete env[key];
  return spawnSync(process.execPath, ["-e", "require('./dist/config/env.js')"], {
    cwd: API_ROOT,
    env,
    encoding: "utf8",
  });
}

test("NODE_ENV=production without APP_ENV rejects startup", () => {
  const result = runConfig({}, ["APP_ENV"]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /APP_ENV es obligatoria/);
});

test("production rejects repository example JWT secrets without printing them", () => {
  const knownAccess = "promy-local-jwt-s3cret-9f84k2m1q7r6x5a4";
  const knownRefresh = "promy-local-refresh-s3cret-8d73j1n2p4q6w9";
  const result = runConfig({ JWT_SECRET: knownAccess, JWT_REFRESH_SECRET: knownRefresh });
  const output = `${result.stdout}\n${result.stderr}`;

  assert.notEqual(result.status, 0);
  assert.match(output, /JWT_SECRET es demasiado debil/);
  assert.equal(output.includes(knownAccess), false);
  assert.equal(output.includes(knownRefresh), false);
});

test("synthetic production configuration is accepted", () => {
  const parsed = validateEnvironment(productionEnvironment());
  assert.equal(parsed.success, true, parsed.success ? undefined : JSON.stringify(parsed.error.flatten()));

  const startup = runConfig();
  assert.equal(startup.status, 0, `${startup.stdout}\n${startup.stderr}`);
});

test("test environment keeps the isolated email provider available", () => {
  const parsed = validateEnvironment({
    NODE_ENV: "test",
    APP_ENV: "test",
    TRUST_PROXY: "loopback",
    DATABASE_URL: "mysql://root:qa_password@127.0.0.1:3306/promy_integration_test",
    JWT_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
    CORS_ORIGIN: "http://127.0.0.1:5173",
    PUBLIC_WEB_URL: "http://127.0.0.1:5173",
    PUBLIC_API_BASE_URL: "http://127.0.0.1:4000",
    AUTH_EMAIL_PROVIDER: "test",
    AUTH_EMAIL_FROM: "PROMY QA <no-reply@promy.test>",
    UPLOADS_DRIVER: "local",
    ALLOW_WEAK_SECRETS: "0",
  });
  assert.equal(parsed.success, true, parsed.success ? undefined : JSON.stringify(parsed.error.flatten()));
});

test("development keeps explicit local weak-secret override", () => {
  const parsed = validateEnvironment({
    NODE_ENV: "development",
    APP_ENV: "development",
    TRUST_PROXY: "none",
    DATABASE_URL: "mysql://root@127.0.0.1:3306/promy_db",
    JWT_SECRET: "development-secret-allowed-locally-123456",
    JWT_REFRESH_SECRET: "development-refresh-secret-allowed-123456",
    CORS_ORIGIN: "*",
    AUTH_EMAIL_PROVIDER: "console",
    UPLOADS_DRIVER: "local",
    ALLOW_WEAK_SECRETS: "1",
  });
  assert.equal(parsed.success, true, parsed.success ? undefined : JSON.stringify(parsed.error.flatten()));
});

test("environment mismatches, placeholders and invalid proxy policies fail validation", () => {
  const mismatch = validateEnvironment(productionEnvironment({ APP_ENV: "development" }));
  assert.equal(mismatch.success, false);

  const placeholder = validateEnvironment(productionEnvironment({
    RESEND_API_KEY: "re_xxxxxxxxxxxxx",
  }));
  assert.equal(placeholder.success, false);

  const invalidProxy = validateEnvironment(productionEnvironment({ TRUST_PROXY: "1" }));
  assert.equal(invalidProxy.success, false);
  assert.ok(invalidProxy.error.flatten().fieldErrors.TRUST_PROXY);
});

test("production enforces provider-conditional credentials and secure public URLs", () => {
  const missingS3 = validateEnvironment(productionEnvironment({
    UPLOADS_DRIVER: "s3",
    PUBLIC_API_BASE_URL: undefined,
  }));
  assert.equal(missingS3.success, false);
  assert.ok(missingS3.error.flatten().fieldErrors.S3_ENDPOINT);
  assert.ok(missingS3.error.flatten().fieldErrors.S3_SECRET_ACCESS_KEY);

  const insecureUrls = validateEnvironment(productionEnvironment({
    CORS_ORIGIN: "http://localhost:5173",
    PUBLIC_WEB_URL: "http://localhost:5173",
    PUBLIC_API_BASE_URL: "http://127.0.0.1:4000",
  }));
  assert.equal(insecureUrls.success, false);
  assert.ok(insecureUrls.error.flatten().fieldErrors.CORS_ORIGIN);
  assert.ok(insecureUrls.error.flatten().fieldErrors.PUBLIC_WEB_URL);
  assert.ok(insecureUrls.error.flatten().fieldErrors.PUBLIC_API_BASE_URL);
});
