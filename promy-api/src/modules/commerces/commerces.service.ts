import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../../config/prisma";
import {
  DEFAULT_CITY_SLUG,
  GeoPoint,
  calculateDistanceKm,
  hasValidCoordinates,
} from "../../shared/utils/location";
import { findNearbyCommerceDistanceRows } from "../../shared/services/spatial.service";
import {
  buildPublicPromotionWhere,
  filterPublicPromotionsVisibleNow,
} from "../../shared/utils/promotionStatus";
import {
  cleanText,
  ServiceError,
  withFullTextSearchFallback,
} from "../../shared/utils/service";

export const getCommercesQuerySchema = z.object({
  category: z.string().trim().optional(),
  city: z.string().trim().optional(),
  search: z.string().trim().optional(),
  lat: z.coerce.number().finite().min(-90).max(90).optional(),
  lng: z.coerce.number().finite().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(100).optional(),
  fallbackCity: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export type CommercesQueryInput = z.infer<typeof getCommercesQuerySchema>;

function getCommerceListSelect(now: Date) {
  const promotionScheduleSelect = Prisma.validator<Prisma.PromotionScheduleFindManyArgs>()({
    select: {
      weekday: true,
      startTime: true,
      endTime: true,
    },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });

  return Prisma.validator<Prisma.CommerceSelect>()({
    id: true,
    name: true,
    slug: true,
    shortDescription: true,
    address: true,
    latitude: true,
    longitude: true,
    phone: true,
    instagram: true,
    logoUrl: true,
    coverUrl: true,
    status: true,
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
    promotions: {
      where: buildPublicPromotionWhere(now),
      select: {
        id: true,
        title: true,
        description: true,
        promotionType: true,
        validationMethod: true,
        discountValue: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        schedules: promotionScheduleSelect,
        imageUrl: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc" as const,
      },
    },
  });
}

function normalizeCommercesInput(input: CommercesQueryInput): CommercesQueryInput {
  return {
    ...input,
    category: cleanText(input.category),
    city: cleanText(input.city),
    search: cleanText(input.search),
    fallbackCity: cleanText(input.fallbackCity),
  };
}

function ensureValidGeoPair(input: CommercesQueryInput) {
  const hasLat = input.lat != null;
  const hasLng = input.lng != null;

  if (hasLat !== hasLng) {
    throw new ServiceError("Lat y lng deben enviarse juntos", 400);
  }
}

function mapDistance<T extends { latitude: number | null; longitude: number | null }>(
  items: T[],
  origin: GeoPoint | null,
) {
  return items.map((item) => ({
    ...item,
    distanceKm:
      origin && hasValidCoordinates(item.latitude, item.longitude)
        ? calculateDistanceKm(origin, {
            latitude: item.latitude!,
            longitude: item.longitude!,
          })
        : null,
  }));
}

function sortByDistanceThenName<T extends { distanceKm: number | null; name: string }>(items: T[]) {
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

    return left.name.localeCompare(right.name);
  });
}

function keepOnlyCurrentPromotionPreview<
  T extends {
    promotions: Array<{
      startDate: Date | null;
      endDate: Date | null;
      startTime?: string | null;
      endTime?: string | null;
      status?: string | null;
    }>;
  },
>(items: T[], now: Date) {
  return items.map((item) => ({
    ...item,
    promotions: filterPublicPromotionsVisibleNow(item.promotions, now).slice(0, 1),
  }));
}

function getCommerceSearchConditions(query: string, useNativeSearch: boolean) {
  const searchOperator = useNativeSearch ? { search: query } : { contains: query };

  return [
    { name: searchOperator },
    { shortDescription: searchOperator },
    { description: searchOperator },
    { address: searchOperator },
  ];
}

function getPaginationWindow(input: CommercesQueryInput, fallbackLimit: number) {
  const limit = input.limit ?? fallbackLimit;
  const page = input.page ?? 1;
  const start = (page - 1) * limit;
  const end = start + limit;

  return { page, limit, start, end };
}

