import { sharedTtlCache } from "./ttlCache";

export const FEATURED_PROMOTIONS_CACHE_KEY = "promotions:featured";

export async function invalidatePublicCatalogCache() {
  await sharedTtlCache.delete(FEATURED_PROMOTIONS_CACHE_KEY);
}
