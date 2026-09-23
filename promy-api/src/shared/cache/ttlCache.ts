import { createClient } from "redis";
import { env } from "../../config/env";
import { logWarn } from "../logging/logger";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export const DEFAULT_MEMORY_CACHE_MAX_ENTRIES = 500;
export const DEFAULT_MEMORY_CACHE_CLEANUP_INTERVAL_MS = 30_000;
// Redis is an optional optimization. These bounded deadlines keep it from extending an API request
// indefinitely when the service is absent, slow, or reconnecting.
export const DEFAULT_REDIS_CONNECT_TIMEOUT_MS = 250;
export const DEFAULT_REDIS_COMMAND_TIMEOUT_MS = 250;
export const DEFAULT_REDIS_CLOSE_TIMEOUT_MS = 250;
export const DEFAULT_REDIS_RETRY_DELAY_MS = 500;
export const DEFAULT_REDIS_MAX_RECONNECT_RETRIES = 1;
export const REDIS_SCAN_COUNT = 100;
export const REDIS_DELETE_BATCH_SIZE = 100;

export type MemoryTtlStoreStats = {
  entries: number;
  maxEntries: number;
  evictions: number;
  expiredEntriesRemoved: number;
};

export class MemoryTtlStore {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private evictions = 0;
  private expiredEntriesRemoved = 0;

  constructor(
    private readonly maxEntries = DEFAULT_MEMORY_CACHE_MAX_ENTRIES,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new Error("Memory cache maxEntries must be a positive integer");
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      this.expiredEntriesRemoved += 1;
      return null;
    }

    // Refresh insertion order so the first key remains the least recently used.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number) {
    this.deleteExpired();
    this.store.delete(key);
    this.store.set(key, {
      value,
      expiresAt: this.now() + Math.max(0, ttlMs),
    });

    while (this.store.size > this.maxEntries) {
      const leastRecentlyUsedKey = this.store.keys().next().value as string | undefined;
      if (leastRecentlyUsedKey === undefined) break;
      this.store.delete(leastRecentlyUsedKey);
      this.evictions += 1;
    }
  }

  delete(key: string) {
    this.store.delete(key);
  }

  deleteByPrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }

  deleteExpired() {
    const now = this.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
        this.expiredEntriesRemoved += 1;
      }
    }
  }

  getStats(): MemoryTtlStoreStats {
    return {
      entries: this.store.size,
      maxEntries: this.maxEntries,
      evictions: this.evictions,
      expiredEntriesRemoved: this.expiredEntriesRemoved,
    };
  }
}

type MinimalRedisClient = Awaited<ReturnType<typeof createClient>>;

