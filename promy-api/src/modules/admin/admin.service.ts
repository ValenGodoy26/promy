import {
  AppNotificationType,
  CommerceStatus,
  Prisma,
  PromotionStatus,
  UserStatus,
} from "@prisma/client";
import prisma from "../../config/prisma";
import { invalidatePublicCatalogCache } from "../../shared/cache/publicCatalogCache";
import { sharedTtlCache } from "../../shared/cache/ttlCache";
import { buildWebPanelPath } from "../../shared/utils/deepLinks";
import { logOperationalEvent, logger, logWarn } from "../../shared/logging/logger";
import { sendTransactionalEmail } from "../../shared/services/email.service";
import { escapeHtmlText } from "../../shared/security/html";
import { createAppNotification } from "../notifications/notifications.service";
import { publishRealtimeEvent } from "../realtime/realtime.service";

type CommerceReadinessInput = {
  status: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  shortDescription?: string | null;
  description?: string | null;
  phone?: string | null;
  instagram?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  owner?: {
    emailVerifiedAt?: Date | null;
  } | null;
  city?: {
    isActive?: boolean | null;
  } | null;
  category?: {
    isActive?: boolean | null;
  } | null;
};

export type CommerceReadiness = {
  isApproved: boolean;
  isMapReady: boolean;
  isProfileComplete: boolean;
  missingFields: string[];
  blockingFields: string[];
};

export type AdminAuditQueryInput = {
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
};

export type AdminCommercesQueryInput = {
  status?: CommerceStatus;
  cityId?: number;
  categoryId?: number;
  ownerStatus?: UserStatus;
  hasPromotions?: boolean;
  hasRedemptions?: boolean;
  mapReady?: boolean;
  profileComplete?: boolean;
  missingField?:
    | "address"
    | "coordinates"
    | "shortDescription"
    | "description"
    | "phone"
    | "instagram"
    | "logo"
    | "cover"
    | "emailNotVerified"
    | "categoryInactive"
    | "cityInactive"
    | "status";
  search?: string;
  limit?: number;
};

export type AdminPromotionsQueryInput = {
  status?: PromotionStatus;
  commerceStatus?: CommerceStatus;
  cityId?: number;
  categoryId?: number;
  hasRedemptions?: boolean;
  search?: string;
  limit?: number;
};

export type AdminCategoriesQueryInput = {
  search?: string;
  isActive?: boolean;
};

export type AdminCategoryInput = {
  name: string;
  icon?: string;
  isActive?: boolean;
};

export type AdminCommerceUpdateInput = {
  name?: string;
  shortDescription?: string | null;
  description?: string | null;
  address?: string;
  phone?: string | null;
  instagram?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cityId?: number;
  categoryId?: number;
  isFeatured?: boolean;
  featuredRank?: number;
  isHiddenByAdmin?: boolean;
  adminNote?: string | null;
  note?: string;
};

export type AdminPromotionUpdateInput = {
  title?: string;
  description?: string;
  conditions?: string | null;
  discountValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  imageUrl?: string | null;
  isFeatured?: boolean;
  featuredRank?: number;
  isHiddenByAdmin?: boolean;
  adminNote?: string | null;
  note?: string;
};

export class AdminServiceError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "AdminServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isAdminServiceError(error: unknown): error is AdminServiceError {
  return error instanceof AdminServiceError;
}

const mapBlockingWhere = {
  status: "APPROVED" as const,
  address: { not: "" },
  latitude: { not: null },
  longitude: { not: null },
  owner: {
    is: {
      emailVerifiedAt: {
        not: null,
      },
    },
  },
  category: {
    is: {
      isActive: true,
    },
  },
  city: {
    is: {
      isActive: true,
    },
  },
};

function hasValue(value?: string | null) {
  return Boolean(value?.trim());
}

