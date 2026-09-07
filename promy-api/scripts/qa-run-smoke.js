const path = require("path");
const {
  runCommand,
  startApi,
  stopProcessTree,
  waitForHealth,
} = require("./qa-process");

const ROOT = path.resolve(__dirname, "..");
const PORT = process.env.QA_PORT || "4017";
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function run() {
  const smokeScript = process.argv[2];
  if (!smokeScript) {
    throw new Error("Uso: node scripts/qa-run-smoke.js <script>");
  }

  const env = {
    ...process.env,
    PORT,
    QA_PORT: PORT,
    QA_BASE_URL: BASE_URL,
  };
  const api = startApi({ root: ROOT, env, port: PORT });

  try {
    await waitForHealth({
      url: `${BASE_URL}/health`,
      child: api.child,
      timeoutMs: 20_000,
    });
    await runCommand(process.execPath, [smokeScript], { root: ROOT, env });
  } catch (error) {
    const output = api.getOutput();
    if (output.stdout.trim()) console.error(`\n[qa-server stdout]\n${output.stdout.trim()}`);
    if (output.stderr.trim()) console.error(`\n[qa-server stderr]\n${output.stderr.trim()}`);
    throw error;
  } finally {
    await stopProcessTree(api.child);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
