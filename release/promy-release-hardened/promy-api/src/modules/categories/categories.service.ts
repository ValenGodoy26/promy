import { z } from "zod";
import prisma from "../../config/prisma";
import { sharedTtlCache } from "../../shared/cache/ttlCache";
import { cleanText } from "../../shared/utils/service";

export const getCategoriesQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export async function getCategoriesCatalog(
  query: z.infer<typeof getCategoriesQuerySchema>,
) {
  const search = cleanText(query.search);
  const cacheKey = `categories:${search || "__all__"}`;

  const categories = await sharedTtlCache.getOrSet(cacheKey, 2 * 60 * 1000, () =>
    prisma.category.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              name: {
                contains: search,
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        isActive: true,
        _count: {
          select: {
            commerces: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
  );

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    isActive: category.isActive,
    commerceCount: category._count.commerces,
  }));
}
