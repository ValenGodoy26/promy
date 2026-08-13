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

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "La busqueda no puede estar vacia"),
  lat: z.coerce.number().finite().optional(),
  lng: z.coerce.number().finite().optional(),
  city: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(25).optional(),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

function normalizeSearchInput(input: SearchQueryInput): SearchQueryInput {
  return {
    ...input,
    q: input.q.trim(),
    city: cleanText(input.city),
  };
}

function ensureValidGeoPair(input: SearchQueryInput) {
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
    { category: { is: { name: { contains: query } } } },
    { city: { is: { name: { contains: query } } } },
  ];
}

function getPromotionSearchConditions(query: string, useNativeSearch: boolean) {
  const searchOperator = useNativeSearch ? { search: query } : { contains: query };

  return [
    { title: searchOperator },
    { description: searchOperator },
    { conditions: searchOperator },
    { commerce: { is: { name: searchOperator } } },
    { commerce: { is: { category: { is: { name: { contains: query } } } } } },
  ];
}

export async function performCatalogSearch(rawInput: SearchQueryInput) {
  const input = normalizeSearchInput(rawInput);
  ensureValidGeoPair(input);
  const now = new Date();

  const limit = input.limit ?? 12;
  const origin =
    input.lat != null && input.lng != null
      ? ({ latitude: input.lat, longitude: input.lng } satisfies GeoPoint)
      : null;
  const citySlug = input.city || DEFAULT_CITY_SLUG;

  const findSearchResults = (useNativeSearch: boolean) =>
    Promise.all([
      prisma.commerce.findMany({
        where: {
          status: "APPROVED",
          ...(origin
            ? {}
            : {
                city: {
                  slug: citySlug,
                },
              }),
          OR: getCommerceSearchConditions(input.q, useNativeSearch),
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
              createdAt: "desc",
            },
          },
        },
        take: limit,
      }),
      prisma.promotion.findMany({
        where: {
          ...buildPublicPromotionWhere(now),
          commerce: {
            status: "APPROVED",
            ...(origin
              ? {}
              : {
                  city: {
                    slug: citySlug,
                  },
                }),
          },
          OR: getPromotionSearchConditions(input.q, useNativeSearch),
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
        },
        take: limit,
      }),
    ]);

  const [commerces, promotions] = await withFullTextSearchFallback(
    () => findSearchResults(true),
    () => findSearchResults(false),
    "search.service.performCatalogSearch",
  );

  return {
    commerces: commerces
      .map((commerce) => ({
        ...commerce,
        promotions: filterPublicPromotionsVisibleNow(commerce.promotions, now).slice(0, 1),
        distanceKm:
          origin && hasValidCoordinates(commerce.latitude, commerce.longitude)
            ? calculateDistanceKm(origin, {
                latitude: commerce.latitude!,
                longitude: commerce.longitude!,
              })
            : null,
      }))
      .sort((left, right) => {
        if (left.distanceKm != null && right.distanceKm != null) {
          return left.distanceKm - right.distanceKm;
        }

        return left.name.localeCompare(right.name);
      }),
    promotions: filterPublicPromotionsVisibleNow(promotions, now)
      .map((promotion) => ({
        ...promotion,
        distanceKm:
          origin &&
          hasValidCoordinates(promotion.commerce.latitude, promotion.commerce.longitude)
            ? calculateDistanceKm(origin, {
                latitude: promotion.commerce.latitude!,
                longitude: promotion.commerce.longitude!,
              })
            : null,
      }))
      .sort((left, right) => {
        if (left.distanceKm != null && right.distanceKm != null) {
          return left.distanceKm - right.distanceKm;
        }

        return left.title.localeCompare(right.title);
      }),
  };
}
