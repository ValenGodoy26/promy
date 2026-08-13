const path = require("path");
const { fork, spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_PORT = process.env.QA_PORT || "4017";
const DEFAULT_BASE_URL = `http://localhost:${DEFAULT_PORT}/api`;
const HEALTH_URL = `${DEFAULT_BASE_URL}/health`;
const START_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(HEALTH_URL);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Healthcheck devolvio ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw lastError || new Error("Timeout esperando /health");
}

function killProcessTree(child) {
  if (!child || child.exitCode != null || child.killed) {
    return;
  }

  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        shell: false,
      });
      return;
    }

    child.kill("SIGTERM");
  } catch {
    // noop
  }
}

async function run() {
  const smokeScript = process.argv[2];

  if (!smokeScript) {
    console.error("Uso: node scripts/qa-run-smoke.js <script>");
    process.exit(1);
  }

  const server = fork(path.join(ROOT, "dist/server.js"), [], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: DEFAULT_PORT,
    },
    silent: true,
  });

  let stdout = "";
  let stderr = "";

  server.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  server.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForHealth(START_TIMEOUT_MS);

    await new Promise((resolve, reject) => {
      const smoke = fork(path.join(ROOT, smokeScript), [], {
        cwd: ROOT,
        env: {
          ...process.env,
          QA_BASE_URL: DEFAULT_BASE_URL,
        },
        silent: false,
      });

      smoke.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`Smoke QA fallo con exit code ${code}`));
      });

      smoke.on("error", reject);
    });
  } catch (error) {
    if (stdout.trim()) {
      console.error("\n[qa-server stdout]\n" + stdout.trim());
    }
    if (stderr.trim()) {
      console.error("\n[qa-server stderr]\n" + stderr.trim());
    }

    throw error;
  } finally {
    killProcessTree(server);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
