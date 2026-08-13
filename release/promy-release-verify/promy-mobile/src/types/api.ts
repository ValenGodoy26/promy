export type UserRole = "ADMIN" | "CLIENT" | "COMMERCE";

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  status: string;
  phone?: string | null;
  emailVerifiedAt?: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string | null;
  user: AuthUser;
};

export type LoginResponse = {
  ok: boolean;
  message?: string;
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
};

export type RegisterResponse = {
  ok: boolean;
  message?: string;
  user: AuthUser;
  verification?: {
    token?: string;
    link?: string | null;
  };
};

export type RefreshResponse = LoginResponse;

export type LogoutResponse = {
  ok: boolean;
  message?: string;
};

export type AuthActionResponse = {
  ok: boolean;
  message?: string;
  verification?: {
    token?: string;
    link?: string | null;
  };
  reset?: {
    token?: string;
    link?: string | null;
  };
  user?: AuthUser;
};

export type MeResponse = {
  ok: boolean;
  user: AuthUser;
};

export type PushTokenResponse = {
  ok: boolean;
  message?: string;
  pushToken: {
    id: number;
    token: string;
    platform: string;
    deviceLabel?: string | null;
    isActive: boolean;
    lastRegisteredAt: string;
  };
};

export type PushTokenDeactivateResponse = {
  ok: boolean;
  message?: string;
};

export type PushTokenPlatform = "ios" | "android";

export type CommerceStatus = "PENDING" | "APPROVED" | "REJECTED" | "INACTIVE" | string;
export type PromotionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED_VISIBLE"
  | "REJECTED"
  | "EXPIRED"
  | string;

export type ApiCategory = {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
};

export type ApiCity = {
  id: number;
  name: string;
  province: string;
  slug: string;
};

export type PromotionType =
  | "PERCENTAGE"
  | "FIXED_AMOUNT"
  | "BENEFIT"
  | "TIME_SLOT"
  | "DAY_PROMO"
  | "SPECIAL_COMBO"
  | string;

export type ValidationMethod = "QR" | "MANUAL_CODE" | string;

export type ApiPromotion = {
  id: number;
  title: string;
  description?: string | null;
  promotionType: PromotionType;
  validationMethod: ValidationMethod;
  discountValue?: number | null;
  conditions?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  imageUrl?: string | null;
  status?: string | null;
  validationCode?: string | null;
  distanceKm?: number | null;
};

export type ApiCommerce = {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  instagram?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  status?: string | null;
  distanceKm?: number | null;
  city?: ApiCity | null;
  category?: ApiCategory | null;
  promotions?: ApiPromotion[];
};

export type RedemptionStatus = "PENDING" | "SUCCESS" | "FAILED" | string;

export type ApiRedemption = {
  id: number;
  validationMethod: ValidationMethod;
  validationCode?: string | null;
  status: RedemptionStatus;
  redeemedAt?: string | null;
  createdAt: string;
  promotion: ApiPromotion;
  commerce?: Pick<ApiCommerce, "id" | "name" | "slug" | "logoUrl"> | null;
};

export type AppNotificationType =
  | "REDEMPTION_VALIDATED"
  | "COMMERCE_PENDING"
  | "COMMERCE_APPROVED"
  | "COMMERCE_REJECTED"
  | string;

export type AppNotification = {
  id: number;
  type: AppNotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

export type CommerceOwnedSummary = {
  id: number;
  name: string;
  slug: string;
  status: CommerceStatus;
  city?: ApiCity | null;
  category?: ApiCategory | null;
};

export type CommerceDashboardPromotion = {
  id: number;
  title: string;
  promotionType: PromotionType;
  validationMethod: ValidationMethod;
  discountValue?: number | null;
  status: PromotionStatus;
  createdAt: string;
  commerce: Pick<ApiCommerce, "id" | "name" | "slug">;
};

export type CommerceDashboardRedemption = {
  id: number;
  validationMethod: ValidationMethod;
  status: RedemptionStatus;
  redeemedAt?: string | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
  };
  promotion: {
    id: number;
    title: string;
    promotionType: PromotionType;
    discountValue?: number | null;
  };
  commerce: Pick<ApiCommerce, "id" | "name" | "slug">;
};

export type CommerceDashboard = {
  metrics: {
    commerces: {
      total: number;
      approved: number;
      pending: number;
      inactive: number;
    };
    promotions: {
      total: number;
      approvedVisible: number;
      pendingReview: number;
      draft: number;
      rejected: number;
      expired: number;
    };
    redemptions: {
      total: number;
      success: number;
      failed: number;
    };
  };
  commerces: CommerceOwnedSummary[];
  recentPromotions: CommerceDashboardPromotion[];
  recentRedemptions: CommerceDashboardRedemption[];
};

