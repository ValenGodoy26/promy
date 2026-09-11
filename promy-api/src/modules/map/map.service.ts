import { z } from "zod";
import prisma from "../../config/prisma";
import { findNearbyCommerceDistanceRows } from "../../shared/services/spatial.service";
import {
  DEFAULT_CITY_SLUG,
  GeoPoint,
  mapDistanceFromOrigin,
  sortByDistanceThen,
} from "../../shared/utils/location";
import {
  buildPublicPromotionWhere,
  buildPublicCommerceWhere,
  filterPublicPromotionsVisibleNow,
} from "../../shared/utils/promotionStatus";
import {
  cleanText,
  ServiceError,
  withFullTextSearchFallback,
} from "../../shared/utils/service";

export const mapQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90).optional(),
  lng: z.coerce.number().finite().min(-180).max(180).optional(),
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  fallbackCity: z.string().trim().optional(),
  radiusKm: z.coerce.number().min(0.1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type MapQueryInput = z.infer<typeof mapQuerySchema>;

function normalizeMapInput(input: MapQueryInput): MapQueryInput {
  return {
    ...input,
    category: cleanText(input.category),
    search: cleanText(input.search),
    city: cleanText(input.city),
    fallbackCity: cleanText(input.fallbackCity),
  };
}

function ensureValidGeoPair(input: MapQueryInput) {
  const hasLat = input.lat != null;
  const hasLng = input.lng != null;

  if (hasLat !== hasLng) {
    throw new ServiceError("Lat y lng deben enviarse juntos", 400);
  }
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

export async function resolveGeoContext(input: MapQueryInput) {
  if (input.lat != null && input.lng != null) {
    return {
      origin: {
        latitude: input.lat,
        longitude: input.lng,
      } satisfies GeoPoint,
      source: "device" as const,
      citySlug: input.city || input.fallbackCity || DEFAULT_CITY_SLUG,
    };
  }

  const fallbackCitySlug = input.city || input.fallbackCity || DEFAULT_CITY_SLUG;
  const commerces = await prisma.commerce.findMany({
    where: {
      ...buildPublicCommerceWhere(),
      city: {
        slug: fallbackCitySlug,
      },
      latitude: {
        not: null,
      },
      longitude: {
        not: null,
      },
    },
    select: {
      latitude: true,
      longitude: true,
    },
  });

  if (!commerces.length) {
    return {
      origin: null,
      source: "unavailable" as const,
      citySlug: fallbackCitySlug,
    };
  }

  const latitude =
    commerces.reduce((sum, item) => sum + (item.latitude || 0), 0) / commerces.length;
  const longitude =
    commerces.reduce((sum, item) => sum + (item.longitude || 0), 0) / commerces.length;

  return {
    origin: { latitude, longitude } satisfies GeoPoint,
    source: "city_fallback" as const,
    citySlug: fallbackCitySlug,
  };
}

export async function listMapMarkers(rawInput: MapQueryInput) {
  const input = normalizeMapInput(rawInput);
  ensureValidGeoPair(input);
  const now = new Date();

  const context = await resolveGeoContext(input);
  const radiusKm = input.radiusKm ?? 8;
  const categoryRecord = input.category
    ? await prisma.category.findUnique({
        where: { slug: input.category },
        select: { id: true },
      })
    : null;

  if (input.category && !categoryRecord) {
    return {
      context: {
        source: context.source,
        citySlug: context.citySlug,
        latitude: context.origin?.latitude ?? null,
        longitude: context.origin?.longitude ?? null,
        radiusKm,
      },
      markers: [],
    };
  }

  const findMapMarkers = (useNativeSearch: boolean) =>
    prisma.commerce.findMany({
      where: {
        ...buildPublicCommerceWhere(),
        ...(context.source !== "device"
          ? {
              city: {
                slug: context.citySlug,
              },
            }
          : {}),
        ...(categoryRecord ? { categoryId: categoryRecord.id } : {}),
        ...(input.search
          ? {
              OR: getCommerceSearchConditions(input.search, useNativeSearch),
            }
          : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { featuredRank: "asc" }, { name: "asc" }],
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
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      take: context.source === "device" ? undefined : input.limit ?? 50,
    });

  let commerces;
  let distanceMap = new Map<number, number>();

  if (context.source === "device" && context.origin) {
    const nearbyRows = await findNearbyCommerceDistanceRows(prisma, {
      origin: context.origin,
      radiusKm,
      take: input.limit ?? 50,
      categoryId: categoryRecord?.id ?? null,
    });

    if (!nearbyRows.length) {
      return {
        context: {
          source: context.source,
          citySlug: context.citySlug,
          latitude: context.origin.latitude,
          longitude: context.origin.longitude,
          radiusKm,
        },
        markers: [],
      };
    }

    distanceMap = new Map(nearbyRows.map((row) => [row.id, row.distanceKm]));
    const nearbyIds = nearbyRows.map((row) => row.id);

    const findMapMarkersByIds = (useNativeSearch: boolean) =>
      prisma.commerce.findMany({
        where: {
          id: { in: nearbyIds },
          ...buildPublicCommerceWhere(),
          ...(input.search
            ? {
                OR: getCommerceSearchConditions(input.search, useNativeSearch),
              }
            : {}),
        },
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
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    commerces = input.search
      ? await withFullTextSearchFallback(
          () => findMapMarkersByIds(true),
          () => findMapMarkersByIds(false),
          "map.service.listMapMarkers",
        )
      : await findMapMarkersByIds(true);
  } else {
    commerces = input.search
      ? await withFullTextSearchFallback(
          () => findMapMarkers(true),
          () => findMapMarkers(false),
          "map.service.listMapMarkers",
        )
      : await findMapMarkers(true);
  }

  const withCurrentPromotionPreview = commerces.map((commerce) => ({
    ...commerce,
    promotions: filterPublicPromotionsVisibleNow(commerce.promotions, now).slice(0, 1),
  }));

  const withDistance = withCurrentPromotionPreview.map((commerce) => ({
    ...commerce,
    distanceKm:
      context.source === "device" && context.origin
        ? distanceMap.get(commerce.id) ?? null
        : mapDistanceFromOrigin([commerce], context.origin)[0]?.distanceKm ?? null,
  }));
  const filtered = withDistance.filter((commerce) => {
    if (context.source !== "device") {
      return true;
    }

    if (commerce.distanceKm == null) {
      return false;
    }

    return commerce.distanceKm <= radiusKm;
  });

  return {
    context: {
      source: context.source,
      citySlug: context.citySlug,
      latitude: context.origin?.latitude ?? null,
      longitude: context.origin?.longitude ?? null,
      radiusKm,
    },
    markers: sortByDistanceThen(filtered, (left, right) => left.name.localeCompare(right.name)),
  };
}
