import { createClient } from "redis";
import { env } from "../../config/env";
import { logWarn } from "../logging/logger";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

class MemoryTtlStore {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
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
}

type MinimalRedisClient = Awaited<ReturnType<typeof createClient>>;

async function collectRedisKeysByPrefix(client: MinimalRedisClient, pattern: string) {
  const keys: string[] = [];

  for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    keys.push(String(key));
  }

  return keys;
}

export class TtlCache {
  private readonly memory = new MemoryTtlStore();
  private redisClient: MinimalRedisClient | null = null;
  private redisConnectingPromise: Promise<MinimalRedisClient | null> | null = null;
  private redisFailed = false;

  private getRedisCacheKey(key: string) {
    return `${env.REDIS_KEY_PREFIX}${key}`;
  }

  private async getRedisClient() {
    if (!env.REDIS_URL || this.redisFailed) {
      return null;
    }

    if (this.redisClient?.isOpen) {
      return this.redisClient;
    }

    if (this.redisConnectingPromise) {
      return this.redisConnectingPromise;
    }

    this.redisConnectingPromise = (async () => {
      try {
        const client = createClient({ url: env.REDIS_URL });
        client.on("error", (error) => {
          logWarn(
            undefined,
            "Redis emitio un error. Seguimos usando cache local en memoria.",
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        });
        await client.connect();
        this.redisClient = client;
        return client;
      } catch (error) {
        this.redisFailed = true;
        logWarn(
          undefined,
          "No pudimos conectar con Redis. Seguimos usando cache local en memoria.",
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        return null;
      } finally {
        this.redisConnectingPromise = null;
      }
    })();

    return this.redisConnectingPromise;
  }

  async get<T>(key: string): Promise<T | null> {
    const redisClient = await this.getRedisClient();

    if (redisClient) {
      const rawValue = await redisClient.get(this.getRedisCacheKey(key));
      if (!rawValue) {
        return null;
      }

      return JSON.parse(rawValue) as T;
    }

    return this.memory.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlMs: number) {
    const redisClient = await this.getRedisClient();

    if (redisClient) {
      await redisClient.set(this.getRedisCacheKey(key), JSON.stringify(value), {
        PX: ttlMs,
      });
      return;
    }

    this.memory.set(key, value, ttlMs);
  }

  async delete(key: string) {
    const redisClient = await this.getRedisClient();

    if (redisClient) {
      await redisClient.del(this.getRedisCacheKey(key));
      return;
    }

    this.memory.delete(key);
  }

  async deleteByPrefix(prefix: string) {
    const redisClient = await this.getRedisClient();

    if (redisClient) {
      const keys = await collectRedisKeysByPrefix(
        redisClient,
        `${this.getRedisCacheKey(prefix)}*`,
      );

      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return;
    }

    this.memory.deleteByPrefix(prefix);
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
    const redisClient = await this.getRedisClient();

    if (redisClient) {
      const keys = await collectRedisKeysByPrefix(
        redisClient,
        `${env.REDIS_KEY_PREFIX}*`,
      );

      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return;
    }

    this.memory.clear();
  }
}

export const sharedTtlCache = new TtlCache();
