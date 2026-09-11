export type UserRole = "ADMIN" | "CLIENT" | "COMMERCE";
export type UserStatus = "ACTIVE" | "BLOCKED" | "PENDING" | string;

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
  birthDate?: string | null;
  country?: string | null;
  gender?: string | null;
  emailVerifiedAt?: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string | null;
  user: AuthUser;
};

export type RealtimeStreamTokenResponse = {
  ok: boolean;
  streamToken: string;
};

export type RealtimeEvent = {
  id: string;
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type PublicCity = {
  id: number;
  name: string;
  province: string;
  slug: string;
};

export type PublicCategory = {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  commerceCount?: number;
  isActive?: boolean;
};

export type UploadedFileResponse = {
  ok: boolean;
  message?: string;
  file: {
    filename: string;
    url: string;
    relativeUrl: string;
    mimeType: string;
    size: number;
  };
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

export type RegisterCommerceResponse = {
  ok: boolean;
  message?: string;
  user: AuthUser;
  commerce: {
    id: number;
    name: string;
    slug: string;
    status: string;
    shortDescription?: string | null;
    address: string;
    city: PublicCity;
    category: PublicCategory;
  };
  verification?: {
    token?: string;
    link?: string | null;
  };
};

export type RefreshResponse = LoginResponse;

export type MeResponse = {
  ok: boolean;
  user: AuthUser;
};

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

export type CitiesResponse = {
  ok: boolean;
  cities: PublicCity[];
};

export type CategoriesResponse = {
  ok: boolean;
  categories: PublicCategory[];
};

export type CommerceSummary = {
  id: number;
  name: string;
  slug: string;
  status: string;
  moderationNote?: string | null;
  city?: {
    id: number;
    name: string;
    province: string;
    slug: string;
  } | null;
  category?: {
    id: number;
    name: string;
    slug: string;
    icon?: string | null;
  } | null;
};

export type CommercePromotionSummary = {
  id: number;
  title: string;
  promotionType: string;
  discountValue?: number | null;
  status: string;
  createdAt: string;
  commerce: {
    id: number;
    name: string;
    slug: string;
  };
};

export type CommerceRedemptionSummary = {
  id: number;
  validationMethod: string;
  status: string;
  redeemedAt?: string | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
  };
  promotion: {
    id: number;
    title: string;
    promotionType: string;
    discountValue?: number | null;
  };
  commerce: {
    id: number;
    name: string;
    slug: string;
  };
};

export type CommerceDashboardResponse = {
  ok: boolean;
  dashboard: {
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
    commerces: CommerceSummary[];
    recentPromotions: CommercePromotionSummary[];
    recentRedemptions: CommerceRedemptionSummary[];
  };
};

export type CommerceManagedProfile = {
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
  status: string;
  moderationNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
  city?: {
    id: number;
    name: string;
    province: string;
    slug: string;
  } | null;
  category?: {
    id: number;
    name: string;
    slug: string;
    icon?: string | null;
  } | null;
};

export type MyCommerceResponse = {
  ok: boolean;
  commerce: CommerceManagedProfile;
  commercesCount: number;
  message?: string;
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
export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";
export type PromotionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED_VISIBLE"
  | "REJECTED"
  | "EXPIRED"
  | string;

export type PromotionSchedule = {
  id?: number;
  weekday: Weekday;
  startTime: string;
  endTime: string;
};

export type CommerceManagedPromotion = {
  id: number;
  title: string;
  description: string;
  promotionType: PromotionType;
  validationMethod: ValidationMethod;
  discountValue?: number | null;
  maxRedemptions?: number | null;
  conditions?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  schedules?: PromotionSchedule[];
  imageUrl?: string | null;
  status: PromotionStatus;
  moderationNote?: string | null;
  successRedemptionsCount: number;
  createdAt: string;
  updatedAt: string;
  commerce: {
    id: number;
    name: string;
    slug: string;
  };
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
  validationMethod: string;
  validationCode?: string | null;
  status: string;
  redeemedAt?: string | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
  };
  promotion: {
    id: number;
    title: string;
    description?: string | null;
    promotionType: PromotionType;
    validationMethod: ValidationMethod;
    discountValue?: number | null;
    maxRedemptions?: number | null;
  };
  commerce: {
    id: number;
    name: string;
    slug: string;
  };
};

export type CommerceManagedRedemptionsResponse = {
  ok: boolean;
  redemptions: CommerceManagedRedemption[];
};

export type CommerceValidateRedemptionResponse = {
  ok: boolean;
  message?: string;
  redemption: CommerceManagedRedemption;
};

export type UpdateMyCommerceInput = {
  name?: string;
  shortDescription?: string | null;
  description?: string | null;
  address?: string;
  phone?: string | null;
  instagram?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  cityId?: number;
  categoryId?: number;
  latitude?: number | null;
  longitude?: number | null;
};

export type UpdateMyCommerceStatusInput = {
  status: "APPROVED" | "INACTIVE";
};

export type CreateCommercePromotionInput = {
  title: string;
  description: string;
  promotionType: PromotionType;
  validationMethod: ValidationMethod;
  discountValue?: number | null;
  maxRedemptions?: number | null;
  conditions?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  schedules?: PromotionSchedule[];
  imageUrl?: string | null;
  status?: PromotionStatus;
};

export type UpdateCommercePromotionInput = Partial<CreateCommercePromotionInput>;

export type PublicStatsResponse = {
  ok: boolean;
  stats: {
    approvedCommerces: number;
    activePromotions: number;
    activeCities: number;
  };
};

export type AdminBetaAccessRequest = {
  id: number;
  email: string;
  city?: string | null;
  platform: "IPHONE" | "ANDROID";
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminBetaAccessRequestsResponse = {
  ok: boolean;
  total: number;
  page: number;
  limit: number;
  requests: AdminBetaAccessRequest[];
};

export type AdminDashboardResponse = {
  ok: boolean;
  dashboard: {
    metrics: {
      users: {
        total: number;
        clients: number;
        commerceUsers: number;
        admins: number;
        active: number;
        blocked: number;
      };
      commerces: {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
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
      business: {
        approvalRate: number;
        redemptionSuccessRate: number;
        monthlyActiveClients: number;
        dormantApprovedCommerces: number;
        approvedWithoutPromotions: number;
        mapReadyCommerces: number;
        approvedMissingCoordinates: number;
        approvedMissingAddress: number;
        approvedWithInactiveCategory: number;
        successfulRedemptionsLast30Days: number;
        failedRedemptionsLast30Days: number;
        incidentsOpen: number;
      };
    };
    leaderboards: {
      topCommerces: Array<{
        id: number;
        name: string;
        slug: string;
        status: string;
        cityName: string;
        ownerName: string;
        redemptionsCount: number;
        promotionsCount: number;
      }>;
      topPromotions: Array<{
        id: number;
        title: string;
        status: string;
        redemptionsCount: number;
        commerce: {
          id: number;
          name: string;
          slug: string;
        };
      }>;
    };
    recentIncidents: Array<{
      kind: "COMMERCE" | "PROMOTION" | string;
      id: number;
      title: string;
      status: string;
      note?: string | null;
      createdAt: string;
      commerce?: {
        id: number;
        name: string;
        slug: string;
      } | null;
      owner?: {
        fullName: string;
        email: string;
      } | null;
    }>;
    recentCommerces: Array<{
      id: number;
      name: string;
      slug: string;
      status: string;
      createdAt: string;
      owner: {
        id: number;
        fullName: string;
        email: string;
      };
      city: {
        id: number;
        name: string;
        province: string;
        slug: string;
      };
      category: {
        id: number;
        name: string;
        slug: string;
        icon?: string | null;
      };
    }>;
  };
};

export type AdminCommerceItem = {
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
  status: string;
  moderationNote?: string | null;
  isFeatured?: boolean;
  featuredRank?: number;
  isHiddenByAdmin?: boolean;
  adminNote?: string | null;
  adminEditedAt?: string | null;
  adminEditedByUserId?: number | null;
  createdAt: string;
  updatedAt: string;
  owner: AuthUser;
  city: {
    id: number;
    name: string;
    province: string;
    slug: string;
  };
  category: {
    id: number;
    name: string;
    slug: string;
    icon?: string | null;
    isActive?: boolean;
  };
  readiness: {
    isApproved: boolean;
    isMapReady: boolean;
    isProfileComplete: boolean;
    missingFields: string[];
    blockingFields: string[];
  };
  _count: {
    promotions: number;
    redemptions: number;
  };
};

export type AdminCommercesResponse = {
  ok: boolean;
  total: number;
  commerces: AdminCommerceItem[];
};

export type AdminCategoryItem = {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  isActive: boolean;
  commerceCount: number;
  approvedCommerceCount: number;
  mapReadyCommerceCount: number;
  incompleteCommerceCount: number;
};

export type AdminCategoriesResponse = {
  ok: boolean;
  total: number;
  categories: AdminCategoryItem[];
};

export type AdminCategoryResponse = {
  ok: boolean;
  message?: string;
  category: AdminCategoryItem;
};

export type AdminAuditLogItem = {
  id: number;
  action: string;
  targetType: "COMMERCE" | "PROMOTION" | string;
  targetId: number;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  adminUser: {
    id: number;
    fullName: string;
    email: string;
  };
  commerce?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  promotion?: {
    id: number;
    title: string;
  } | null;
};

export type AdminAuditLogsResponse = {
  ok: boolean;
  total: number;
  auditLogs: AdminAuditLogItem[];
};

export type UpdateCommerceStatusResponse = {
  ok: boolean;
  message?: string;
  commerce: {
    id: number;
    name: string;
    slug: string;
    status: string;
    moderationNote?: string | null;
    updatedAt: string;
    owner: {
      id: number;
      fullName: string;
      email: string;
    };
    city: {
      id: number;
      name: string;
      province: string;
    };
    category: {
      id: number;
      name: string;
      slug: string;
    };
  };
};

export type AdminPromotionItem = {
  id: number;
  title: string;
  description: string;
  promotionType: string;
  validationMethod: ValidationMethod;
  discountValue?: number | null;
  conditions?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  schedules?: PromotionSchedule[];
  imageUrl?: string | null;
  status: string;
  moderationNote?: string | null;
  isFeatured?: boolean;
  featuredRank?: number;
  isHiddenByAdmin?: boolean;
  adminNote?: string | null;
  adminEditedAt?: string | null;
  adminEditedByUserId?: number | null;
  createdAt: string;
  updatedAt: string;
  commerce: {
    id: number;
    name: string;
    slug: string;
    status: string;
    city: {
      id: number;
      name: string;
      province: string;
    };
    category: {
      id: number;
      name: string;
      slug: string;
      icon?: string | null;
    };
    owner: {
      id: number;
      fullName: string;
      email: string;
    };
  };
  _count: {
    redemptions: number;
  };
};

export type AdminPromotionsResponse = {
  ok: boolean;
  total: number;
  promotions: AdminPromotionItem[];
};

export type UpdatePromotionStatusResponse = {
  ok: boolean;
  message?: string;
  promotion: {
    id: number;
    title: string;
    status: string;
    moderationNote?: string | null;
    isFeatured?: boolean;
    featuredRank?: number;
    isHiddenByAdmin?: boolean;
    adminNote?: string | null;
    adminEditedAt?: string | null;
    adminEditedByUserId?: number | null;
    updatedAt: string;
    commerce: {
      id: number;
      name: string;
      slug: string;
      status: string;
    };
  };
};

export type UpdateAdminPromotionResponse = {
  ok: boolean;
  message?: string;
  promotion: AdminPromotionItem;
};

export type UpdateAdminCommerceResponse = {
  ok: boolean;
  message?: string;
  commerce: AdminCommerceItem;
};