export type CommerceDashboardResponse = {
  ok: boolean;
  dashboard: CommerceDashboard;
};

export type MyCommerceResponse = {
  ok: boolean;
  commerce: CommerceManagedProfile;
  commercesCount: number;
};

export type CommerceManagedProfile = ApiCommerce & {
  createdAt?: string;
  updatedAt?: string;
};

export type CommerceManagedPromotion = PromotionDetail & {
  commerce: Pick<ApiCommerce, "id" | "name" | "slug">;
};

export type CommerceManagedPromotionsResponse = {
  ok: boolean;
  promotions: CommerceManagedPromotion[];
};

export type CommerceManagedPromotionResponse = {
  ok: boolean;
  message?: string;
  promotion: CommerceManagedPromotion;
};

export type DeleteCommercePromotionResponse = {
  ok: boolean;
  message?: string;
  deletedPromotionId: number;
};

export type CommerceManagedRedemption = {
  id: number;
  validationMethod: ValidationMethod;
  validationCode?: string | null;
  status: RedemptionStatus;
  redeemedAt?: string | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  promotion: {
    id: number;
    title: string;
    description?: string | null;
    promotionType: PromotionType;
    discountValue?: number | null;
  };
  commerce: Pick<ApiCommerce, "id" | "name" | "slug">;
};

export type CommerceManagedRedemptionsResponse = {
  ok: boolean;
  redemptions: CommerceManagedRedemption[];
};

export type ValidateCommerceRedemptionInput = {
  validationCode: string;
};

export type ValidateCommerceRedemptionResponse = {
  ok: boolean;
  message?: string;
  redemption: CommerceManagedRedemption;
};

export type UpdateMyCommerceInput = {
  name?: string;
  shortDescription?: string;
  description?: string;
  address?: string;
  phone?: string;
  instagram?: string;
  logoUrl?: string;
  coverUrl?: string;
  latitude?: number;
  longitude?: number;
};

export type CreateCommercePromotionInput = {
  title: string;
  description: string;
  promotionType: PromotionType;
  validationMethod: ValidationMethod;
  discountValue?: number | null;
  conditions?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  imageUrl?: string;
  status?: PromotionStatus;
};

export type UpdateCommercePromotionInput = Partial<CreateCommercePromotionInput>;

export type GeoContext = {
  source: "device" | "city_fallback" | "unavailable" | string;
  citySlug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number | null;
};

export type CategoriesResponse = {
  ok: boolean;
  categories: ApiCategory[];
};

export type CitiesResponse = {
  ok: boolean;
  cities: ApiCity[];
};

export type CommercesResponse = {
  ok: boolean;
  commerces: ApiCommerce[];
  context?: GeoContext;
};

export type PromotionDetail = ApiPromotion & {
  createdAt?: string;
  updatedAt?: string;
  commerce: ApiCommerce;
};

export type CommerceDetail = ApiCommerce & {
  createdAt?: string;
  updatedAt?: string;
  promotions: ApiPromotion[];
};

export type PromotionResponse = {
  ok: boolean;
  promotion: PromotionDetail;
};

export type PromotionsResponse = {
  ok: boolean;
  promotions: FeedPromotion[];
  context?: GeoContext;
};

export type CommerceResponse = {
  ok: boolean;
  commerce: CommerceDetail;
};

export type RedemptionsResponse = {
  ok: boolean;
  redemptions: ApiRedemption[];
};

export type CreateRedemptionInput = {
  promotionId: number;
};

export type RedemptionCreateResponse = {
  ok: boolean;
  message?: string;
  redemption: ApiRedemption;
};

export type NotificationsResponse = {
  ok: boolean;
  unreadCount: number;
  notifications: AppNotification[];
};

export type NotificationResponse = {
  ok: boolean;
  message?: string;
  notification: AppNotification;
};

export type MarkAllNotificationsReadResponse = {
  ok: boolean;
  message?: string;
};

export type FeedPromotion = ApiPromotion & {
  commerce: ApiCommerce;
  categoryName?: string;
  cityName?: string;
  distanceKm?: number | null;
};

export type MapMarker = ApiCommerce & {
  promotions?: ApiPromotion[];
  distanceKm?: number | null;
};

export type MapMarkersResponse = {
  ok: boolean;
  context: GeoContext;
  markers: MapMarker[];
};

export type SearchResponse = {
  ok: boolean;
  commerces: ApiCommerce[];
  promotions: FeedPromotion[];
};
