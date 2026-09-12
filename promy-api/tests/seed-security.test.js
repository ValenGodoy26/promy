const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const seedFiles = [
  "seed.demo.js",
  "seed.local-real.js",
];

test("seed logs do not expose passwords or credential pairs", () => {
  for (const filename of seedFiles) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "prisma", filename),
      "utf8",
    );
    const logCalls = source.match(/console\.(?:log|info|warn|error)\s*\([\s\S]*?\);/g) ?? [];

    for (const call of logCalls) {
      assert.doesNotMatch(call, /password/i, `${filename} logs a password`);
      assert.doesNotMatch(
        call,
        /@[\w.-]+\s*\/\s*[^"'`)]+/i,
        `${filename} logs an email/password pair`,
      );
    }
  }
});
