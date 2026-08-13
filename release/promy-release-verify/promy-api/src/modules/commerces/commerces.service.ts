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
  lat: z.coerce.number().finite().optional(),
  lng: z.coerce.number().finite().optional(),
  radiusKm: z.coerce.number().min(0.1).max(100).optional(),
  fallbackCity: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type CommercesQueryInput = z.infer<typeof getCommercesQuerySchema>;

function getCommerceListSelect(now: Date) {
  return {
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
        imageUrl: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc" as const,
      },
    },
  } as const;
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

export async function getCommercesCatalog(rawInput: CommercesQueryInput) {
  const input = normalizeCommercesInput(rawInput);
  ensureValidGeoPair(input);
  const now = new Date();

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
      ...(input.limit ? { take: input.limit } : {}),
    });

  const commerces = input.search
    ? await withFullTextSearchFallback(
        () => findCommercesCatalog(true),
        () => findCommercesCatalog(false),
        "commerces.service.getCommercesCatalog",
      )
    : await findCommercesCatalog(true);

  return sortByDistanceThenName(mapDistance(keepOnlyCurrentPromotionPreview(commerces, now), origin));
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

  const origin =
    input.lat != null && input.lng != null
      ? ({ latitude: input.lat, longitude: input.lng } satisfies GeoPoint)
      : null;
  const effectiveCity = input.city || input.fallbackCity || DEFAULT_CITY_SLUG;
  const radiusKm = input.radiusKm ?? 8;
  const requestedLimit = input.limit ?? 50;

  const findNearbyCommerces = (useNativeSearch: boolean) =>
    prisma.commerce.findMany({
      where: {
        status: "APPROVED",
        isHiddenByAdmin: false,
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
        ...(input.search
          ? {
              OR: getCommerceSearchConditions(input.search, useNativeSearch),
            }
          : {}),
      },
      select: getCommerceListSelect(now),
      orderBy: [{ isFeatured: "desc" }, { featuredRank: "asc" }, { name: "asc" }],
      take: requestedLimit,
    });

  const commerces = input.search
    ? await withFullTextSearchFallback(
        () => findNearbyCommerces(true),
        () => findNearbyCommerces(false),
        "commerces.service.getNearbyCommercesCatalog",
      )
    : await findNearbyCommerces(true);

  const nearby = sortByDistanceThenName(
    mapDistance(keepOnlyCurrentPromotionPreview(commerces, now), origin),
  ).filter((commerce) => {
    if (!origin) {
      return true;
    }

    if (commerce.distanceKm == null) {
      return false;
    }

    return commerce.distanceKm <= radiusKm;
  });

  return {
    commerces: nearby,
    context: {
      source: origin ? "device" : "city_fallback",
      citySlug: effectiveCity,
      latitude: origin?.latitude ?? null,
      longitude: origin?.longitude ?? null,
      radiusKm,
    },
  };
}
