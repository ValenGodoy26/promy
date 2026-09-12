const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const sourcePath = path.resolve(__dirname, "../src/api/client.ts");
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  fileName: sourcePath,
}).outputText;

const authHandlers = {
  getAccessToken: () => null,
  refreshAccessToken: async () => null,
  clearSession: async () => undefined,
};
const moduleUnderTest = { exports: {} };
const localRequire = (specifier) => {
  if (specifier === "./base") {
    return { API_BASE_URL: "https://primary.test", API_BASE_URL_CANDIDATES: ["https://primary.test", "https://fallback.test"] };
  }
  if (specifier === "./errors") return { ApiError };
  if (specifier === "./authBridge") return { authHandlers };
  throw new Error(`Unexpected test dependency: ${specifier}`);
};
new Function("exports", "require", "module", "__filename", "__dirname", compiled)(
  moduleUnderTest.exports,
  localRequire,
  moduleUnderTest,
  sourcePath,
  path.dirname(sourcePath),
);

const { apiRequest } = moduleUnderTest.exports;

async function main() {
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    if (url.startsWith("https://primary.test")) throw new TypeError("synthetic network loss");
    return { status: 200, ok: true, text: async () => '{"ok":true}' };
  };
  const recovered = await apiRequest("/catalog", { method: "GET", auth: false });
  assert.equal(recovered.ok, true);
  assert.deepEqual(calls, ["https://primary.test/catalog", "https://fallback.test/catalog"]);

  calls.length = 0;
  await assert.rejects(
    apiRequest("/redemptions", { method: "POST", auth: false, body: { promotionId: 1 } }),
    (error) => error?.status === 0,
  );
  assert.deepEqual(calls, ["https://primary.test/redemptions"]);

  console.log("[mobile-network] PASS GET fallback=1 POST replay=0");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
