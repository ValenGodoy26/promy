import { z } from "zod";
import prisma from "../../config/prisma";
import {
  DEFAULT_CITY_SLUG,
  GeoPoint,
  calculateDistanceKm,
  hasValidCoordinates,
} from "../../shared/utils/location";
import {
  buildPublicPromotionWhere,
  filterPublicPromotionsVisibleNow,
  isPromotionPubliclyVisibleNow,
} from "../../shared/utils/promotionStatus";
import {
  cleanText,
  ServiceError,
  withFullTextSearchFallback,
} from "../../shared/utils/service";

export const getPromotionsQuerySchema = z.object({
  category: z.string().trim().optional(),
  city: z.string().trim().optional(),
  commerceId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  lat: z.coerce.number().finite().optional(),
  lng: z.coerce.number().finite().optional(),
  radiusKm: z.coerce.number().min(0.1).max(100).optional(),
  fallbackCity: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type PromotionsQueryInput = z.infer<typeof getPromotionsQuerySchema>;

const promotionListSelect = {
  id: true,
  title: true,
  description: true,
  promotionType: true,
  validationMethod: true,
  discountValue: true,
  conditions: true,
  startDate: true,
  endDate: true,
  startTime: true,
  endTime: true,
  imageUrl: true,
  status: true,
  isFeatured: true,
  featuredRank: true,
  createdAt: true,
  updatedAt: true,
  commerce: {
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      address: true,
      latitude: true,
      longitude: true,
      logoUrl: true,
      coverUrl: true,
      city: {
        select: {
          id: true,
          name: true,
          province: true,
          slug: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
        },
      },
    },
  },
} as const;

function normalizePromotionsInput(input: PromotionsQueryInput): PromotionsQueryInput {
  return {
    ...input,
    category: cleanText(input.category),
    city: cleanText(input.city),
    search: cleanText(input.search),
    fallbackCity: cleanText(input.fallbackCity),
  };
}

function ensureValidGeoPair(input: PromotionsQueryInput) {
  const hasLat = input.lat != null;
  const hasLng = input.lng != null;

  if (hasLat !== hasLng) {
    throw new ServiceError("Lat y lng deben enviarse juntos", 400);
  }
}

function mapDistance<T extends { commerce: { latitude: number | null; longitude: number | null } }>(
  items: T[],
  origin: GeoPoint | null,
) {
  return items.map((item) => ({
    ...item,
    distanceKm:
      origin && hasValidCoordinates(item.commerce.latitude, item.commerce.longitude)
        ? calculateDistanceKm(origin, {
            latitude: item.commerce.latitude!,
            longitude: item.commerce.longitude!,
          })
        : null,
  }));
}

function sortByDistanceThen<T extends { distanceKm: number | null; title: string; createdAt: Date }>(
  items: T[],
  fallback: "title" | "createdAt",
) {
  return [...items].sort((left, right) => {
    if (left.distanceKm != null && right.distanceKm != null) {
      return left.distanceKm - right.distanceKm;
    }

    if (left.distanceKm != null) {
      return -1;
    }

    if (right.distanceKm != null) {
      return 1;
    }

    if (fallback === "createdAt") {
      return left.createdAt < right.createdAt ? 1 : -1;
    }

    return left.title.localeCompare(right.title);
  });
}

function limitPublicPromotions<T>(promotions: T[], limit?: number) {
  return limit ? promotions.slice(0, limit) : promotions;
}

function getPromotionSearchConditions(query: string, useNativeSearch: boolean) {
  const searchOperator = useNativeSearch ? { search: query } : { contains: query };

  return [
    { title: searchOperator },
    { description: searchOperator },
    { conditions: searchOperator },
    { commerce: { is: { name: searchOperator } } },
  ];
}

export async function getPromotionsCatalog(rawInput: PromotionsQueryInput) {
  const input = normalizePromotionsInput(rawInput);
  ensureValidGeoPair(input);
  const now = new Date();

  const origin =
    input.lat != null && input.lng != null
      ? ({ latitude: input.lat, longitude: input.lng } satisfies GeoPoint)
      : null;

  const findPromotionsCatalog = (useNativeSearch: boolean) =>
    prisma.promotion.findMany({
      where: {
        ...buildPublicPromotionWhere(now),
        commerce: {
          status: "APPROVED",
          ...(input.category
            ? {
                category: {
                  slug: input.category,
                },
              }
            : {}),
          ...(input.city
            ? {
                city: {
                  slug: input.city,
                },
              }
            : {}),
        },
        ...(input.commerceId ? { commerceId: input.commerceId } : {}),
        ...(input.search
          ? {
              OR: getPromotionSearchConditions(input.search, useNativeSearch),
            }
          : {}),
      },
      select: promotionListSelect,
      orderBy: [{ isFeatured: "desc" }, { featuredRank: "asc" }, { createdAt: "desc" }],
      ...(input.limit ? { take: input.limit } : {}),
    });

  const promotions = input.search
    ? await withFullTextSearchFallback(
        () => findPromotionsCatalog(true),
        () => findPromotionsCatalog(false),
        "promotions.service.getPromotionsCatalog",
      )
    : await findPromotionsCatalog(true);

  const visibleNow = filterPublicPromotionsVisibleNow(promotions, now);

  return sortByDistanceThen(mapDistance(visibleNow, origin), "createdAt");
}

export async function getFeaturedPromotionsCatalog() {
  const now = new Date();

  const promotions = await prisma.promotion.findMany({
    where: {
      ...buildPublicPromotionWhere(now),
      commerce: {
        status: "APPROVED",
      },
    },
    select: promotionListSelect,
    take: 24,
    orderBy: [{ isFeatured: "desc" }, { featuredRank: "asc" }, { createdAt: "desc" }],
  });

  return filterPublicPromotionsVisibleNow(promotions, now).slice(0, 8);
}

export async function getPromotionDetails(promotionId: number) {
  const now = new Date();

  const promotion = await prisma.promotion.findFirst({
    where: {
      id: promotionId,
      ...buildPublicPromotionWhere(now),
      commerce: {
        status: "APPROVED",
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      promotionType: true,
      validationMethod: true,
      discountValue: true,
      conditions: true,
      startDate: true,
      endDate: true,
      startTime: true,
      endTime: true,
      imageUrl: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      commerce: {
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          description: true,
          address: true,
          latitude: true,
          longitude: true,
          phone: true,
          instagram: true,
          logoUrl: true,
          coverUrl: true,
          city: {
            select: {
              id: true,
              name: true,
              province: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
            },
          },
        },
      },
    },
  });

  if (!promotion) {
    throw new ServiceError("Promocion no encontrada", 404);
  }

  if (!isPromotionPubliclyVisibleNow(promotion, now)) {
    throw new ServiceError("Promocion no encontrada", 404);
  }

  return promotion;
}

export async function getNearbyPromotionsCatalog(rawInput: PromotionsQueryInput) {
  const input = normalizePromotionsInput(rawInput);
  ensureValidGeoPair(input);
  const now = new Date();

  const origin =
    input.lat != null && input.lng != null
      ? ({ latitude: input.lat, longitude: input.lng } satisfies GeoPoint)
      : null;
  const effectiveCity = input.city || input.fallbackCity || DEFAULT_CITY_SLUG;
  const radiusKm = input.radiusKm ?? 8;
  const requestedLimit = input.limit ?? 50;

  const findNearbyPromotions = (useNativeSearch: boolean) =>
    prisma.promotion.findMany({
      where: {
        ...buildPublicPromotionWhere(now),
        commerce: {
          status: "APPROVED",
          ...(origin
            ? {}
            : {
                city: {
                  slug: effectiveCity,
                },
              }),
          ...(input.category
            ? {
                category: {
                  slug: input.category,
                },
              }
            : {}),
        },
        ...(input.commerceId ? { commerceId: input.commerceId } : {}),
        ...(input.search
          ? {
              OR: getPromotionSearchConditions(input.search, useNativeSearch),
            }
          : {}),
      },
      select: promotionListSelect,
      take: Math.min(requestedLimit * 3, 150),
    });

  const promotions = input.search
    ? await withFullTextSearchFallback(
        () => findNearbyPromotions(true),
        () => findNearbyPromotions(false),
        "promotions.service.getNearbyPromotionsCatalog",
      )
    : await findNearbyPromotions(true);

  const nearby = limitPublicPromotions(
    sortByDistanceThen(mapDistance(filterPublicPromotionsVisibleNow(promotions, now), origin), "title").filter(
      (promotion) => {
        if (!origin) {
          return true;
        }

        if (promotion.distanceKm == null) {
          return false;
        }

        return promotion.distanceKm <= radiusKm;
      },
    ),
    requestedLimit,
  );

  return {
    promotions: nearby,
    context: {
      source: origin ? "device" : "city_fallback",
      citySlug: effectiveCity,
      latitude: origin?.latitude ?? null,
      longitude: origin?.longitude ?? null,
      radiusKm,
    },
  };
}
