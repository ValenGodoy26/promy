const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_ENV = {
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
};

const DEFAULT_ENV = {
  APP_ENV: "test",
  PORT: "4017",
  CORS_ORIGIN: "http://localhost:5173,http://127.0.0.1:5173",
  PUBLIC_WEB_URL: "http://localhost:5173",
  PUBLIC_API_BASE_URL: "http://localhost:4017",
  AUTH_EMAIL_PROVIDER: "console",
  AUTH_EMAIL_FROM: "PROMY <no-reply@promy.app>",
  JWT_SECRET: "promy-test-jwt-secret-with-at-least-32-chars",
  JWT_REFRESH_SECRET: "promy-test-refresh-secret-with-32-chars",
  SEED_MODE: "demo",
  SEED_ADMIN_EMAIL: "admin@promy.com",
  SEED_ADMIN_PASSWORD: "demo1234",
  ALLOW_WEAK_SECRETS: "0",
};

const SMOKES = [
  "scripts/qa-auth-smoke.js",
  "scripts/qa-commerce-onboarding-smoke.js",
  "scripts/qa-promotion-lifecycle-smoke.js",
  "scripts/qa-real-e2e-smoke.js",
  "scripts/qa-account-deletion-smoke.js",
  "scripts/qa-expiration-smoke.js",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildIntegrationEnv() {
  assert(
    REQUIRED_ENV.TEST_DATABASE_URL,
    "TEST_DATABASE_URL es obligatoria para correr integration tests.",
  );

  const lowerUrl = REQUIRED_ENV.TEST_DATABASE_URL.toLowerCase();
  const canUseDatabase =
    process.env.INTEGRATION_ALLOW_ANY_DATABASE === "1" ||
    lowerUrl.includes("test") ||
    lowerUrl.includes("qa");

  assert(
    canUseDatabase,
    "TEST_DATABASE_URL debe apuntar a una base de test/qa o usar INTEGRATION_ALLOW_ANY_DATABASE=1.",
  );

  return {
    ...process.env,
    ...DEFAULT_ENV,
    DATABASE_URL: REQUIRED_ENV.TEST_DATABASE_URL,
  };
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} fallo con exit code ${code}`));
    });

    child.on("error", reject);
  });
}

async function main() {
  const env = buildIntegrationEnv();

  console.log("[integration] build");
  await runCommand("npm", ["run", "build"], env);

  console.log("[integration] prisma migrate reset");
  await runCommand("npx", ["prisma", "migrate", "reset", "--force", "--skip-generate"], env);

  console.log("[integration] seed demo");
  await runCommand("node", ["prisma/seed.js"], env);

  for (const smokeScript of SMOKES) {
    console.log(`[integration] smoke ${smokeScript}`);
    await runCommand("node", ["scripts/qa-run-smoke.js", smokeScript], env);
  }

  console.log("[integration] suite completa");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
