require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const rateLimit = require("express-rate-limit").default;

const {
  buildExpressTrustProxy,
  discardUntrustedForwardedHeaders,
  parseTrustProxy,
} = require("../dist/config/proxy.js");

async function withServer(policy, configure, run) {
  const app = express();
  app.set("trust proxy", buildExpressTrustProxy(policy));
  app.use(discardUntrustedForwardedHeaders(policy));
  configure(app);

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

test("direct mode ignores and removes arbitrary forwarded headers", async () => {
  await withServer("none", (app) => {
    app.get("/ip", (req, res) => res.json({ ip: req.ip, forwarded: req.get("x-forwarded-for") }));
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ip`, {
      headers: {
        "X-Forwarded-For": "198.51.100.10",
        "X-Forwarded-Proto": "https",
      },
    });
    const body = await response.json();
    assert.equal(body.ip.includes("198.51.100.10"), false);
    assert.equal(body.forwarded, undefined);
  });
});

test("explicit loopback proxy policy interprets forwarded client IP", async () => {
  await withServer("loopback", (app) => {
    app.get("/ip", (req, res) => res.json({ ip: req.ip, ips: req.ips }));
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/ip`, {
      headers: { "X-Forwarded-For": "198.51.100.20" },
    });
    const body = await response.json();
    assert.equal(body.ip, "198.51.100.20");
    assert.deepEqual(body.ips, ["198.51.100.20"]);
  });
});

test("varying X-Forwarded-For cannot evade rate limiting in direct mode", async () => {
  await withServer("none", (app) => {
    app.use(rateLimit({ windowMs: 60_000, max: 2, standardHeaders: true, legacyHeaders: false }));
    app.get("/limited", (_req, res) => res.json({ ok: true }));
  }, async (baseUrl) => {
    const statuses = [];
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch(`${baseUrl}/limited`, {
        headers: { "X-Forwarded-For": `198.51.100.${attempt}` },
      });
      statuses.push(response.status);
    }
    assert.deepEqual(statuses, [200, 200, 429]);
  });
});

test("proxy configuration rejects hop counts, booleans, wildcards and invalid CIDR", () => {
  for (const value of ["1", "true", "*", "10.0.0.0/99", "not-a-proxy"])
    assert.throws(() => parseTrustProxy(value), /TRUST_PROXY/);

  assert.deepEqual(parseTrustProxy("10.0.0.10,10.0.1.0/24"), {
    mode: "explicit",
    entries: ["10.0.0.10", "10.0.1.0/24"],
  });
});
