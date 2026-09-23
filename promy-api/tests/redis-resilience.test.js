require("dotenv/config");
const assert = require("node:assert/strict");
const net = require("node:net");
const test = require("node:test");

const {
  TtlCache,
  collectRedisKeysByPrefix,
} = require("../dist/shared/cache/ttlCache.js");

function within(operation, timeoutMs, label) {
  return Promise.race([
    operation,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `redis://127.0.0.1:${server.address().port}`;
}

async function closeServer(server, sockets) {
  for (const socket of sockets) socket.destroy();
  await new Promise((resolve) => server.close(resolve));
}

test("node-redis v5 SCAN batches are flattened before prefix invalidation", async () => {
  const seenOptions = [];
  const fakeClient = {
    async *scanIterator(options) {
      seenOptions.push(options);
      yield ["promy:cache:categories:1", "promy:cache:categories:2"];
      yield ["promy:cache:categories:3"];
      yield [];
    },
  };

  const keys = await collectRedisKeysByPrefix(fakeClient, "promy:cache:categories:*");
  assert.deepEqual(keys, [
    "promy:cache:categories:1",
    "promy:cache:categories:2",
    "promy:cache:categories:3",
  ]);
  assert.deepEqual(seenOptions, [{ MATCH: "promy:cache:categories:*", COUNT: 100 }]);
});

test("missing Redis keeps the bounded in-memory fallback available", async () => {
  const cache = new TtlCache({ redisUrl: () => undefined, memoryCleanupIntervalMs: 60_000 });
  try {
    await cache.set("fallback", { source: "memory" }, 5_000);
    assert.deepEqual(await cache.get("fallback"), { source: "memory" });
  } finally {
    await cache.close();
  }
});

test("closed and slow Redis endpoints fall back without hanging", async () => {
  const sockets = new Set();
  const slowServer = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => undefined);
  });
  const slowUrl = await listen(slowServer);

  const scenarios = [
    ["closed", "redis://127.0.0.1:6399"],
    ["slow", slowUrl],
    ["unresolvable", "redis://promy-redis-unresolvable.invalid:6379"],
  ];

  try {
    for (const [name, url] of scenarios) {
      const cache = new TtlCache({
        redisUrl: () => url,
        redisConnectTimeoutMs: 40,
        redisCommandTimeoutMs: 40,
        redisRetryDelayMs: 10,
        memoryCleanupIntervalMs: 60_000,
      });
      try {
        await within(cache.set(`${name}:key`, name, 5_000), 500, `${name} set`);
        assert.equal(
          await within(cache.get(`${name}:key`), 500, `${name} get`),
          name,
        );
      } finally {
        await within(cache.close(), 500, `${name} close`);
      }
    }
  } finally {
    await closeServer(slowServer, sockets);
  }
});

test("cache shutdown destroys a pending Redis connection instead of waiting for it", async () => {
  const sockets = new Set();
  const slowServer = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => undefined);
  });
  const slowUrl = await listen(slowServer);
  const cache = new TtlCache({
    redisUrl: () => slowUrl,
    redisConnectTimeoutMs: 1_000,
    redisCloseTimeoutMs: 40,
    memoryCleanupIntervalMs: 60_000,
  });

  try {
    const pendingGet = cache.get("shutdown");
    await within(cache.close(), 500, "cache close");
    assert.equal(await within(pendingGet, 500, "pending cache get"), null);
  } finally {
    await closeServer(slowServer, sockets);
  }
});
