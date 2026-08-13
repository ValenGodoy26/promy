import type {
  AdminAuditLogsResponse,
  AdminCategoriesResponse,
  AdminCategoryResponse,
  AdminCommercesResponse,
  AdminDashboardResponse,
  AdminPromotionsResponse,
  AuthActionResponse,
  CategoriesResponse,
  CitiesResponse,
  AuthSession,
  CommerceDashboardResponse,
  CommerceManagedPromotionResponse,
  CommerceManagedPromotionsResponse,
  CommerceManagedRedemptionsResponse,
  CommerceValidateRedemptionResponse,
  CreateCommercePromotionInput,
  DeleteCommercePromotionResponse,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  MyCommerceResponse,
  RegisterCommerceResponse,
  RegisterResponse,
  RefreshResponse,
  RealtimeStreamTokenResponse,
  UploadedFileResponse,
  UpdateCommerceStatusResponse,
  UpdateAdminCommerceResponse,
  UpdateAdminPromotionResponse,
  UpdateCommercePromotionInput,
  UpdatePromotionStatusResponse,
  UpdateMyCommerceInput,
} from "../types/api";

const API_FALLBACK = "http://localhost:4000/api";

export function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  return configured || API_FALLBACK;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: Omit<RequestInit, "body"> & { body?: unknown; accessToken?: string | null },
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (init?.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`);
  }

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  const data = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new ApiError(
      data?.message || "No pudimos completar la solicitud.",
      response.status,
    );
  }

  return data as T;
}

export async function loginRequest(email: string, password: string) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function registerClientRequest(input: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}) {
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: input,
  });
}

export async function registerCommerceRequest(input: {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  commerceName: string;
  shortDescription?: string;
  description?: string;
  address: string;
  cityId: number;
  categoryId: number;
  instagram?: string;
}) {
  return request<RegisterCommerceResponse>("/auth/register-commerce", {
    method: "POST",
    body: input,
  });
}

export async function refreshRequest(refreshToken?: string) {
  return request<RefreshResponse>("/auth/refresh", {
    method: "POST",
    body: refreshToken ? { refreshToken } : undefined,
  });
}

export async function requestEmailVerificationRequest(email: string) {
  return request<AuthActionResponse>("/auth/request-email-verification", {
    method: "POST",
    body: { email },
  });
}

export async function verifyEmailRequest(token: string) {
  return request<AuthActionResponse>("/auth/verify-email", {
    method: "POST",
    body: { token },
  });
}

export async function forgotPasswordRequest(email: string) {
  return request<AuthActionResponse>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function resetPasswordRequest(token: string, password: string) {
  return request<AuthActionResponse>("/auth/reset-password", {
    method: "POST",
    body: { token, password },
  });
}

export async function logoutRequest(refreshToken?: string | null) {
  return request<LogoutResponse>("/auth/logout", {
    method: "POST",
    body: refreshToken ? { refreshToken } : {},
  });
}

export async function meRequest(accessToken: string) {
  return request<MeResponse>("/auth/me", {
    method: "GET",
    accessToken,
  });
}

export async function createRealtimeStreamToken(session: AuthSession) {
  return request<RealtimeStreamTokenResponse>("/realtime/stream-token", {
    method: "POST",
    accessToken: session.accessToken,
  });
}

export function buildRealtimeEventsUrl(streamToken: string) {
  return `${resolveApiBaseUrl()}/realtime/events?streamToken=${encodeURIComponent(streamToken)}`;
}

export async function fetchCities() {
  return request<CitiesResponse>("/cities", {
    method: "GET",
  });
}

export async function fetchCategories() {
  return request<CategoriesResponse>("/categories", {
    method: "GET",
  });
}

export async function fetchCommerceDashboard(session: AuthSession) {
  return request<CommerceDashboardResponse>("/commerce/dashboard", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function fetchMyCommerce(session: AuthSession) {
  return request<MyCommerceResponse>("/commerce/me", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function updateMyCommerce(
  session: AuthSession,
  body: UpdateMyCommerceInput,
) {
  return request<MyCommerceResponse>("/commerce/me", {
    method: "PUT",
    accessToken: session.accessToken,
    body,
  });
}

export async function fetchCommercePromotions(session: AuthSession) {
  return request<CommerceManagedPromotionsResponse>("/commerce/promotions", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function createCommercePromotion(
  session: AuthSession,
  body: CreateCommercePromotionInput,
) {
  return request<CommerceManagedPromotionResponse>("/commerce/promotions", {
    method: "POST",
    accessToken: session.accessToken,
    body,
  });
}

export async function updateCommercePromotion(
  session: AuthSession,
  promotionId: number,
  body: UpdateCommercePromotionInput,
) {
  return request<CommerceManagedPromotionResponse>(`/commerce/promotions/${promotionId}`, {
    method: "PUT",
    accessToken: session.accessToken,
    body,
  });
}

export async function deleteCommercePromotion(session: AuthSession, promotionId: number) {
  return request<DeleteCommercePromotionResponse>(`/commerce/promotions/${promotionId}`, {
    method: "DELETE",
    accessToken: session.accessToken,
  });
}

export async function fetchCommerceRedemptions(session: AuthSession) {
  return request<CommerceManagedRedemptionsResponse>("/commerce/redemptions", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function validateCommerceRedemption(
  session: AuthSession,
  validationCode: string,
) {
  return request<CommerceValidateRedemptionResponse>("/commerce/redemptions/validate", {
    method: "POST",
    accessToken: session.accessToken,
    body: {
      validationCode,
    },
  });
}

export async function fetchAdminDashboard(session: AuthSession) {
  return request<AdminDashboardResponse>("/admin/dashboard", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function fetchAdminCommerces(session: AuthSession) {
  return request<AdminCommercesResponse>("/admin/commerces", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function fetchAdminCommercesFiltered(
  session: AuthSession,
  filters?: {
    status?: string;
    search?: string;
    hasPromotions?: boolean;
    hasRedemptions?: boolean;
    ownerStatus?: string;
    mapReady?: boolean;
    profileComplete?: boolean;
    limit?: number;
  },
) {
  const search = new URLSearchParams();

  if (filters?.status) search.set("status", filters.status);
  if (filters?.search?.trim()) search.set("search", filters.search.trim());
  if (typeof filters?.hasPromotions === "boolean") {
    search.set("hasPromotions", String(filters.hasPromotions));
  }
  if (typeof filters?.hasRedemptions === "boolean") {
    search.set("hasRedemptions", String(filters.hasRedemptions));
  }
  if (filters?.ownerStatus) search.set("ownerStatus", filters.ownerStatus);
  if (typeof filters?.mapReady === "boolean") search.set("mapReady", String(filters.mapReady));
  if (typeof filters?.profileComplete === "boolean") {
    search.set("profileComplete", String(filters.profileComplete));
  }
  if (typeof filters?.limit === "number") search.set("limit", String(filters.limit));

  const suffix = search.toString() ? `?${search.toString()}` : "";

  return request<AdminCommercesResponse>(`/admin/commerces${suffix}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function fetchAdminAuditLogs(
  session: AuthSession,
  filters?: {
    targetType?: "COMMERCE" | "PROMOTION";
    targetId?: number;
    commerceId?: number;
    adminUserId?: number;
    action?:
      | "UPDATE_COMMERCE_STATUS"
      | "UPDATE_PROMOTION_STATUS"
      | "UPDATE_COMMERCE_CONTENT"
      | "UPDATE_PROMOTION_CONTENT";
    search?: string;
    incidentOnly?: boolean;
    limit?: number;
  },
) {
  const search = new URLSearchParams();

  if (filters?.targetType) {
    search.set("targetType", filters.targetType);
  }

  if (typeof filters?.targetId === "number") {
    search.set("targetId", String(filters.targetId));
  }

  if (typeof filters?.commerceId === "number") {
    search.set("commerceId", String(filters.commerceId));
  }

  if (typeof filters?.adminUserId === "number") {
    search.set("adminUserId", String(filters.adminUserId));
  }

  if (filters?.action) {
    search.set("action", filters.action);
  }

  if (filters?.search?.trim()) {
    search.set("search", filters.search.trim());
  }

  if (typeof filters?.incidentOnly === "boolean") {
    search.set("incidentOnly", String(filters.incidentOnly));
  }

  if (typeof filters?.limit === "number") {
    search.set("limit", String(filters.limit));
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";

  return request<AdminAuditLogsResponse>(`/admin/audit-logs${suffix}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function updateAdminCommerceStatus(
  session: AuthSession,
  commerceId: number,
  status: string,
  note?: string,
) {
  return request<UpdateCommerceStatusResponse>(`/admin/commerces/${commerceId}/status`, {
    method: "PATCH",
    accessToken: session.accessToken,
    body: { status, note },
  });
}

export async function updateAdminCommerce(
  session: AuthSession,
  commerceId: number,
  body: Partial<{
    name: string;
    shortDescription: string | null;
    description: string | null;
    address: string;
    phone: string | null;
    instagram: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    cityId: number;
    categoryId: number;
    isFeatured: boolean;
    featuredRank: number;
    isHiddenByAdmin: boolean;
    adminNote: string | null;
    note: string;
  }>,
) {
  return request<UpdateAdminCommerceResponse>(`/admin/commerces/${commerceId}`, {
    method: "PATCH",
    accessToken: session.accessToken,
    body,
  });
}

export async function fetchAdminCategories(
  session: AuthSession,
  filters?: {
    search?: string;
    isActive?: boolean;
  },
) {
  const search = new URLSearchParams();

  if (filters?.search?.trim()) search.set("search", filters.search.trim());
  if (typeof filters?.isActive === "boolean") search.set("isActive", String(filters.isActive));

  const suffix = search.toString() ? `?${search.toString()}` : "";

  return request<AdminCategoriesResponse>(`/admin/categories${suffix}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function createAdminCategory(
  session: AuthSession,
  body: { name: string; icon?: string; isActive?: boolean },
) {
  return request<AdminCategoryResponse>("/admin/categories", {
    method: "POST",
    accessToken: session.accessToken,
    body,
  });
}

export async function updateAdminCategory(
  session: AuthSession,
  categoryId: number,
  body: { name: string; icon?: string; isActive?: boolean },
) {
  return request<AdminCategoryResponse>(`/admin/categories/${categoryId}`, {
    method: "PUT",
    accessToken: session.accessToken,
    body,
  });
}

export async function fetchAdminPromotions(session: AuthSession) {
  return request<AdminPromotionsResponse>("/admin/promotions", {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function fetchAdminPromotionsFiltered(
  session: AuthSession,
  filters?: {
    status?: string;
    search?: string;
    commerceStatus?: string;
    hasRedemptions?: boolean;
    limit?: number;
  },
) {
  const search = new URLSearchParams();

  if (filters?.status) search.set("status", filters.status);
  if (filters?.search?.trim()) search.set("search", filters.search.trim());
  if (filters?.commerceStatus) search.set("commerceStatus", filters.commerceStatus);
  if (typeof filters?.hasRedemptions === "boolean") {
    search.set("hasRedemptions", String(filters.hasRedemptions));
  }
  if (typeof filters?.limit === "number") search.set("limit", String(filters.limit));

  const suffix = search.toString() ? `?${search.toString()}` : "";

  return request<AdminPromotionsResponse>(`/admin/promotions${suffix}`, {
    method: "GET",
    accessToken: session.accessToken,
  });
}

export async function updateAdminPromotionStatus(
  session: AuthSession,
  promotionId: number,
  status: string,
  note?: string,
) {
  return request<UpdatePromotionStatusResponse>(`/admin/promotions/${promotionId}/status`, {
    method: "PATCH",
    accessToken: session.accessToken,
    body: { status, note },
  });
}

export async function updateAdminPromotion(
  session: AuthSession,
  promotionId: number,
  body: Partial<{
    title: string;
    description: string;
    conditions: string | null;
    discountValue: number | null;
    startDate: string | null;
    endDate: string | null;
    startTime: string | null;
    endTime: string | null;
    imageUrl: string | null;
    isFeatured: boolean;
    featuredRank: number;
    isHiddenByAdmin: boolean;
    adminNote: string | null;
    note: string;
  }>,
) {
  return request<UpdateAdminPromotionResponse>(`/admin/promotions/${promotionId}`, {
    method: "PATCH",
    accessToken: session.accessToken,
    body,
  });
}

export async function uploadCommerceImage(session: AuthSession, file: File) {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${resolveApiBaseUrl()}/uploads/commerce-image`, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: form,
  });

  const data = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new ApiError(data?.message || "No pudimos subir la imagen.", response.status);
  }

  return data as UploadedFileResponse;
}
