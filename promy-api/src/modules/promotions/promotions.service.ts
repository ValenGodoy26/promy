import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../../config/prisma";
import {
  FEATURED_PROMOTIONS_CACHE_KEY,
} from "../../shared/cache/publicCatalogCache";
import { sharedTtlCache } from "../../shared/cache/ttlCache";
import { findNearbyCommerceDistanceRows } from "../../shared/services/spatial.service";
import {
  DEFAULT_CITY_SLUG,
  GeoPoint,
  calculateDistanceKm,
  hasValidCoordinates,
} from "../../shared/utils/location";
import {
  buildPublicPromotionWhere,
  buildPublicCommerceWhere,
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
  lat: z.coerce.number().finite().min(-90).max(90).optional(),
  lng: z.coerce.number().finite().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(100).optional(),
  fallbackCity: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export type PromotionsQueryInput = z.infer<typeof getPromotionsQuerySchema>;

const promotionScheduleSelect = Prisma.validator<Prisma.PromotionScheduleFindManyArgs>()({
  select: {
    weekday: true,
    startTime: true,
    endTime: true,
  },
  orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
});

const promotionListSelect = Prisma.validator<Prisma.PromotionSelect>()({
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
  schedules: promotionScheduleSelect,
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
});

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

function getPaginationWindow(input: PromotionsQueryInput, fallbackLimit: number) {
  const limit = input.limit ?? fallbackLimit;
  const page = input.page ?? 1;
  const start = (page - 1) * limit;
  const end = start + limit;

  return { page, limit, start, end };
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
  const { page, limit, start } = getPaginationWindow(input, 24);

  const origin =
    input.lat != null && input.lng != null
      ? ({ latitude: input.lat, longitude: input.lng } satisfies GeoPoint)
      : null;

  const findPromotionsCatalog = (useNativeSearch: boolean) =>
    prisma.promotion.findMany({
      where: {
        ...buildPublicPromotionWhere(now),
        commerce: buildPublicCommerceWhere({
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
        }),
        ...(input.commerceId ? { commerceId: input.commerceId } : {}),
        ...(input.search
          ? {
              OR: getPromotionSearchConditions(input.search, useNativeSearch),
            }
          : {}),
      },
      select: promotionListSelect,
      orderBy: [{ isFeatured: "desc" }, { featuredRank: "asc" }, { createdAt: "desc" }],
      skip: start,
      take: limit + 1,
    });

  const promotions = input.search
    ? await withFullTextSearchFallback(
        () => findPromotionsCatalog(true),
        () => findPromotionsCatalog(false),
        "promotions.service.getPromotionsCatalog",
      )
    : await findPromotionsCatalog(true);

  const visibleNow = filterPublicPromotionsVisibleNow(promotions, now);
  const paged = visibleNow.slice(0, limit);

  return {
    promotions: sortByDistanceThen(mapDistance(paged, origin), "createdAt"),
    page,
    limit,
    hasMore: visibleNow.length > limit,
  };
}

export async function getFeaturedPromotionsCatalog() {
  const now = new Date();
  const promotionIds = await sharedTtlCache.getOrSet(FEATURED_PROMOTIONS_CACHE_KEY, 60 * 1000, () =>
    prisma.promotion.findMany({
      where: {
        ...buildPublicPromotionWhere(now),
      },
      select: { id: true },
      take: 24,
      orderBy: [{ isFeatured: "desc" }, { featuredRank: "asc" }, { createdAt: "desc" }],
    }).then((promotions) => promotions.map((promotion) => promotion.id)),
  );

  if (promotionIds.length === 0) {
    return [];
  }

  // Los IDs pueden vivir hasta 60 segundos, pero estado y contenido se releen siempre.
  // Así una invalidación perdida nunca vuelve a publicar contenido retirado.
  const promotions = await prisma.promotion.findMany({
    where: {
      id: { in: promotionIds },
      ...buildPublicPromotionWhere(now),
    },
    select: promotionListSelect,
  });
  const orderById = new Map(promotionIds.map((id, index) => [id, index]));

  return filterPublicPromotionsVisibleNow(promotions, now)
    .sort((left, right) => (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0))
    .slice(0, 8);
}

export async function getPromotionDetails(promotionId: number) {
  const now = new Date();

  const promotion = await prisma.promotion.findFirst({
    where: {
      id: promotionId,
      ...buildPublicPromotionWhere(now),
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
      schedules: {
        select: {
          weekday: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      },
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
  const { page, limit, start, end } = getPaginationWindow(input, 24);

  const origin =
    input.lat != null && input.lng != null
      ? ({ latitude: input.lat, longitude: input.lng } satisfies GeoPoint)
      : null;
  const effectiveCity = input.city || input.fallbackCity || DEFAULT_CITY_SLUG;
  const radiusKm = input.radiusKm ?? 8;
  const requestedLimit = limit;
  const expandedTake = Math.min(Math.max((end + 1) * 3, requestedLimit * 4), 300);
  const categoryRecord = input.category
    ? await prisma.category.findUnique({
        where: { slug: input.category },
        select: { id: true },
      })
    : null;

  if (input.category && !categoryRecord) {
    return {
      promotions: [],
      page,
      limit,
      hasMore: false,
      context: {
        source: origin ? "device" : "city_fallback",
        citySlug: effectiveCity,
        latitude: origin?.latitude ?? null,
        longitude: origin?.longitude ?? null,
        radiusKm,
      },
    };
  }

  const cityRecord = !origin && effectiveCity
    ? await prisma.city.findUnique({
        where: { slug: effectiveCity },
        select: { id: true },
      })
    : null;

  const findNearbyPromotions = (useNativeSearch: boolean) =>
    prisma.promotion.findMany({
      where: {
        ...buildPublicPromotionWhere(now),
        commerce: buildPublicCommerceWhere({
          ...(origin
            ? {}
            : cityRecord
            ? {
                cityId: cityRecord.id,
              }
            : {
                city: {
                  slug: effectiveCity,
                },
              }),
          ...(categoryRecord ? { categoryId: categoryRecord.id } : {}),
        }),
        ...(input.commerceId ? { commerceId: input.commerceId } : {}),
        ...(input.search
          ? {
              OR: getPromotionSearchConditions(input.search, useNativeSearch),
            }
          : {}),
      },
      select: promotionListSelect,
      ...(origin ? {} : { take: expandedTake }),
    });

  let promotions;
  let distanceMap = new Map<number, number>();

  if (origin) {
    const nearbyRows = await findNearbyCommerceDistanceRows(prisma, {
      origin,
      radiusKm,
      take: expandedTake,
      categoryId: categoryRecord?.id ?? null,
    });

    if (!nearbyRows.length) {
      return {
        promotions: [],
        page,
        limit,
        hasMore: false,
        context: {
          source: "device",
          citySlug: effectiveCity,
          latitude: origin.latitude,
          longitude: origin.longitude,
          radiusKm,
        },
      };
    }

    distanceMap = new Map(nearbyRows.map((row) => [row.id, row.distanceKm]));
    const nearbyCommerceIds = nearbyRows.map((row) => row.id);

    const findNearbyPromotionsByIds = (useNativeSearch: boolean) =>
      prisma.promotion.findMany({
        where: {
          ...buildPublicPromotionWhere(now),
          commerce: buildPublicCommerceWhere(),
          ...(input.commerceId ? { commerceId: input.commerceId } : {}),
          commerceId: {
            in: nearbyCommerceIds,
          },
          ...(input.search
            ? {
                OR: getPromotionSearchConditions(input.search, useNativeSearch),
              }
            : {}),
        },
        select: promotionListSelect,
        take: expandedTake,
      });

    promotions = input.search
      ? await withFullTextSearchFallback(
          () => findNearbyPromotionsByIds(true),
          () => findNearbyPromotionsByIds(false),
          "promotions.service.getNearbyPromotionsCatalog",
        )
      : await findNearbyPromotionsByIds(true);
  } else {
    promotions = input.search
      ? await withFullTextSearchFallback(
          () => findNearbyPromotions(true),
          () => findNearbyPromotions(false),
          "promotions.service.getNearbyPromotionsCatalog",
        )
      : await findNearbyPromotions(true);
  }

  const nearbyPool = sortByDistanceThen(
    filterPublicPromotionsVisibleNow(promotions, now).map((promotion) => ({
      ...promotion,
      distanceKm:
        origin &&
        hasValidCoordinates(promotion.commerce.latitude, promotion.commerce.longitude)
          ? distanceMap.get(promotion.commerce.id) ??
            calculateDistanceKm(origin, {
              latitude: promotion.commerce.latitude!,
              longitude: promotion.commerce.longitude!,
            })
          : null,
    })),
    "title",
  ).filter((promotion) => {
    if (!origin) {
      return true;
    }

    if (promotion.distanceKm == null) {
      return false;
    }

    return promotion.distanceKm <= radiusKm;
  });

  const nearby = nearbyPool.slice(start, end);

  return {
    promotions: nearby,
    page,
    limit,
    hasMore: nearbyPool.length > end,
    context: {
      source: origin ? "device" : "city_fallback",
      citySlug: effectiveCity,
      latitude: origin?.latitude ?? null,
      longitude: origin?.longitude ?? null,
      radiusKm,
    },
  };
}
