require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const {
  loginLimiter,
  logoutLimiter,
  passwordResetLimiter,
  refreshLimiter,
  registrationLimiter,
  verificationLimiter,
} = require("../dist/middlewares/rateLimiters.js");

async function withServer(run) {
  const app = express();
  const ok = (_req, res) => res.json({ ok: true });

  app.post("/login", loginLimiter, ok);
  app.post("/refresh", refreshLimiter, ok);
  app.post("/register", registrationLimiter, ok);
  app.post("/verification", verificationLimiter, ok);
  app.post("/logout", logoutLimiter, ok);
  app.post("/reset", passwordResetLimiter, ok);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function post(baseUrl, path) {
  return fetch(`${baseUrl}${path}`, { method: "POST" });
}

test("refresh traffic does not consume registration, verification, logout or recovery budgets", async () => {
  await withServer(async (baseUrl) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      assert.equal((await post(baseUrl, "/refresh")).status, 200);
    }

    for (const path of ["/register", "/verification", "/logout", "/reset", "/login"]) {
      assert.equal((await post(baseUrl, path)).status, 200, `${path} fue bloqueado por refresh`);
    }

    const registrationStatuses = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      registrationStatuses.push((await post(baseUrl, "/register")).status);
    }
    assert.deepEqual(registrationStatuses, [...Array(9).fill(200), 429]);
    assert.equal((await post(baseUrl, "/refresh")).status, 200);
    assert.equal((await post(baseUrl, "/verification")).status, 200);
    assert.equal((await post(baseUrl, "/logout")).status, 200);
  });
});
