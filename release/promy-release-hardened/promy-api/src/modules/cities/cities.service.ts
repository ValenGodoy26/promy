import { z } from "zod";
import prisma from "../../config/prisma";
import { sharedTtlCache } from "../../shared/cache/ttlCache";
import { cleanText } from "../../shared/utils/service";

export const getCitiesQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export async function getCitiesCatalog(query: z.infer<typeof getCitiesQuerySchema>) {
  const search = cleanText(query.search);
  const cacheKey = `cities:${search || "__all__"}`;

  return sharedTtlCache.getOrSet(cacheKey, 2 * 60 * 1000, () =>
    prisma.city.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                  },
                },
                {
                  province: {
                    contains: search,
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        province: true,
        slug: true,
        isActive: true,
      },
      orderBy: [{ province: "asc" }, { name: "asc" }],
    }),
  );
}
