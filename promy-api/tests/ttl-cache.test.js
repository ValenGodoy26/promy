require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MemoryTtlStore,
  TtlCache,
} = require("../dist/shared/cache/ttlCache.js");

test("memory TTL store expires entries, overwrites values and preserves valid entries", () => {
  let now = 1_000;
  const store = new MemoryTtlStore(3, () => now);

  store.set("valid", "first", 100);
  store.set("valid", "second", 200);
  store.set("expired", "gone", 10);
  now = 1_011;

  assert.equal(store.get("valid"), "second");
  store.deleteExpired();
  assert.equal(store.get("expired"), null);
  assert.deepEqual(store.getStats(), {
    entries: 1,
    maxEntries: 3,
    evictions: 0,
    expiredEntriesRemoved: 1,
  });
});

test("memory TTL store remains bounded and evicts the least recently used key", () => {
  const store = new MemoryTtlStore(3, () => 1_000);
  store.set("a", 1, 1_000);
  store.set("b", 2, 1_000);
  store.set("c", 3, 1_000);
  assert.equal(store.get("a"), 1);
  store.set("d", 4, 1_000);

  assert.equal(store.get("b"), null);
  assert.equal(store.get("a"), 1);
  assert.equal(store.get("d"), 4);
  assert.equal(store.getStats().entries, 3);
  assert.equal(store.getStats().evictions, 1);

  for (let index = 0; index < 10_000; index += 1) {
    store.set(`key:${index}`, index, 1_000);
  }
  assert.equal(store.getStats().entries, 3);
});

test("delete and prefix invalidation continue to work", () => {
  const store = new MemoryTtlStore(10, () => 1_000);
  store.set("categories:all", 1, 1_000);
  store.set("categories:city:1", 2, 1_000);
  store.set("cities:all", 3, 1_000);
  store.delete("cities:all");
  store.deleteByPrefix("categories:");

  assert.equal(store.getStats().entries, 0);
});

test("periodic cleanup removes unread expired entries and close clears the unref timer", async () => {
  let now = 1_000;
  let cleanup;
  let unrefCalled = false;
  let clearedTimer;
  const originalClearInterval = global.clearInterval;
  const fakeTimer = {
    unref() {
      unrefCalled = true;
    },
  };

  global.clearInterval = (timer) => {
    clearedTimer = timer;
  };

  try {
    const cache = new TtlCache({
      memoryMaxEntries: 5,
      memoryCleanupIntervalMs: 25,
      now: () => now,
      setIntervalFn(callback) {
        cleanup = callback;
        return fakeTimer;
      },
    });

    await cache.set("unread", "value", 10);
    now = 1_011;
    cleanup();
    assert.equal(cache.getMemoryStats().entries, 0);
    assert.equal(cache.getMemoryStats().expiredEntriesRemoved, 1);
    assert.equal(unrefCalled, true);

    await cache.close();
    assert.equal(clearedTimer, fakeTimer);
  } finally {
    global.clearInterval = originalClearInterval;
  }
});
