import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const requirePattern = (relative, pattern, message) => {
  if (!pattern.test(read(relative))) throw new Error(`${message} (${relative})`);
};
const rejectPattern = (relative, pattern, message) => {
  if (pattern.test(read(relative))) throw new Error(`${message} (${relative})`);
};

rejectPattern("promy-mobile/src/api/base.ts", /process\.env\s*\[/, "Dynamic Expo public env lookup returned");
requirePattern("promy-mobile/src/api/client.ts", /configuredTargets\.slice\(0, 1\)/, "Mobile mutations may retry across hosts");
requirePattern("promy-mobile/src/api/client.ts", /await response\.text\(\)[\s\S]*finally[\s\S]*clearTimeout/, "Mobile deadline does not cover body consumption");
requirePattern("promy-web/src/lib/api.ts", /AbortController[\s\S]*await response\.json[\s\S]*clearTimeout/, "Web request deadline missing");
requirePattern("promy-landing/src/App.tsx", /fetchJsonWithDeadline/, "Landing request deadline missing");
requirePattern("promy-api/src/shared/services/email.service.ts", /withRequestDeadline\(10_000/, "Email provider deadline missing");
requirePattern("promy-api/src/server.ts", /uncaughtException[\s\S]*shutdown\("uncaughtException", 1\)/, "Fatal exception does not shut down");
requirePattern("promy-api/src/server.ts", /closeAllRealtimeClients/, "Shutdown does not close SSE clients");

const integration = read("promy-api/scripts/run-integration-suite.js");
for (const smoke of [
  "qa-auth-smoke.js",
  "qa-rate-limit-smoke.js",
  "qa-commerce-onboarding-smoke.js",
  "qa-uploads-smoke.js",
  "qa-promotion-lifecycle-smoke.js",
  "qa-real-e2e-smoke.js",
  "qa-account-deletion-smoke.js",
  "qa-expiration-smoke.js",
  "qa-domain-integrity-smoke.js",
  "qa-auth-security-smoke.js",
  "qa-privacy-smoke.js",
  "qa-api-correctness-smoke.js",
  "qa-data-security-smoke.js",
  "qa-pagination-smoke.js",
]) {
  if (!integration.includes(smoke)) throw new Error(`Critical smoke missing from integration runner: ${smoke}`);
}

const workflow = read(".github/workflows/promy-ci.yml");
for (const gate of [
  "npm run test:integration",
  "npm test",
  "CSV security tests",
  "Verify safe network fallback policy",
  "Verify inlined API configuration",
  "Verify manifest, checksums and exclusions",
  "Release Artifact",
]) {
  if (!workflow.includes(gate)) throw new Error(`CI gate missing: ${gate}`);
}

console.log("[operational-gates] PASS");