function waitWithin<T>(operation: Promise<T>, timeoutMs: number, label: string) {
  let timeout: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} excedio ${timeoutMs}ms`)), timeoutMs);
    timeout.unref?.();
  });

  return Promise.race([operation, deadline]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export async function collectRedisKeysByPrefix(client: MinimalRedisClient, pattern: string) {
  const keys: string[] = [];

  // node-redis 5 yields a string[] for each SCAN reply, not one scalar key at a time.
  // Flatten every reply so DEL/UNLINK receive keys rather than a serialized nested batch.
  for await (const batch of client.scanIterator({ MATCH: pattern, COUNT: REDIS_SCAN_COUNT })) {
    for (const key of Array.isArray(batch) ? batch : [batch]) {
      keys.push(String(key));
    }
  }

  return keys;
}

export class TtlCache {
  private readonly memory: MemoryTtlStore;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;
  private readonly redisUrl: () => string | undefined;
  private readonly redisKeyPrefix: string;
  private readonly redisConnectTimeoutMs: number;
  private readonly redisCommandTimeoutMs: number;
  private readonly redisCloseTimeoutMs: number;
  private readonly redisRetryDelayMs: number;
  private readonly redisMaxReconnectRetries: number;
  private readonly now: () => number;
  private redisClient: MinimalRedisClient | null = null;
  private redisPendingClient: MinimalRedisClient | null = null;
  private redisConnectingPromise: Promise<MinimalRedisClient | null> | null = null;
  private abortRedisConnect: (() => void) | null = null;
  private redisNextRetryAt = 0;
  private closed = false;

  constructor(options?: {
    memoryMaxEntries?: number;
    memoryCleanupIntervalMs?: number;
    now?: () => number;
    setIntervalFn?: typeof setInterval;
    redisUrl?: () => string | undefined;
    redisKeyPrefix?: string;
    redisConnectTimeoutMs?: number;
    redisCommandTimeoutMs?: number;
    redisCloseTimeoutMs?: number;
    redisRetryDelayMs?: number;
    redisMaxReconnectRetries?: number;
  }) {
    this.now = options?.now ?? Date.now;
    this.memory = new MemoryTtlStore(options?.memoryMaxEntries, this.now);
    this.redisUrl = options?.redisUrl ?? (() => env.REDIS_URL);
    this.redisKeyPrefix = options?.redisKeyPrefix ?? env.REDIS_KEY_PREFIX;
    this.redisConnectTimeoutMs =
      options?.redisConnectTimeoutMs ?? DEFAULT_REDIS_CONNECT_TIMEOUT_MS;
    this.redisCommandTimeoutMs =
      options?.redisCommandTimeoutMs ?? DEFAULT_REDIS_COMMAND_TIMEOUT_MS;
    this.redisCloseTimeoutMs = options?.redisCloseTimeoutMs ?? DEFAULT_REDIS_CLOSE_TIMEOUT_MS;
    this.redisRetryDelayMs = options?.redisRetryDelayMs ?? DEFAULT_REDIS_RETRY_DELAY_MS;
    this.redisMaxReconnectRetries =
      options?.redisMaxReconnectRetries ?? DEFAULT_REDIS_MAX_RECONNECT_RETRIES;
    const intervalMs =
      options?.memoryCleanupIntervalMs ?? DEFAULT_MEMORY_CACHE_CLEANUP_INTERVAL_MS;
    const setIntervalFn = options?.setIntervalFn ?? setInterval;
    this.cleanupTimer = setIntervalFn(() => this.memory.deleteExpired(), intervalMs);
    this.cleanupTimer.unref?.();
  }

  getMemoryStats() {
    return this.memory.getStats();
  }

  private getRedisCacheKey(key: string) {
    return `${this.redisKeyPrefix}${key}`;
  }

  private destroyRedisClient(client: MinimalRedisClient | null) {
    if (!client) return;
    try {
      client.destroy();
    } catch {
      // A best-effort cache teardown must never affect the caller.
    }
  }

  private markRedisUnavailable(client: MinimalRedisClient | null, error: unknown, message: string) {
    if (this.closed) return;
    if (this.redisClient === client) this.redisClient = null;
    this.redisNextRetryAt = this.now() + this.redisRetryDelayMs;
    this.destroyRedisClient(client);
    logWarn(undefined, message, {
      error: error instanceof Error ? error.message : String(error),
      retryAfterMs: this.redisRetryDelayMs,
    });
  }

  private async getRedisClient() {
    const redisUrl = this.redisUrl();
    if (!redisUrl || this.closed || this.now() < this.redisNextRetryAt) {
      return null;
    }

    if (this.redisClient?.isReady) {
      return this.redisClient;
    }

    if (this.redisConnectingPromise) {
      return this.redisConnectingPromise;
    }

    this.redisConnectingPromise = (async () => {
      let client: MinimalRedisClient | null = null;
      try {
        client = createClient({
          url: redisUrl,
          disableOfflineQueue: true,
          socket: {
            connectTimeout: this.redisConnectTimeoutMs,
            reconnectStrategy: (retries) => {
              if (retries >= this.redisMaxReconnectRetries) return false;
              return this.redisRetryDelayMs;
            },
          },
        });
        this.redisPendingClient = client;
        const aborted = new Promise<never>((_resolve, reject) => {
          this.abortRedisConnect = () => reject(new Error("La conexion Redis fue cancelada"));
        });
        client.on("error", (error) => {
          this.markRedisUnavailable(
            client,
            error,
            "Redis emitio un error. Seguimos usando cache local en memoria.",
          );
        });
        await waitWithin(
          Promise.race([client.connect(), aborted]),
          this.redisConnectTimeoutMs,
          "La conexion con Redis",
        );
        if (this.closed) {
          this.destroyRedisClient(client);
          return null;
        }
        this.redisClient = client;
        return client;
      } catch (error) {
        this.markRedisUnavailable(
          client,
          error,
          "No pudimos conectar con Redis. Seguimos usando cache local en memoria.",
        );
        return null;
      } finally {
        if (this.redisPendingClient === client) this.redisPendingClient = null;
        this.abortRedisConnect = null;
        this.redisConnectingPromise = null;
      }
    })();

    return this.redisConnectingPromise;
  }

  private async useRedis<T>(operation: (client: MinimalRedisClient) => Promise<T>) {
    const redisClient = await this.getRedisClient();
    if (!redisClient) return { available: false as const };

    try {
      const value = await waitWithin(
        operation(redisClient),
        this.redisCommandTimeoutMs,
        "El comando Redis",
      );
      return { available: true as const, value };
    } catch (error) {
      this.markRedisUnavailable(
        redisClient,
        error,
        "Redis no respondio a tiempo. Seguimos usando cache local en memoria.",
      );
      return { available: false as const };
    }
  }

  private async deleteRedisKeys(redisClient: MinimalRedisClient, keys: string[]) {
    for (let index = 0; index < keys.length; index += REDIS_DELETE_BATCH_SIZE) {
      const batch = keys.slice(index, index + REDIS_DELETE_BATCH_SIZE);
      if (batch.length > 0) await redisClient.unlink(batch);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const remote = await this.useRedis((redisClient) => redisClient.get(this.getRedisCacheKey(key)));
    if (remote.available) {
      const rawValue = remote.value;
      if (!rawValue) {
        return null;
      }

      try {
        return JSON.parse(rawValue) as T;
      } catch (error) {
        logWarn(undefined, "Redis devolvio un valor de cache invalido.", {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }

    return this.memory.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlMs: number) {
    this.memory.set(key, value, ttlMs);
    await this.useRedis((redisClient) =>
      redisClient.set(this.getRedisCacheKey(key), JSON.stringify(value), {
        PX: ttlMs,
      }),
    );
  }

  async delete(key: string) {
    this.memory.delete(key);
    await this.useRedis((redisClient) => redisClient.unlink(this.getRedisCacheKey(key)));
  }

  async deleteByPrefix(prefix: string) {
    this.memory.deleteByPrefix(prefix);
    await this.useRedis(async (redisClient) => {
      const keys = await collectRedisKeysByPrefix(
        redisClient,
        `${this.getRedisCacheKey(prefix)}*`,
      );

      if (keys.length > 0) {
        await this.deleteRedisKeys(redisClient, keys);
      }
    });
  }

  async getOrSet<T>(key: string, ttlMs: number, factory: () => Promise<T>) {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlMs);
    return value;
  }

  async clear() {
    this.memory.clear();
    await this.useRedis(async (redisClient) => {
      const keys = await collectRedisKeysByPrefix(
        redisClient,
        `${this.redisKeyPrefix}*`,
      );

      if (keys.length > 0) {
        await this.deleteRedisKeys(redisClient, keys);
      }
    });
  }

  async close() {
    this.closed = true;
    clearInterval(this.cleanupTimer);
    this.memory.clear();
    const pendingClient = this.redisPendingClient;
    const client = this.redisClient ?? pendingClient;
    this.redisClient = null;
    this.redisPendingClient = null;
    this.abortRedisConnect?.();
    if (!client) return;

    // A client that has not completed connect() cannot close gracefully without waiting for the
    // socket deadline. Destroy it so shutdown keeps its global deadline.
    if (client === pendingClient) {
      this.destroyRedisClient(client);
      return;
    }

    try {
      await waitWithin(client.close(), this.redisCloseTimeoutMs, "El cierre de Redis");
    } catch {
      this.destroyRedisClient(client);
    }
  }
}

export const sharedTtlCache = new TtlCache();
