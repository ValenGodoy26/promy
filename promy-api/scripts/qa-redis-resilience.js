require("dotenv/config");

const assert = require("node:assert/strict");
const net = require("node:net");
const { createClient } = require("redis");
const { TtlCache } = require("../dist/shared/cache/ttlCache.js");

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL es obligatorio para el harness Redis");
}

const prefix = `promy:block14:${process.pid}:`;

function within(operation, timeoutMs, label) {
  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} excedio ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([operation, deadline]).finally(() => clearTimeout(timeout));
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `redis://127.0.0.1:${server.address().port}`;
}

async function scanKeys(client, pattern, count = 25) {
  const keys = [];
  let batches = 0;
  for await (const batch of client.scanIterator({ MATCH: pattern, COUNT: count })) {
    batches += 1;
    keys.push(...batch);
  }
  return { keys, batches };
}

function makeCache(url) {
  return new TtlCache({
    redisUrl: () => url ?? redisUrl,
    redisKeyPrefix: prefix,
    redisConnectTimeoutMs: 150,
    redisCommandTimeoutMs: 150,
    redisCloseTimeoutMs: 150,
    redisRetryDelayMs: 40,
    memoryCleanupIntervalMs: 60_000,
  });
}

async function verifyFallback(label, url) {
  const cache = new TtlCache({
    redisUrl: () => url,
    redisKeyPrefix: prefix,
    redisConnectTimeoutMs: 150,
    redisCommandTimeoutMs: 150,
    redisCloseTimeoutMs: 150,
    redisRetryDelayMs: 40,
    memoryCleanupIntervalMs: 60_000,
  });
  try {
    await within(cache.set(`${label}:value`, label, 5_000), 1_000, `${label} set`);
    assert.equal(
      await within(cache.get(`${label}:value`), 1_000, `${label} get`),
      label,
    );
  } finally {
    await within(cache.close(), 1_000, `${label} close`);
  }
}

async function main() {
  const raw = createClient({ url: redisUrl });
  raw.on("error", (error) => {
    throw error;
  });
  await raw.connect();

  const cacheA = makeCache(redisUrl);
  const cacheB = makeCache(redisUrl);
  const recoveryCache = makeCache(redisUrl);
  const slowSockets = new Set();
  const slowServer = net.createServer((socket) => {
    slowSockets.add(socket);
    socket.on("close", () => slowSockets.delete(socket));
    socket.on("error", () => undefined);
  });
  const slowUrl = await listen(slowServer);

  try {
    await cacheA.set("healthy", { source: "redis" }, 5_000);
    assert.deepEqual(await cacheB.get("healthy"), { source: "redis" });

    const matching = Array.from({ length: 350 }, (_value, index) => `${prefix}categories:${index}`);
    const foreign = Array.from({ length: 9 }, (_value, index) => `${prefix}cities:${index}`);
    const seed = raw.multi();
    for (const key of [...matching, ...foreign]) seed.set(key, "seed");
    await seed.exec();

    const before = await scanKeys(raw, `${prefix}categories:*`, 10);
    assert(before.batches > 1, "SCAN debe recorrer multiples batches");
    assert.equal(before.keys.length, matching.length);

    await cacheA.deleteByPrefix("categories:");
    const remainingMatching = await scanKeys(raw, `${prefix}categories:*`);
    const remainingForeign = await scanKeys(raw, `${prefix}cities:*`);
    assert.equal(remainingMatching.keys.length, 0);
    assert.equal(remainingForeign.keys.length, foreign.length);

    await verifyFallback("redis-off", undefined);
    await verifyFallback("closed-port", "redis://127.0.0.1:6399");
    await verifyFallback("unresolvable", "redis://promy-redis-unresolvable.invalid:6379");
    await verifyFallback("slow", slowUrl);

    await recoveryCache.set("recovery", "available-before-drop", 5_000);
    await raw.sendCommand(["CLIENT", "KILL", "TYPE", "normal", "SKIPME", "yes"]);
    await within(recoveryCache.get("recovery"), 1_000, "post-drop cache get");
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.deepEqual(
      await within(recoveryCache.get("healthy"), 1_000, "recovered cache get"),
      { source: "redis" },
    );

    console.log(
      JSON.stringify({
        harness: "redis-resilience",
        redis: "on",
        scan: { matching: matching.length, batches: before.batches, foreignPreserved: foreign.length },
        fallback: ["off", "closed-port", "unresolvable", "slow"],
        recovery: "client-kill-then-reconnect",
        shutdown: "bounded-close-covered-by-unit-regression",
        status: "PASS",
      }),
    );
  } finally {
    const leftovers = await scanKeys(raw, `${prefix}*`);
    for (const key of leftovers.keys) await raw.unlink(key);
    await Promise.allSettled([cacheA.close(), cacheB.close(), recoveryCache.close()]);
    for (const socket of slowSockets) socket.destroy();
    await new Promise((resolve) => slowServer.close(resolve));
    await raw.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
