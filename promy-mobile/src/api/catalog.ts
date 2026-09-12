import { apiRequest } from "./client";
import {
  CommerceResponse,
  CategoriesResponse,
  CommercesResponse,
  CreateRedemptionInput,
  MapMarkersResponse,
  PromotionsResponse,
  PromotionResponse,
  RedemptionCreateResponse,
  RedemptionsResponse,
  SearchResponse,
} from "../types/api";

type FetchCommercesOptions = {
  categorySlug?: string;
  citySlug?: string;
  search?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  fallbackCitySlug?: string;
  limit?: number;
  page?: number;
};

type FetchPromotionsOptions = {
  categorySlug?: string;
  citySlug?: string;
  commerceId?: number;
  search?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  fallbackCitySlug?: string;
  limit?: number;
  page?: number;
};

export async function fetchCategories() {
  return apiRequest<CategoriesResponse>("/categories");
}

export async function fetchCommerces(options?: string | FetchCommercesOptions) {
  const normalized =
    typeof options === "string" ? { categorySlug: options } : options || {};

  const params = new URLSearchParams();

  if (normalized.categorySlug) {
    params.set("category", normalized.categorySlug);
  }

  if (normalized.citySlug) {
    params.set("city", normalized.citySlug);
  }

  if (normalized.search) {
    params.set("search", normalized.search);
  }

  if (normalized.latitude != null && normalized.longitude != null) {
    params.set("lat", String(normalized.latitude));
    params.set("lng", String(normalized.longitude));
  }

  if (normalized.radiusKm != null) {
    params.set("radiusKm", String(normalized.radiusKm));
  }

  if (normalized.fallbackCitySlug) {
    params.set("fallbackCity", normalized.fallbackCitySlug);
  }

  if (normalized.limit != null) {
    params.set("limit", String(normalized.limit));
  }

  if (normalized.page != null) {
    params.set("page", String(normalized.page));
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<CommercesResponse>(`/commerces${query}`);
}

export async function fetchPromotionById(promotionId: number) {
  return apiRequest<PromotionResponse>(`/promotions/${promotionId}`);
}

export async function fetchPromotions(options?: FetchPromotionsOptions) {
  const normalized = options || {};
  const params = new URLSearchParams();

  if (normalized.categorySlug) {
    params.set("category", normalized.categorySlug);
  }

  if (normalized.citySlug) {
    params.set("city", normalized.citySlug);
  }

  if (normalized.commerceId != null) {
    params.set("commerceId", String(normalized.commerceId));
  }

  if (normalized.search) {
    params.set("search", normalized.search);
  }

  if (normalized.latitude != null && normalized.longitude != null) {
    params.set("lat", String(normalized.latitude));
    params.set("lng", String(normalized.longitude));
  }

  if (normalized.radiusKm != null) {
    params.set("radiusKm", String(normalized.radiusKm));
  }

  if (normalized.fallbackCitySlug) {
    params.set("fallbackCity", normalized.fallbackCitySlug);
  }

  if (normalized.limit != null) {
    params.set("limit", String(normalized.limit));
  }

  if (normalized.page != null) {
    params.set("page", String(normalized.page));
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<PromotionsResponse>(`/promotions${query}`);
}

export async function fetchCommerceById(commerceId: number) {
  return apiRequest<CommerceResponse>(`/commerces/${commerceId}`);
}

export async function fetchNearbyCommerces(options?: FetchCommercesOptions) {
  const normalized = options || {};
  const params = new URLSearchParams();

  if (normalized.categorySlug) params.set("category", normalized.categorySlug);
  if (normalized.citySlug) params.set("city", normalized.citySlug);
  if (normalized.search) params.set("search", normalized.search);
  if (normalized.latitude != null && normalized.longitude != null) {
    params.set("lat", String(normalized.latitude));
    params.set("lng", String(normalized.longitude));
  }
  if (normalized.radiusKm != null) params.set("radiusKm", String(normalized.radiusKm));
  if (normalized.fallbackCitySlug) params.set("fallbackCity", normalized.fallbackCitySlug);
  if (normalized.limit != null) params.set("limit", String(normalized.limit));
  if (normalized.page != null) params.set("page", String(normalized.page));

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<CommercesResponse>(`/commerces/nearby${query}`);
}

export async function fetchNearbyPromotions(options?: FetchPromotionsOptions) {
  const normalized = options || {};
  const params = new URLSearchParams();

  if (normalized.categorySlug) params.set("category", normalized.categorySlug);
  if (normalized.citySlug) params.set("city", normalized.citySlug);
  if (normalized.commerceId != null) params.set("commerceId", String(normalized.commerceId));
  if (normalized.search) params.set("search", normalized.search);
  if (normalized.latitude != null && normalized.longitude != null) {
    params.set("lat", String(normalized.latitude));
    params.set("lng", String(normalized.longitude));
  }
  if (normalized.radiusKm != null) params.set("radiusKm", String(normalized.radiusKm));
  if (normalized.fallbackCitySlug) params.set("fallbackCity", normalized.fallbackCitySlug);
  if (normalized.limit != null) params.set("limit", String(normalized.limit));
  if (normalized.page != null) params.set("page", String(normalized.page));

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<PromotionsResponse>(`/promotions/nearby${query}`);
}

export async function fetchMapMarkers(options?: FetchCommercesOptions) {
  const normalized = options || {};
  const params = new URLSearchParams();

  if (normalized.categorySlug) params.set("category", normalized.categorySlug);
  if (normalized.citySlug) params.set("city", normalized.citySlug);
  if (normalized.search) params.set("search", normalized.search);
  if (normalized.latitude != null && normalized.longitude != null) {
    params.set("lat", String(normalized.latitude));
    params.set("lng", String(normalized.longitude));
  }
  if (normalized.radiusKm != null) params.set("radiusKm", String(normalized.radiusKm));
  if (normalized.fallbackCitySlug) params.set("fallbackCity", normalized.fallbackCitySlug);
  if (normalized.limit != null) params.set("limit", String(normalized.limit));

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<MapMarkersResponse>(`/map/markers${query}`);
}

export async function searchCatalog(query: {
  value: string;
  latitude?: number;
  longitude?: number;
  citySlug?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  params.set("q", query.value);
  if (query.latitude != null && query.longitude != null) {
    params.set("lat", String(query.latitude));
    params.set("lng", String(query.longitude));
  }
  if (query.citySlug) params.set("city", query.citySlug);
  if (query.limit != null) params.set("limit", String(query.limit));

  return apiRequest<SearchResponse>(`/search?${params.toString()}`);
}

export async function fetchMyRedemptions(token: string) {
  const redemptions: RedemptionsResponse["redemptions"] = [];
  let cursor: number | null = null;
  do {
    const suffix: string = cursor ? `?limit=100&cursor=${cursor}` : "?limit=100";
    const page: RedemptionsResponse = await apiRequest<RedemptionsResponse>(`/redemptions/me${suffix}`, { token });
    redemptions.push(...page.redemptions);
    cursor = page.hasMore ? page.nextCursor ?? null : null;
  } while (cursor);
  return { ok: true, redemptions, hasMore: false, nextCursor: null };
}

export async function createRedemption(token: string, body: CreateRedemptionInput) {
  return apiRequest<RedemptionCreateResponse>("/redemptions", {
    method: "POST",
    token,
    body,
  });
}