function parseMetadata(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isIncidentAuditLog(log: { note?: string | null; metadata?: Record<string, unknown> | null }) {
  const nextStatus = String(log.metadata?.nextStatus || "");
  return (
    nextStatus === "REJECTED" ||
    nextStatus === "PENDING_REVIEW" ||
    nextStatus === "EXPIRED" ||
    Boolean(log.note?.trim())
  );
}

function getSearchValue(value?: string) {
  return value?.trim().toLowerCase() || undefined;
}

async function sendCommerceStatusEmail(params: {
  email: string;
  fullName: string;
  commerceName: string;
  status: "APPROVED" | "REJECTED";
  note?: string | null;
}) {
  const subject =
    params.status === "APPROVED"
      ? "Tu comercio fue aprobado en PROMY"
      : "Tu alta de comercio necesita correcciones";

  const body =
    params.status === "APPROVED"
      ? `Tu comercio ${params.commerceName} ya fue aprobado y puede operar promociones en PROMY.`
      : params.note
      ? `Tu alta de ${params.commerceName} necesita correcciones: ${params.note}`
      : `Tu alta de ${params.commerceName} necesita correcciones antes de poder operar.`;
  const htmlBody =
    params.status === "APPROVED"
      ? `Tu comercio ${escapeHtmlText(params.commerceName)} ya fue aprobado y puede operar promociones en PROMY.`
      : params.note
      ? `Tu alta de ${escapeHtmlText(params.commerceName)} necesita correcciones: ${escapeHtmlText(params.note)}`
      : `Tu alta de ${escapeHtmlText(params.commerceName)} necesita correcciones antes de poder operar.`;

  await sendTransactionalEmail({
    to: params.email,
    subject,
    text: `${params.fullName}, ${body}`,
    html: `
      <p>${escapeHtmlText(params.fullName)},</p>
      <p>${htmlBody}</p>
      <p>Equipo PROMY</p>
    `,
  });
}

function canTransitionPromotionStatus(
  currentStatus: PromotionStatus,
  nextStatus: PromotionStatus,
) {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowedTransitions: Record<PromotionStatus, PromotionStatus[]> = {
    DRAFT: [],
    PENDING_REVIEW: [
      PromotionStatus.APPROVED_VISIBLE,
      PromotionStatus.REJECTED,
      PromotionStatus.EXPIRED,
    ],
    APPROVED_VISIBLE: [
      PromotionStatus.PENDING_REVIEW,
      PromotionStatus.REJECTED,
      PromotionStatus.EXPIRED,
    ],
    REJECTED: [PromotionStatus.PENDING_REVIEW, PromotionStatus.APPROVED_VISIBLE],
    EXPIRED: [PromotionStatus.PENDING_REVIEW],
  };

  return allowedTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

function getMissingFieldWhere(
  missingField: NonNullable<AdminCommercesQueryInput["missingField"]>,
): Prisma.CommerceWhereInput {
  if (missingField === "address") {
    return { address: "" };
  }

  if (missingField === "coordinates") {
    return { OR: [{ latitude: null }, { longitude: null }] };
  }

  if (missingField === "shortDescription") {
    return { OR: [{ shortDescription: null }, { shortDescription: "" }] };
  }

  if (missingField === "description") {
    return { OR: [{ description: null }, { description: "" }] };
  }

  if (missingField === "phone") {
    return { OR: [{ phone: null }, { phone: "" }] };
  }

  if (missingField === "instagram") {
    return { OR: [{ instagram: null }, { instagram: "" }] };
  }

  if (missingField === "logo") {
    return { OR: [{ logoUrl: null }, { logoUrl: "" }] };
  }

  if (missingField === "cover") {
    return { OR: [{ coverUrl: null }, { coverUrl: "" }] };
  }

  if (missingField === "emailNotVerified") {
    return { owner: { is: { emailVerifiedAt: null } } };
  }

  if (missingField === "categoryInactive") {
    return { category: { is: { isActive: false } } };
  }

  if (missingField === "cityInactive") {
    return { city: { is: { isActive: false } } };
  }

  return { status: { not: CommerceStatus.APPROVED } };
}

function buildCategorySummary(category: {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  isActive: boolean;
  commerces: Array<{
    status: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    shortDescription: string | null;
    description: string | null;
    phone: string | null;
    instagram: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    owner: {
      emailVerifiedAt: Date | null;
    };
    city: {
      isActive: boolean;
    };
  }>;
  _count: {
    commerces: number;
  };
}) {
  const approvedCommerceCount = category.commerces.filter(
    (commerce) => commerce.status === "APPROVED",
  ).length;

  const mapReadyCommerceCount = category.commerces.filter((commerce) =>
    getCommerceReadiness({
      ...commerce,
      category: {
        isActive: category.isActive,
      },
    }).isMapReady,
  ).length;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    isActive: category.isActive,
    commerceCount: category._count.commerces,
    approvedCommerceCount,
    mapReadyCommerceCount,
    incompleteCommerceCount: category._count.commerces - mapReadyCommerceCount,
  };
}

export function getCommerceReadiness(input: CommerceReadinessInput): CommerceReadiness {
  const missingFields: string[] = [];
  const blockingFields: string[] = [];

  if (!hasValue(input.address)) {
    missingFields.push("address");
    blockingFields.push("address");
  }

  if (typeof input.latitude !== "number" || typeof input.longitude !== "number") {
    missingFields.push("coordinates");
    blockingFields.push("coordinates");
  }

  if (!hasValue(input.shortDescription)) {
    missingFields.push("shortDescription");
  }

  if (!hasValue(input.description)) {
    missingFields.push("description");
  }

  if (!hasValue(input.phone)) {
    missingFields.push("phone");
  }

  if (!hasValue(input.instagram)) {
    missingFields.push("instagram");
  }

  if (!hasValue(input.logoUrl)) {
    missingFields.push("logo");
  }

  if (!hasValue(input.coverUrl)) {
    missingFields.push("cover");
  }

  if (!input.owner?.emailVerifiedAt) {
    missingFields.push("emailNotVerified");
    blockingFields.push("emailNotVerified");
  }

  if (input.category?.isActive === false) {
    missingFields.push("categoryInactive");
    blockingFields.push("categoryInactive");
  }

  if (input.city?.isActive === false) {
    missingFields.push("cityInactive");
    blockingFields.push("cityInactive");
  }

  if (input.status !== "APPROVED") {
    blockingFields.push("status");
  }

  return {
    isApproved: input.status === "APPROVED",
    isMapReady: input.status === "APPROVED" && blockingFields.length === 0,
    isProfileComplete: missingFields.length === 0,
    missingFields,
    blockingFields,
  };
}

function getCommerceApprovalReadiness(input: CommerceReadinessInput) {
  return getCommerceReadiness({
    ...input,
    status: CommerceStatus.APPROVED,
  });
}

export function slugifyName(value: string, fallback = "item") {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return normalized || `${fallback}-${Date.now()}`;
}

export async function buildUniqueCategorySlug(categoryName: string) {
  const baseSlug = slugifyName(categoryName, "categoria");
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function getAdminDashboardData() {
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalClients,
    totalCommerceUsers,
    totalAdmins,
    activeUsers,
    blockedUsers,
    totalCommerces,
    approvedCommerces,
    pendingCommerces,
    rejectedCommerces,
    inactiveCommerces,
    totalPromotions,
    approvedVisiblePromotions,
    pendingReviewPromotions,
    draftPromotions,
    rejectedPromotions,
    expiredPromotions,
    totalRedemptions,
    successRedemptions,
    failedRedemptions,
    monthlyActiveClients,
    dormantApprovedCommerces,
    approvedWithoutPromotions,
    successfulRedemptionsLast30Days,
    failedRedemptionsLast30Days,
    mapReadyCommerces,
    approvedMissingCoordinates,
    approvedMissingAddress,
    approvedWithInactiveCategory,
    recentCommerces,
    recentRedemptions,
    commerceLeaderboardSource,
    promotionLeaderboardSource,
    recentIncidentCommerces,
    recentIncidentPromotions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "COMMERCE" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: "BLOCKED" } }),
    prisma.commerce.count(),
    prisma.commerce.count({ where: { status: "APPROVED" } }),
    prisma.commerce.count({ where: { status: "PENDING" } }),
    prisma.commerce.count({ where: { status: "REJECTED" } }),
    prisma.commerce.count({ where: { status: "INACTIVE" } }),
    prisma.promotion.count(),
    prisma.promotion.count({ where: { status: "APPROVED_VISIBLE" } }),
    prisma.promotion.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.promotion.count({ where: { status: "DRAFT" } }),
    prisma.promotion.count({ where: { status: "REJECTED" } }),
    prisma.promotion.count({ where: { status: "EXPIRED" } }),
    prisma.redemption.count(),
    prisma.redemption.count({ where: { status: "SUCCESS" } }),
    prisma.redemption.count({ where: { status: "FAILED" } }),
    prisma.redemption.findMany({
      where: {
        status: "SUCCESS",
        createdAt: {
          gte: last30Days,
        },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    }),
    prisma.commerce.count({
      where: {
        status: "APPROVED",
        redemptions: {
          none: {
            status: "SUCCESS",
            createdAt: {
              gte: last30Days,
            },
          },
        },
      },
    }),
    prisma.commerce.count({
      where: {
        status: "APPROVED",
        promotions: {
          none: {},
        },
      },
    }),
    prisma.redemption.count({
      where: {
        status: "SUCCESS",
        createdAt: {
          gte: last30Days,
        },
      },
    }),
    prisma.redemption.count({
      where: {
        status: "FAILED",
        createdAt: {
          gte: last30Days,
        },
      },
    }),
    prisma.commerce.count({
      where: mapBlockingWhere,
    }),
    prisma.commerce.count({
      where: {
        status: "APPROVED",
        OR: [{ latitude: null }, { longitude: null }],
      },
    }),
    prisma.commerce.count({
      where: {
        status: "APPROVED",
        address: "",
      },
    }),
    prisma.commerce.count({
      where: {
        status: "APPROVED",
        category: {
          is: {
            isActive: false,
          },
        },
      },
    }),
    prisma.commerce.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
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
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.redemption.findMany({
      select: {
        id: true,
        validationMethod: true,
        status: true,
        redeemedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        promotion: {
          select: {
            id: true,
            title: true,
            promotionType: true,
            discountValue: true,
          },
        },
        commerce: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.commerce.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        city: {
          select: {
            name: true,
          },
        },
        owner: {
          select: {
            fullName: true,
          },
        },
        _count: {
          select: {
            redemptions: true,
            promotions: true,
          },
        },
      },
      take: 50,
    }),
    prisma.promotion.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        commerce: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
      take: 80,
    }),
    prisma.commerce.findMany({
      where: {
        status: {
          in: ["PENDING", "REJECTED"],
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        moderationNote: true,
        isFeatured: true,
        featuredRank: true,
        isHiddenByAdmin: true,
        adminNote: true,
        adminEditedAt: true,
        adminEditedByUserId: true,
        updatedAt: true,
        owner: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 4,
    }),
    prisma.promotion.findMany({
      where: {
        status: {
          in: ["PENDING_REVIEW", "REJECTED", "EXPIRED"],
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        moderationNote: true,
        updatedAt: true,
        commerce: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 4,
    }),
  ]);

  const reviewedCommerces = approvedCommerces + rejectedCommerces;
  const approvalRate = reviewedCommerces
    ? Math.round((approvedCommerces / reviewedCommerces) * 100)
    : 0;
  const redemptionSuccessRate = totalRedemptions
    ? Math.round((successRedemptions / totalRedemptions) * 100)
    : 0;

  const topCommerces = commerceLeaderboardSource
    .sort((a, b) => b._count.redemptions - a._count.redemptions)
    .slice(0, 5)
    .map((commerce) => ({
      id: commerce.id,
      name: commerce.name,
      slug: commerce.slug,
      status: commerce.status,
      cityName: commerce.city.name,
      ownerName: commerce.owner.fullName,
      redemptionsCount: commerce._count.redemptions,
      promotionsCount: commerce._count.promotions,
    }));

  const topPromotions = promotionLeaderboardSource
    .sort((a, b) => b._count.redemptions - a._count.redemptions)
    .slice(0, 5)
    .map((promotion) => ({
      id: promotion.id,
      title: promotion.title,
      status: promotion.status,
      redemptionsCount: promotion._count.redemptions,
      commerce: promotion.commerce,
    }));

  const recentIncidents = [
    ...recentIncidentCommerces.map((commerce) => ({
      kind: "COMMERCE" as const,
      id: commerce.id,
      title: commerce.name,
      status: commerce.status,
      note: commerce.moderationNote,
      createdAt: commerce.updatedAt.toISOString(),
      commerce: {
        id: commerce.id,
        name: commerce.name,
        slug: commerce.slug,
      },
      owner: commerce.owner,
    })),
    ...recentIncidentPromotions.map((promotion) => ({
      kind: "PROMOTION" as const,
      id: promotion.id,
      title: promotion.title,
      status: promotion.status,
      note: promotion.moderationNote,
      createdAt: promotion.updatedAt.toISOString(),
      commerce: promotion.commerce,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return {
    metrics: {
      users: {
        total: totalUsers,
        clients: totalClients,
        commerceUsers: totalCommerceUsers,
        admins: totalAdmins,
        active: activeUsers,
        blocked: blockedUsers,
      },
      commerces: {
        total: totalCommerces,
        approved: approvedCommerces,
        pending: pendingCommerces,
        rejected: rejectedCommerces,
        inactive: inactiveCommerces,
      },
      promotions: {
        total: totalPromotions,
        approvedVisible: approvedVisiblePromotions,
        pendingReview: pendingReviewPromotions,
        draft: draftPromotions,
        rejected: rejectedPromotions,
        expired: expiredPromotions,
      },
      redemptions: {
        total: totalRedemptions,
        success: successRedemptions,
        failed: failedRedemptions,
      },
      business: {
        approvalRate,
        redemptionSuccessRate,
        monthlyActiveClients: monthlyActiveClients.length,
        dormantApprovedCommerces,
        approvedWithoutPromotions,
        mapReadyCommerces,
        approvedMissingCoordinates,
        approvedMissingAddress,
        approvedWithInactiveCategory,
        successfulRedemptionsLast30Days,
        failedRedemptionsLast30Days,
        incidentsOpen:
          pendingCommerces +
          rejectedCommerces +
          pendingReviewPromotions +
          rejectedPromotions +
          failedRedemptionsLast30Days,
      },
    },
    leaderboards: {
      topCommerces,
      topPromotions,
    },
    recentIncidents,
    recentCommerces,
    recentRedemptions,
  };
}

export async function getAdminAuditLogsData(input: AdminAuditQueryInput) {
  const search = getSearchValue(input.search);
  const take = input.incidentOnly ? 150 : input.limit || 40;

  const auditLogs = await prisma.adminActionLog.findMany({
    where: {
      ...(input.targetType ? { targetType: input.targetType } : {}),
      ...(input.targetId ? { targetId: input.targetId } : {}),
      ...(input.commerceId ? { commerceId: input.commerceId } : {}),
      ...(input.adminUserId ? { adminUserId: input.adminUserId } : {}),
      ...(input.action ? { action: input.action } : {}),
      ...(search
        ? {
            OR: [
              {
                note: {
                  contains: search,
                },
              },
              {
                adminUser: {
                  fullName: {
                    contains: search,
                  },
                },
              },
              {
                adminUser: {
                  email: {
                    contains: search,
                  },
                },
              },
              {
                commerce: {
                  name: {
                    contains: search,
                  },
                },
              },
              {
                promotion: {
                  title: {
                    contains: search,
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      note: true,
      metadata: true,
      createdAt: true,
      adminUser: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      commerce: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      promotion: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take,
  });

  const parsedLogs = auditLogs
    .map((item) => ({
      ...item,
      metadata: parseMetadata(item.metadata),
    }))
    .filter((item) => (input.incidentOnly ? isIncidentAuditLog(item) : true))
    .slice(0, input.limit || 40);

  return {
    total: parsedLogs.length,
    auditLogs: parsedLogs,
  };
}

export async function getAdminCommercesData(input: AdminCommercesQueryInput) {
  const search = getSearchValue(input.search);
  const blockingFilters: Prisma.CommerceWhereInput[] = [];

  if (input.mapReady !== undefined) {
    blockingFilters.push(
      input.mapReady
        ? {
            AND: [
              { status: "APPROVED" },
              { address: { not: "" } },
              { latitude: { not: null } },
              { longitude: { not: null } },
              { category: { is: { isActive: true } } },
              { city: { is: { isActive: true } } },
            ],
          }
        : {
            OR: [
              { status: { not: CommerceStatus.APPROVED } },
              { address: "" },
              { latitude: null },
              { longitude: null },
              { category: { is: { isActive: false } } },
              { city: { is: { isActive: false } } },
            ],
          },
    );
  }

  if (input.profileComplete !== undefined) {
    blockingFilters.push(
      input.profileComplete
        ? {
            AND: [
              { shortDescription: { not: null } },
              { shortDescription: { not: "" } },
              { description: { not: null } },
              { description: { not: "" } },
              { phone: { not: null } },
              { phone: { not: "" } },
              { instagram: { not: null } },
              { instagram: { not: "" } },
              { logoUrl: { not: null } },
              { logoUrl: { not: "" } },
              { coverUrl: { not: null } },
              { coverUrl: { not: "" } },
            ],
          }
        : {
            OR: [
              { shortDescription: null },
              { shortDescription: "" },
              { description: null },
              { description: "" },
              { phone: null },
              { phone: "" },
              { instagram: null },
              { instagram: "" },
              { logoUrl: null },
              { logoUrl: "" },
              { coverUrl: null },
              { coverUrl: "" },
            ],
          },
    );
  }

  if (input.missingField) {
    blockingFilters.push(getMissingFieldWhere(input.missingField));
  }

  const commerces = await prisma.commerce.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.cityId ? { cityId: input.cityId } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.ownerStatus ? { owner: { is: { status: input.ownerStatus } } } : {}),
      ...(input.hasPromotions === undefined
        ? {}
        : input.hasPromotions
        ? { promotions: { some: {} } }
        : { promotions: { none: {} } }),
      ...(input.hasRedemptions === undefined
        ? {}
        : input.hasRedemptions
        ? { redemptions: { some: {} } }
        : { redemptions: { none: {} } }),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { slug: { contains: search } },
              { address: { contains: search } },
              { owner: { is: { fullName: { contains: search } } } },
              { owner: { is: { email: { contains: search } } } },
              { city: { is: { name: { contains: search } } } },
              { category: { is: { name: { contains: search } } } },
            ],
          }
        : {}),
      ...(blockingFilters.length ? { AND: blockingFilters } : {}),
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
      moderationNote: true,
      isFeatured: true,
      featuredRank: true,
      isHiddenByAdmin: true,
      adminNote: true,
      adminEditedAt: true,
      adminEditedByUserId: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true,
          phone: true,
          emailVerifiedAt: true,
        },
      },
      city: {
        select: {
          id: true,
          name: true,
          province: true,
          slug: true,
          isActive: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          isActive: true,
        },
      },
      _count: {
        select: {
          promotions: true,
          redemptions: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { isFeatured: "desc" },
      { featuredRank: "asc" },
      { createdAt: "desc" },
    ],
    take: input.limit || 120,
  });

  return {
    total: commerces.length,
    commerces: commerces.map((commerce) => ({
      ...commerce,
      readiness: getCommerceReadiness(commerce),
    })),
  };
}

export async function updateCommerceStatusByAdmin(input: {
  commerceId: number;
  adminUserId: number;
  status: CommerceStatus;
  note?: string;
}) {
  if (input.status === "REJECTED" && !input.note) {
    throw new AdminServiceError("Debes indicar una observacion para rechazar el comercio", 400);
  }

  const existingCommerce = await prisma.commerce.findUnique({
    where: { id: input.commerceId },
    select: {
      id: true,
      status: true,
      address: true,
      latitude: true,
      longitude: true,
      shortDescription: true,
      description: true,
      phone: true,
      instagram: true,
      logoUrl: true,
      coverUrl: true,
      owner: {
        select: {
          emailVerifiedAt: true,
        },
      },
      city: {
        select: {
          isActive: true,
        },
      },
      category: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (!existingCommerce) {
    throw new AdminServiceError("Comercio no encontrado", 404);
  }

  if (input.status === "APPROVED") {
    const readiness = getCommerceApprovalReadiness(existingCommerce);

    if (readiness.blockingFields.length) {
      throw new AdminServiceError(
        "No puedes aprobar este comercio hasta completar los requisitos minimos de operacion.",
        400,
        {
          readiness,
        },
      );
    }
  }

  const updatedCommerce = await prisma.$transaction(async (tx) => {
    const commerce = await tx.commerce.update({
      where: { id: input.commerceId },
      data: {
        status: input.status,
        moderationNote: input.note || null,
        ...(input.status === CommerceStatus.INACTIVE ? { isHiddenByAdmin: true } : {}),
        ...(input.status === CommerceStatus.INACTIVE
          ? { isSuspendedByAdmin: true }
          : input.status === CommerceStatus.APPROVED
            ? { isSuspendedByAdmin: false }
            : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        moderationNote: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
            province: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    await tx.adminActionLog.create({
      data: {
        adminUserId: input.adminUserId,
        action: "UPDATE_COMMERCE_STATUS",
        targetType: "COMMERCE",
        targetId: input.commerceId,
        note: input.note || null,
        metadata: JSON.stringify({
          previousStatus: existingCommerce.status,
          nextStatus: input.status,
        }),
        commerceId: input.commerceId,
      },
    });

    return commerce;
  });

  if (updatedCommerce.status === "APPROVED") {
    await createAppNotification({
      userId: updatedCommerce.owner.id,
      type: AppNotificationType.COMMERCE_APPROVED,
      title: "Comercio aprobado",
      body: `${updatedCommerce.name} ya fue aprobado y puede operar promociones en PROMY.`,
      data: {
        commerceId: updatedCommerce.id,
        commerceSlug: updatedCommerce.slug,
        commerceStatus: updatedCommerce.status,
        webPath: buildWebPanelPath("/commerce/profile"),
      },
    });

    void sendCommerceStatusEmail({
      email: updatedCommerce.owner.email,
      fullName: updatedCommerce.owner.fullName,
      commerceName: updatedCommerce.name,
      status: "APPROVED",
    }).catch((error) =>
      logWarn(undefined, "No pudimos enviar el email de comercio aprobado", {
        commerceId: updatedCommerce.id,
        ownerUserId: updatedCommerce.owner.id,
        error,
      }),
    );
  }

  if (updatedCommerce.status === "REJECTED") {
    await createAppNotification({
      userId: updatedCommerce.owner.id,
      type: AppNotificationType.COMMERCE_REJECTED,
      title: "Alta de comercio observada",
      body: input.note
        ? `Tu alta de ${updatedCommerce.name} necesita correcciones: ${input.note}`
        : `Tu alta de ${updatedCommerce.name} necesita correcciones antes de poder operar.`,
      data: {
        commerceId: updatedCommerce.id,
        commerceSlug: updatedCommerce.slug,
        commerceStatus: updatedCommerce.status,
        webPath: buildWebPanelPath("/commerce/profile"),
      },
    });

    void sendCommerceStatusEmail({
      email: updatedCommerce.owner.email,
      fullName: updatedCommerce.owner.fullName,
      commerceName: updatedCommerce.name,
      status: "REJECTED",
      note: input.note || null,
    }).catch((error) =>
      logWarn(undefined, "No pudimos enviar el email de comercio rechazado", {
        commerceId: updatedCommerce.id,
        ownerUserId: updatedCommerce.owner.id,
        error,
      }),
    );
  }

  publishRealtimeEvent({
    type: "commerce.status.changed",
    targetRoles: ["ADMIN", "COMMERCE"],
    commerceOwnerUserId: updatedCommerce.owner.id,
    payload: {
      commerceId: updatedCommerce.id,
      commerceName: updatedCommerce.name,
      commerceSlug: updatedCommerce.slug,
      status: updatedCommerce.status,
      moderationNote: updatedCommerce.moderationNote,
    },
  });

  logOperationalEvent(logger, "admin.commerce_status_changed", {
    adminUserId: input.adminUserId,
    commerceId: updatedCommerce.id,
    commerceName: updatedCommerce.name,
    previousStatus: existingCommerce.status,
    nextStatus: updatedCommerce.status,
    note: input.note || null,
  });

  await invalidatePublicCatalogCache();

  return updatedCommerce;
}

export async function updateCommerceByAdmin(input: {
  commerceId: number;
  adminUserId: number;
  data: AdminCommerceUpdateInput;
}) {
  const existingCommerce = await prisma.commerce.findUnique({
    where: { id: input.commerceId },
  });

  if (!existingCommerce) {
    throw new AdminServiceError("Comercio no encontrado", 404);
  }

  const updateData: Prisma.CommerceUpdateInput = {};

  if (input.data.name !== undefined) updateData.name = input.data.name;
  if (input.data.shortDescription !== undefined) updateData.shortDescription = input.data.shortDescription;
  if (input.data.description !== undefined) updateData.description = input.data.description;
  if (input.data.address !== undefined) updateData.address = input.data.address;
  if (input.data.phone !== undefined) updateData.phone = input.data.phone;
  if (input.data.instagram !== undefined) updateData.instagram = input.data.instagram;
  if (input.data.logoUrl !== undefined) updateData.logoUrl = input.data.logoUrl;
  if (input.data.coverUrl !== undefined) updateData.coverUrl = input.data.coverUrl;
  if (input.data.latitude !== undefined) updateData.latitude = input.data.latitude;
  if (input.data.longitude !== undefined) updateData.longitude = input.data.longitude;
  if (input.data.cityId !== undefined) updateData.city = { connect: { id: input.data.cityId } };
  if (input.data.categoryId !== undefined) {
    updateData.category = { connect: { id: input.data.categoryId } };
  }
  if (input.data.isFeatured !== undefined) updateData.isFeatured = input.data.isFeatured;
  if (input.data.featuredRank !== undefined) updateData.featuredRank = input.data.featuredRank;
  if (input.data.isHiddenByAdmin !== undefined) {
    updateData.isHiddenByAdmin = input.data.isHiddenByAdmin;
  }
  if (input.data.adminNote !== undefined) updateData.adminNote = input.data.adminNote;
  updateData.adminEditedAt = new Date();
  updateData.adminEditedByUserId = input.adminUserId;

  const commerce = await prisma.$transaction(async (tx) => {
    const commerce = await tx.commerce.update({
      where: { id: input.commerceId },
      data: updateData,
      include: {
        owner: true,
        city: true,
        category: true,
        _count: {
          select: {
            promotions: true,
            redemptions: true,
          },
        },
      },
    });

    await tx.adminActionLog.create({
      data: {
        adminUserId: input.adminUserId,
        action: "UPDATE_COMMERCE_CONTENT",
        targetType: "COMMERCE",
        targetId: input.commerceId,
        note: input.data.note || null,
        metadata: JSON.stringify({
          changedFields: Object.keys(input.data).filter((key) => key !== "note"),
        }),
        commerceId: input.commerceId,
      },
    });

    return commerce;
  });

  publishRealtimeEvent({
    type: "commerce.updated",
    targetRoles: ["ADMIN"],
    payload: {
      commerceId: commerce.id,
      status: commerce.status,
      isFeatured: commerce.isFeatured,
      isHiddenByAdmin: commerce.isHiddenByAdmin,
    },
  });

  await invalidatePublicCatalogCache();

  return {
    ...commerce,
    readiness: getCommerceReadiness(commerce),
  };
}

export async function getAdminPromotionsData(input: AdminPromotionsQueryInput) {
  const search = getSearchValue(input.search);

  const promotions = await prisma.promotion.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.commerceStatus
        ? {
            commerce: {
              is: {
                status: input.commerceStatus,
              },
            },
          }
        : {}),
      ...(input.cityId
        ? {
            commerce: {
              is: {
                cityId: input.cityId,
              },
            },
          }
        : {}),
      ...(input.categoryId
        ? {
            commerce: {
              is: {
                categoryId: input.categoryId,
              },
            },
          }
        : {}),
      ...(input.hasRedemptions === undefined
        ? {}
        : input.hasRedemptions
        ? { redemptions: { some: {} } }
        : { redemptions: { none: {} } }),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
              { commerce: { is: { name: { contains: search } } } },
              {
                commerce: {
                  is: {
                    owner: {
                      is: {
                        fullName: {
                          contains: search,
                        },
                      },
                    },
                  },
                },
              },
              {
                commerce: {
                  is: {
                    owner: {
                      is: {
                        email: {
                          contains: search,
                        },
                      },
                    },
                  },
                },
              },
              {
                commerce: {
                  is: {
                    city: {
                      is: {
                        name: {
                          contains: search,
                        },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      promotionType: true,
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
      moderationNote: true,
      isFeatured: true,
      featuredRank: true,
      isHiddenByAdmin: true,
      adminNote: true,
      adminEditedAt: true,
      adminEditedByUserId: true,
      createdAt: true,
      updatedAt: true,
      commerce: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          city: {
            select: {
              id: true,
              name: true,
              province: true,
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
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          redemptions: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: input.limit || 120,
  });

  return {
    total: promotions.length,
    promotions,
  };
}

function parseAdminDate(value?: string | null) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AdminServiceError("Fecha invalida en la promocion", 400);
  }
  return date;
}

export async function updatePromotionByAdmin(input: {
  promotionId: number;
  adminUserId: number;
  data: AdminPromotionUpdateInput;
}) {
  const existingPromotion = await prisma.promotion.findUnique({
    where: { id: input.promotionId },
  });

  if (!existingPromotion) {
    throw new AdminServiceError("Promocion no encontrada", 404);
  }

  const updateData: Prisma.PromotionUpdateInput = {
    adminEditedAt: new Date(),
    adminEditedByUserId: input.adminUserId,
  };

  if (input.data.title !== undefined) updateData.title = input.data.title;
  if (input.data.description !== undefined) updateData.description = input.data.description;
  if (input.data.conditions !== undefined) updateData.conditions = input.data.conditions;
  if (input.data.discountValue !== undefined) updateData.discountValue = input.data.discountValue;
  if (input.data.startDate !== undefined) updateData.startDate = parseAdminDate(input.data.startDate);
  if (input.data.endDate !== undefined) updateData.endDate = parseAdminDate(input.data.endDate);
  if (input.data.startTime !== undefined) updateData.startTime = input.data.startTime;
  if (input.data.endTime !== undefined) updateData.endTime = input.data.endTime;
  if (input.data.imageUrl !== undefined) updateData.imageUrl = input.data.imageUrl;
  if (input.data.isFeatured !== undefined) updateData.isFeatured = input.data.isFeatured;
  if (input.data.featuredRank !== undefined) updateData.featuredRank = input.data.featuredRank;
  if (input.data.isHiddenByAdmin !== undefined) {
    updateData.isHiddenByAdmin = input.data.isHiddenByAdmin;
  }
  if (input.data.adminNote !== undefined) updateData.adminNote = input.data.adminNote;

  const promotion = await prisma.$transaction(async (tx) => {
    const promotion = await tx.promotion.update({
      where: { id: input.promotionId },
      data: updateData,
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
        moderationNote: true,
        isFeatured: true,
        featuredRank: true,
        isHiddenByAdmin: true,
        adminNote: true,
        adminEditedAt: true,
        adminEditedByUserId: true,
        updatedAt: true,
        commerce: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            city: true,
            category: true,
            owner: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
    });

    await tx.adminActionLog.create({
      data: {
        adminUserId: input.adminUserId,
        action: "UPDATE_PROMOTION_CONTENT",
        targetType: "PROMOTION",
        targetId: input.promotionId,
        note: input.data.note || null,
        metadata: JSON.stringify({
          changedFields: Object.keys(input.data).filter((key) => key !== "note"),
          editorial: {
            isFeatured: promotion.isFeatured,
            featuredRank: promotion.featuredRank,
            isHiddenByAdmin: promotion.isHiddenByAdmin,
          },
        }),
        promotionId: input.promotionId,
        commerceId: existingPromotion.commerceId,
      },
    });

    return promotion;
  });

  publishRealtimeEvent({
    type: "promotion.updated",
    targetRoles: ["ADMIN"],
    payload: {
      promotionId: promotion.id,
      commerceId: promotion.commerce.id,
      status: promotion.status,
      isFeatured: promotion.isFeatured,
      isHiddenByAdmin: promotion.isHiddenByAdmin,
    },
  });

  await invalidatePublicCatalogCache();

  return promotion;
}

export async function updatePromotionStatusByAdmin(input: {
  promotionId: number;
  adminUserId: number;
  status: PromotionStatus;
  note?: string;
}) {
  if (input.status === "REJECTED" && !input.note) {
    throw new AdminServiceError("Debes indicar una observacion para rechazar la promocion", 400);
  }

  const existingPromotion = await prisma.promotion.findUnique({
    where: { id: input.promotionId },
  });

  if (!existingPromotion) {
    throw new AdminServiceError("Promocion no encontrada", 404);
  }

  if (
    input.status === PromotionStatus.APPROVED_VISIBLE &&
    (existingPromotion.status === PromotionStatus.EXPIRED ||
      (existingPromotion.endDate && existingPromotion.endDate.getTime() < Date.now()))
  ) {
    throw new AdminServiceError(
      "No puedes aprobar como visible una promocion que ya vencio. Ajusta la fecha o recrea la promo.",
      409,
    );
  }

  if (!canTransitionPromotionStatus(existingPromotion.status, input.status)) {
    throw new AdminServiceError(
      `No se puede pasar una promocion de ${existingPromotion.status} a ${input.status}.`,
      409,
    );
  }

  const promotion = await prisma.$transaction(async (tx) => {
    const promotion = await tx.promotion.update({
      where: { id: input.promotionId },
      data: {
        status: input.status,
        moderationNote:
          input.status === PromotionStatus.REJECTED ? input.note || null : null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        moderationNote: true,
        updatedAt: true,
        commerce: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    await tx.adminActionLog.create({
      data: {
        adminUserId: input.adminUserId,
        action: "UPDATE_PROMOTION_STATUS",
        targetType: "PROMOTION",
        targetId: input.promotionId,
        note: input.note || null,
        metadata: JSON.stringify({
          previousStatus: existingPromotion.status,
          nextStatus: input.status,
        }),
        promotionId: input.promotionId,
        commerceId: existingPromotion.commerceId,
      },
    });

    return promotion;
  });

  const promotionOwner = await prisma.promotion.findUnique({
    where: {
      id: promotion.id,
    },
    select: {
      commerce: {
        select: {
          ownerUserId: true,
        },
      },
    },
  });

  publishRealtimeEvent({
    type: "promotion.status.changed",
    targetRoles: ["ADMIN", "COMMERCE"],
    commerceOwnerUserId: promotionOwner?.commerce.ownerUserId ?? null,
    payload: {
      promotionId: promotion.id,
      promotionTitle: promotion.title,
      commerceId: promotion.commerce.id,
      commerceName: promotion.commerce.name,
      status: promotion.status,
      moderationNote: promotion.moderationNote,
    },
  });

  logOperationalEvent(logger, "admin.promotion_status_changed", {
    adminUserId: input.adminUserId,
    promotionId: promotion.id,
    promotionTitle: promotion.title,
    commerceId: promotion.commerce.id,
    previousStatus: existingPromotion.status,
    nextStatus: promotion.status,
    note: input.note || null,
  });

  await invalidatePublicCatalogCache();

  return promotion;
}

export async function getAdminCategoriesData(input: AdminCategoriesQueryInput) {
  const search = getSearchValue(input.search);

  const categories = await prisma.category.findMany({
    where: {
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(search
        ? {
            OR: [{ name: { contains: search } }, { slug: { contains: search } }],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      isActive: true,
      _count: {
        select: {
          commerces: true,
        },
      },
      commerces: {
        select: {
          status: true,
          address: true,
          latitude: true,
          longitude: true,
          shortDescription: true,
          description: true,
          phone: true,
          instagram: true,
          logoUrl: true,
          coverUrl: true,
          owner: {
            select: {
              emailVerifiedAt: true,
            },
          },
          city: {
            select: {
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return {
    total: categories.length,
    categories: categories.map((category) => buildCategorySummary(category)),
  };
}

export async function createAdminCategoryRecord(input: AdminCategoryInput) {
  const existing = await prisma.category.findFirst({
    where: {
      name: {
        equals: input.name,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new AdminServiceError("Ya existe una categoria con ese nombre", 409);
  }

  const slug = await buildUniqueCategorySlug(input.name);

  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug,
      icon: input.icon || null,
      isActive: input.isActive ?? true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      isActive: true,
      _count: {
        select: {
          commerces: true,
        },
      },
    },
  });

  await sharedTtlCache.deleteByPrefix("categories:");

  return {
    ...category,
    commerceCount: category._count.commerces,
    approvedCommerceCount: 0,
    mapReadyCommerceCount: 0,
    incompleteCommerceCount: 0,
  };
}

export async function updateAdminCategoryRecord(input: {
  categoryId: number;
  data: AdminCategoryInput;
}) {
  const existing = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  if (!existing) {
    throw new AdminServiceError("Categoria no encontrada", 404);
  }

  const duplicate = await prisma.category.findFirst({
    where: {
      id: { not: input.categoryId },
      name: {
        equals: input.data.name,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    throw new AdminServiceError("Ya existe otra categoria con ese nombre", 409);
  }

  const nextSlug =
    input.data.name === existing.name ? existing.slug : slugifyName(input.data.name, "categoria");
  let slug = nextSlug;
  let suffix = 2;

  while (
    await prisma.category.findFirst({
      where: {
        id: { not: input.categoryId },
        slug,
      },
      select: { id: true },
    })
  ) {
    slug = `${nextSlug}-${suffix}`;
    suffix += 1;
  }

  const category = await prisma.category.update({
    where: { id: input.categoryId },
    data: {
      name: input.data.name,
      slug,
      icon: input.data.icon || null,
      isActive: input.data.isActive ?? existing.isActive,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      isActive: true,
      commerces: {
        select: {
          status: true,
          address: true,
          latitude: true,
          longitude: true,
          shortDescription: true,
          description: true,
          phone: true,
          instagram: true,
          logoUrl: true,
          coverUrl: true,
          owner: {
            select: {
              emailVerifiedAt: true,
            },
          },
          city: {
            select: {
              isActive: true,
            },
          },
        },
      },
      _count: {
        select: {
          commerces: true,
        },
      },
    },
  });

  await sharedTtlCache.deleteByPrefix("categories:");

  return buildCategorySummary(category);
}