export async function getCommercesCatalog(rawInput: CommercesQueryInput) {
  const input = normalizeCommercesInput(rawInput);
  ensureValidGeoPair(input);
  const now = new Date();
  const { page, limit, start } = getPaginationWindow(input, 24);

  const origin =
    input.lat != null && input.lng != null
      ? ({ latitude: input.lat, longitude: input.lng } satisfies GeoPoint)
      : null;

  const findCommercesCatalog = (useNativeSearch: boolean) =>
    prisma.commerce.findMany({
      where: {
        status: "APPROVED",
        isHiddenByAdmin: false,
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
        ...(input.search
          ? {
              OR: getCommerceSearchConditions(input.search, useNativeSearch),
            }
          : {}),
      },
      select: getCommerceListSelect(now),
      orderBy: [{ isFeatured: "desc" }, { featuredRank: "asc" }, { name: "asc" }],
      skip: start,
      take: limit + 1,
    });

  const commerces = input.search
    ? await withFullTextSearchFallback(
        () => findCommercesCatalog(true),
        () => findCommercesCatalog(false),
        "commerces.service.getCommercesCatalog",
      )
    : await findCommercesCatalog(true);

  const normalizedCommerces = sortByDistanceThenName(
    mapDistance(keepOnlyCurrentPromotionPreview(commerces, now), origin),
  );

  return {
    commerces: normalizedCommerces.slice(0, limit),
    page,
    limit,
    hasMore: normalizedCommerces.length > limit,
  };
}

export async function getCommerceDetails(commerceId: number) {
  const now = new Date();

  const commerce = await prisma.commerce.findFirst({
    where: {
      id: commerceId,
      status: "APPROVED",
      isHiddenByAdmin: false,
    },
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
      status: true,
      createdAt: true,
      updatedAt: true,
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
      promotions: {
        where: buildPublicPromotionWhere(now),
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
          schedules: {
            select: {
              weekday: true,
              startTime: true,
              endTime: true,
            },
            orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
          },
          imageUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!commerce) {
    throw new ServiceError("Comercio no encontrado", 404);
  }

  return {
    ...commerce,
    promotions: filterPublicPromotionsVisibleNow(commerce.promotions, now),
  };
}

export async function getNearbyCommercesCatalog(rawInput: CommercesQueryInput) {
  const input = normalizeCommercesInput(rawInput);
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
  const expandedTake = Math.min(Math.max((end + 1) * 2, requestedLimit * 3), 200);

  const categoryRecord = input.category
    ? await prisma.category.findUnique({
        where: { slug: input.category },
        select: { id: true },
      })
    : null;

  if (input.category && !categoryRecord) {
    return {
      commerces: [],
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

  const findNearbyCommerces = (useNativeSearch: boolean) =>
    prisma.commerce.findMany({
      where: {
        status: "APPROVED",
        isHiddenByAdmin: false,
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
        ...(input.search
          ? {
              OR: getCommerceSearchConditions(input.search, useNativeSearch),
            }
          : {}),
      },
      select: getCommerceListSelect(now),
      orderBy: [{ isFeatured: "desc" }, { featuredRank: "asc" }, { name: "asc" }],
      ...(origin ? {} : { take: expandedTake }),
    });

  let commerces;
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
        commerces: [],
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
    const nearbyIds = nearbyRows.map((row) => row.id);

    const findNearbyCommercesByIds = (useNativeSearch: boolean) =>
      prisma.commerce.findMany({
        where: {
          id: { in: nearbyIds },
          status: "APPROVED",
          isHiddenByAdmin: false,
          ...(input.search
            ? {
                OR: getCommerceSearchConditions(input.search, useNativeSearch),
              }
            : {}),
        },
        select: getCommerceListSelect(now),
      });

    commerces = input.search
      ? await withFullTextSearchFallback(
          () => findNearbyCommercesByIds(true),
          () => findNearbyCommercesByIds(false),
          "commerces.service.getNearbyCommercesCatalog",
        )
      : await findNearbyCommercesByIds(true);
  } else {
    commerces = input.search
      ? await withFullTextSearchFallback(
          () => findNearbyCommerces(true),
          () => findNearbyCommerces(false),
          "commerces.service.getNearbyCommercesCatalog",
        )
      : await findNearbyCommerces(true);
  }

  const nearbyPool = sortByDistanceThenName(
    keepOnlyCurrentPromotionPreview(commerces, now).map((commerce) => ({
      ...commerce,
      distanceKm:
        origin && hasValidCoordinates(commerce.latitude, commerce.longitude)
          ? distanceMap.get(commerce.id) ??
            calculateDistanceKm(origin, {
              latitude: commerce.latitude!,
              longitude: commerce.longitude!,
            })
          : null,
    })),
  ).filter((commerce) => {
    if (!origin) {
      return true;
    }

    return commerce.distanceKm != null && commerce.distanceKm <= radiusKm;
  });

  return {
    commerces: nearbyPool.slice(start, end),
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
