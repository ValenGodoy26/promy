const net = require("net");
const path = require("path");
const {
  runCommand,
  startApi,
  stopProcessTree,
  waitForHealth,
} = require("./qa-process");
const { validateTestDatabaseUrl } = require("./qa-database-guard");

const ROOT = path.resolve(__dirname, "..");
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

const SMOKES = [
  "scripts/qa-auth-smoke.js",
  "scripts/qa-rate-limit-smoke.js",
  "scripts/qa-commerce-onboarding-smoke.js",
  "scripts/qa-uploads-smoke.js",
  "scripts/qa-promotion-lifecycle-smoke.js",
  "scripts/qa-real-e2e-smoke.js",
  "scripts/qa-account-deletion-smoke.js",
  "scripts/qa-expiration-smoke.js",
  "scripts/qa-domain-integrity-smoke.js",
  "scripts/qa-auth-security-smoke.js",
];

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) reject(error);
        else if (!port) reject(new Error("No se pudo reservar un puerto para la API de test."));
        else resolve(port);
      });
    });
  });
}

async function main() {
  const database = validateTestDatabaseUrl(TEST_DATABASE_URL);
  const port = await getAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const env = {
    ...process.env,
    APP_ENV: "test",
    PORT: String(port),
    QA_PORT: String(port),
    QA_BASE_URL: baseUrl,
    CORS_ORIGIN: "http://localhost:5173,http://127.0.0.1:5173",
    PUBLIC_WEB_URL: "http://localhost:5173",
    PUBLIC_API_BASE_URL: `http://127.0.0.1:${port}`,
    AUTH_EMAIL_PROVIDER: "test",
    AUTH_EMAIL_FROM: "PROMY Tests <no-reply@promy.test>",
    JWT_SECRET: "9f84k2m1q7r6x5a4n8c3v2b7p6d1s9h4j8k2m5",
    JWT_REFRESH_SECRET: "8d73j1n2p4q6w9z5c7v3b8m1k6s2h9f4q7r5t3y1",
    SEED_MODE: "demo",
    SEED_ADMIN_EMAIL: "admin@promy.com",
    SEED_ADMIN_PASSWORD: "demo1234",
    ALLOW_WEAK_SECRETS: "0",
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: "1",
    ...(process.platform === "win32"
      ? {
          PRISMA_SCHEMA_ENGINE_BINARY: path.join(
            ROOT,
            "node_modules",
            "@prisma",
            "engines",
            "schema-engine-windows.exe",
          ),
        }
      : {}),
    DATABASE_URL: database.url,
  };

  console.log(`[integration] base autorizada: ${database.databaseName}`);
  console.log("[integration] build");
  await runCommand(NPM, ["run", "build"], { root: ROOT, env });

  console.log("[integration] prisma validate");
  await runCommand(NPX, ["prisma", "validate"], { root: ROOT, env });

  console.log("[integration] prisma migrate reset");
  await runCommand(
    NPX,
    ["prisma", "migrate", "reset", "--force", "--skip-generate"],
    { root: ROOT, env },
  );

  console.log("[integration] seed demo");
  await runCommand(process.execPath, ["prisma/seed.js"], { root: ROOT, env });

  const api = startApi({ root: ROOT, env, port });

  try {
    console.log(`[integration] esperando API en ${baseUrl}`);
    await waitForHealth({
      url: `${baseUrl}/health`,
      child: api.child,
      timeoutMs: 25_000,
    });

    for (const smokeScript of SMOKES) {
      console.log(`[integration] smoke ${smokeScript}`);
      await runCommand(process.execPath, [smokeScript], { root: ROOT, env });
    }
  } catch (error) {
    const output = api.getOutput();
    if (output.stdout.trim()) console.error(`\n[qa-server stdout]\n${output.stdout.trim()}`);
    if (output.stderr.trim()) console.error(`\n[qa-server stderr]\n${output.stderr.trim()}`);
    throw error;
  } finally {
    await stopProcessTree(api.child);
    await runCommand(process.execPath, ["scripts/qa-cleanup.js"], { root: ROOT, env });
  }

  console.log("[integration] suite completa: PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
