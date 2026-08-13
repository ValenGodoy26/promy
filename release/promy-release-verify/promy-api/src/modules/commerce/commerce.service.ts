import { PromotionStatus, PromotionType, ValidationMethod } from "@prisma/client";
import { z } from "zod";
import prisma from "../../config/prisma";
import { publishRealtimeEvent } from "../realtime/realtime.service";

function cleanText(value?: string | null) {
  return value?.trim() || undefined;
}

function cleanNullableText(value?: string | null) {
  if (value === null) {
    return null;
  }

  return cleanText(value);
}

const optionalTextField = (min: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} debe tener al menos ${min} caracteres`)
    .optional();

const optionalUrlField = z.string().trim().url("Debe ser una URL valida").optional();
const nullableOptionalUrlField = z.string().trim().url("Debe ser una URL valida").nullable().optional();

const optionalTimeField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "La hora debe tener formato HH:MM")
  .optional();

const nullableOptionalTextField = (min: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} debe tener al menos ${min} caracteres`)
    .nullable()
    .optional();

const nullableOptionalTimeField = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "La hora debe tener formato HH:MM")
  .nullable()
  .optional();

function ensureValidDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) {
    return true;
  }

  return new Date(startDate).getTime() <= new Date(endDate).getTime();
}

function ensureCoordinatePair(latitude?: number | null, longitude?: number | null) {
  const hasLatitude = latitude !== undefined && latitude !== null;
  const hasLongitude = longitude !== undefined && longitude !== null;

  const isLatitudeExplicitlyCleared = latitude === null;
  const isLongitudeExplicitlyCleared = longitude === null;

  if (isLatitudeExplicitlyCleared || isLongitudeExplicitlyCleared) {
    return isLatitudeExplicitlyCleared && isLongitudeExplicitlyCleared;
  }

  return hasLatitude === hasLongitude;
}

function ensureTimePair(startTime?: string | null, endTime?: string | null) {
  const hasStartTime = Boolean(startTime);
  const hasEndTime = Boolean(endTime);

  if (startTime === null || endTime === null) {
    return startTime === null && endTime === null;
  }

  return hasStartTime === hasEndTime;
}

function normalizePromotionPayload<
  T extends Record<string, unknown> & {
    title?: string;
    description?: string;
    conditions?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    imageUrl?: string | null;
  },
>(data: T): T {
  return {
    ...data,
    title: cleanText(data.title),
    description: cleanText(data.description),
    conditions: cleanNullableText(data.conditions),
    startTime: cleanNullableText(data.startTime),
    endTime: cleanNullableText(data.endTime),
    imageUrl: cleanNullableText(data.imageUrl),
  };
}

function isOwnerWritablePromotionStatus(status: PromotionStatus) {
  return status === PromotionStatus.DRAFT || status === PromotionStatus.PENDING_REVIEW;
}

function getOwnerCreatePromotionStatus(status?: PromotionStatus) {
  if (!status) {
    return PromotionStatus.PENDING_REVIEW;
  }

  if (isOwnerWritablePromotionStatus(status)) {
    return status;
  }

  throw new CommerceServiceError(
    "El comercio solo puede guardar promociones en borrador o enviarlas a revision.",
    409,
  );
}

function shouldResetPromotionToReviewStatus(status: PromotionStatus) {
  return (
    status === PromotionStatus.APPROVED_VISIBLE ||
    status === PromotionStatus.REJECTED ||
    status === PromotionStatus.EXPIRED
  );
}

export const updateCommerceSchema = z
  .object({
    name: optionalTextField(2, "El nombre"),
    shortDescription: nullableOptionalTextField(2, "La descripcion corta"),
    description: nullableOptionalTextField(2, "La descripcion"),
    address: optionalTextField(2, "La direccion"),
    phone: nullableOptionalTextField(2, "El telefono"),
    instagram: nullableOptionalTextField(2, "El Instagram"),
    logoUrl: nullableOptionalUrlField,
    coverUrl: nullableOptionalUrlField,
    cityId: z.number().int().positive().optional(),
    categoryId: z.number().int().positive().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  })
  .refine((data) => ensureCoordinatePair(data.latitude, data.longitude), {
    message: "Latitude y longitude deben enviarse juntas",
    path: ["latitude"],
  });

export const createPromotionSchema = z
  .object({
    title: z.string().trim().min(3, "El titulo debe tener al menos 3 caracteres"),
    description: z.string().trim().min(3, "La descripcion debe tener al menos 3 caracteres"),
    promotionType: z.nativeEnum(PromotionType),
    validationMethod: z.nativeEnum(ValidationMethod),
    discountValue: z.number().nullable().optional(),
    conditions: z.string().trim().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    startTime: optionalTimeField,
    endTime: optionalTimeField,
    imageUrl: optionalUrlField,
    status: z.nativeEnum(PromotionStatus).optional(),
  })
  .refine((data) => ensureValidDateRange(data.startDate, data.endDate), {
    message: "La fecha de fin no puede ser anterior a la fecha de inicio",
    path: ["endDate"],
  })
  .refine((data) => ensureTimePair(data.startTime, data.endTime), {
    message: "Debes enviar horario de inicio y fin juntos",
    path: ["startTime"],
  })
  .transform((data) => normalizePromotionPayload(data));

export const updatePromotionSchema = z
  .object({
    title: z.string().trim().min(3, "El titulo debe tener al menos 3 caracteres").optional(),
    description: z
      .string()
      .trim()
      .min(3, "La descripcion debe tener al menos 3 caracteres")
      .optional(),
    promotionType: z.nativeEnum(PromotionType).optional(),
    validationMethod: z.nativeEnum(ValidationMethod).optional(),
    discountValue: z.number().nullable().optional(),
    conditions: z.string().trim().nullable().optional(),
    startDate: z.string().datetime().nullable().optional(),
    endDate: z.string().datetime().nullable().optional(),
    startTime: nullableOptionalTimeField,
    endTime: nullableOptionalTimeField,
    imageUrl: nullableOptionalUrlField,
    status: z.nativeEnum(PromotionStatus).optional(),
  })
  .refine((data) => ensureValidDateRange(data.startDate, data.endDate), {
    message: "La fecha de fin no puede ser anterior a la fecha de inicio",
    path: ["endDate"],
  })
  .refine((data) => ensureTimePair(data.startTime, data.endTime), {
    message: "Debes enviar horario de inicio y fin juntos",
    path: ["startTime"],
  })
  .transform((data) => normalizePromotionPayload(data));

export type UpdateCommerceInput = z.infer<typeof updateCommerceSchema>;
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;

export class CommerceServiceError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "CommerceServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isCommerceServiceError(error: unknown): error is CommerceServiceError {
  return error instanceof CommerceServiceError;
}

const commerceSelect = {
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
} as const;

const promotionSelect = {
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
  moderationNote: true,
  createdAt: true,
  updatedAt: true,
  commerce: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

async function getOwnedCommerceOrThrow(ownerUserId: number) {
  const commerce = await prisma.commerce.findFirst({
    where: { ownerUserId },
  });

  if (!commerce) {
    throw new CommerceServiceError("No se encontro un comercio asociado a este usuario", 404);
  }

  return commerce;
}

async function getOwnedPromotionOrThrow(params: {
  ownerUserId: number;
  promotionId: number;
  select?: any;
}) {
  const promotion = await prisma.promotion.findFirst({
    where: {
      id: params.promotionId,
      commerce: { ownerUserId: params.ownerUserId },
    },
    select: params.select ?? { id: true },
  });

  if (!promotion) {
    throw new CommerceServiceError("Promocion no encontrada para este comercio", 404);
  }

  return promotion;
}

export async function getCommerceDashboardByOwner(ownerUserId: number) {
  const [
    commerces,
    totalPromotions,
    approvedVisiblePromotions,
    pendingReviewPromotions,
    draftPromotions,
    rejectedPromotions,
    expiredPromotions,
    totalRedemptions,
    successRedemptions,
    failedRedemptions,
    recentPromotions,
    recentRedemptions,
  ] = await prisma.$transaction([
    prisma.commerce.findMany({
      where: { ownerUserId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        moderationNote: true,
        city: { select: { id: true, name: true, province: true, slug: true } },
        category: { select: { id: true, name: true, slug: true, icon: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.promotion.count({ where: { commerce: { ownerUserId } } }),
    prisma.promotion.count({
      where: { commerce: { ownerUserId }, status: PromotionStatus.APPROVED_VISIBLE },
    }),
    prisma.promotion.count({
      where: { commerce: { ownerUserId }, status: PromotionStatus.PENDING_REVIEW },
    }),
    prisma.promotion.count({
      where: { commerce: { ownerUserId }, status: PromotionStatus.DRAFT },
    }),
    prisma.promotion.count({
      where: { commerce: { ownerUserId }, status: PromotionStatus.REJECTED },
    }),
    prisma.promotion.count({ where: { commerce: { ownerUserId }, status: "EXPIRED" } }),
    prisma.redemption.count({ where: { commerce: { ownerUserId } } }),
    prisma.redemption.count({ where: { commerce: { ownerUserId }, status: "SUCCESS" } }),
    prisma.redemption.count({ where: { commerce: { ownerUserId }, status: "FAILED" } }),
    prisma.promotion.findMany({
      where: { commerce: { ownerUserId } },
      select: {
        id: true,
        title: true,
        promotionType: true,
        validationMethod: true,
        discountValue: true,
        status: true,
        createdAt: true,
        commerce: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.redemption.findMany({
      where: { commerce: { ownerUserId } },
      select: {
        id: true,
        validationMethod: true,
        status: true,
        redeemedAt: true,
        createdAt: true,
        user: { select: { id: true, fullName: true, email: true } },
        promotion: {
          select: {
            id: true,
            title: true,
            promotionType: true,
            validationMethod: true,
            discountValue: true,
          },
        },
        commerce: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    metrics: {
      commerces: {
        total: commerces.length,
        approved: commerces.filter((commerce) => commerce.status === "APPROVED").length,
        pending: commerces.filter((commerce) => commerce.status === "PENDING").length,
        inactive: commerces.filter((commerce) => commerce.status === "INACTIVE").length,
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
    },
    commerces,
    recentPromotions,
    recentRedemptions,
  };
}

export async function getPrimaryCommerceByOwner(ownerUserId: number) {
  const commerces = await prisma.commerce.findMany({
    where: { ownerUserId },
    select: commerceSelect,
    orderBy: { id: "asc" },
  });

  if (commerces.length === 0) {
    throw new CommerceServiceError("No se encontro un comercio asociado a este usuario", 404);
  }

  return {
    commerce: commerces[0],
    commercesCount: commerces.length,
  };
}

export async function updateManagedCommerceByOwner(params: {
  ownerUserId: number;
  data: UpdateCommerceInput;
}) {
  const commerce = await getOwnedCommerceOrThrow(params.ownerUserId);
  const { cityId, categoryId, ...restData } = params.data;

  if (cityId !== undefined) {
    const city = await prisma.city.findUnique({
      where: { id: cityId },
      select: { id: true, isActive: true },
    });

    if (!city) {
      throw new CommerceServiceError("La ciudad seleccionada no existe.", 404);
    }

    if (!city.isActive) {
      throw new CommerceServiceError("La ciudad seleccionada no esta activa.", 409);
    }
  }

  if (categoryId !== undefined) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, isActive: true },
    });

    if (!category) {
      throw new CommerceServiceError("La categoria seleccionada no existe.", 404);
    }

    if (!category.isActive) {
      throw new CommerceServiceError("La categoria seleccionada no esta activa.", 409);
    }
  }

  const updatedCommerce = await prisma.commerce.update({
    where: { id: commerce.id },
    data: {
      ...restData,
      ...(cityId !== undefined ? { cityId } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
    },
    select: commerceSelect,
  });

  publishRealtimeEvent({
    type: "commerce.updated",
    targetRoles: ["ADMIN", "COMMERCE"],
    commerceOwnerUserId: params.ownerUserId,
    payload: {
      commerceId: updatedCommerce.id,
      commerceName: updatedCommerce.name,
      commerceSlug: updatedCommerce.slug,
      status: updatedCommerce.status,
    },
  });

  return updatedCommerce;
}

export async function listPromotionsByOwner(ownerUserId: number) {
  await getOwnedCommerceOrThrow(ownerUserId);

  return prisma.promotion.findMany({
    where: { commerce: { ownerUserId } },
    select: promotionSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function createPromotionForOwner(params: {
  ownerUserId: number;
  data: CreatePromotionInput;
}) {
  const commerce = await getOwnedCommerceOrThrow(params.ownerUserId);
  const { data } = params;

  if (commerce.status !== "APPROVED") {
    throw new CommerceServiceError(
      "Tu comercio debe estar aprobado para crear promociones moderables.",
      409,
    );
  }

  const createdPromotion = await prisma.promotion.create({
    data: {
      commerceId: commerce.id,
      title: data.title,
      description: data.description,
      promotionType: data.promotionType,
      validationMethod: data.validationMethod,
      discountValue: data.discountValue ?? null,
      conditions: data.conditions ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      imageUrl: data.imageUrl ?? null,
      status: getOwnerCreatePromotionStatus(data.status),
    },
    select: promotionSelect,
  });

  publishRealtimeEvent({
    type: "promotion.created",
    targetRoles: ["ADMIN", "COMMERCE"],
    commerceOwnerUserId: params.ownerUserId,
    payload: {
      promotionId: createdPromotion.id,
      promotionTitle: createdPromotion.title,
      commerceId: createdPromotion.commerce.id,
      commerceName: createdPromotion.commerce.name,
      status: createdPromotion.status,
    },
  });

  return createdPromotion;
}

export async function updatePromotionForOwner(params: {
  ownerUserId: number;
  promotionId: number;
  data: UpdatePromotionInput;
}) {
  const existingPromotion = await prisma.promotion.findFirst({
    where: {
      id: params.promotionId,
      commerce: { ownerUserId: params.ownerUserId },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existingPromotion) {
    throw new CommerceServiceError("Promocion no encontrada para este comercio", 404);
  }

  const { data } = params;
  const hasContentChanges = [
    data.title,
    data.description,
    data.promotionType,
    data.validationMethod,
    data.discountValue,
    data.conditions,
    data.startDate,
    data.endDate,
    data.startTime,
    data.endTime,
    data.imageUrl,
  ].some((value) => value !== undefined);

  if (data.status && !isOwnerWritablePromotionStatus(data.status)) {
    throw new CommerceServiceError(
      "El comercio solo puede mover promociones a borrador o revision.",
      409,
    );
  }

  const nextStatus =
    data.status !== undefined
      ? data.status
      : hasContentChanges && shouldResetPromotionToReviewStatus(existingPromotion.status)
      ? PromotionStatus.PENDING_REVIEW
      : undefined;

  const shouldClearModerationNote =
    nextStatus === PromotionStatus.DRAFT || nextStatus === PromotionStatus.PENDING_REVIEW;

  const updatedPromotion: any = await prisma.promotion.update({
    where: { id: existingPromotion.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.promotionType !== undefined ? { promotionType: data.promotionType } : {}),
      ...(data.validationMethod !== undefined
        ? { validationMethod: data.validationMethod }
        : {}),
      ...(data.discountValue !== undefined ? { discountValue: data.discountValue } : {}),
      ...(data.conditions !== undefined ? { conditions: data.conditions ?? null } : {}),
      ...(data.startDate !== undefined
        ? { startDate: data.startDate ? new Date(data.startDate) : null }
        : {}),
      ...(data.endDate !== undefined
        ? { endDate: data.endDate ? new Date(data.endDate) : null }
        : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime ?? null } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime ?? null } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl ?? null } : {}),
      ...(nextStatus !== undefined ? { status: nextStatus } : {}),
      ...(shouldClearModerationNote ? { moderationNote: null } : {}),
    },
    select: promotionSelect,
  });

  publishRealtimeEvent({
    type: "promotion.updated",
    targetRoles: ["ADMIN", "COMMERCE"],
    commerceOwnerUserId: params.ownerUserId,
    payload: {
      promotionId: updatedPromotion.id,
      promotionTitle: updatedPromotion.title,
      commerceId: updatedPromotion.commerce.id,
      commerceName: updatedPromotion.commerce.name,
      status: updatedPromotion.status,
    },
  });

  return updatedPromotion;
}

export async function deletePromotionForOwner(params: {
  ownerUserId: number;
  promotionId: number;
}) {
  const existingPromotion = await prisma.promotion.findFirst({
    where: {
      id: params.promotionId,
      commerce: { ownerUserId: params.ownerUserId },
    },
    select: {
      id: true,
      redemptions: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!existingPromotion) {
    throw new CommerceServiceError("Promocion no encontrada para este comercio", 404);
  }

  if (existingPromotion.redemptions && existingPromotion.redemptions.length > 0) {
    throw new CommerceServiceError(
      "La promocion ya tiene canjes asociados. Desactivala en lugar de eliminarla.",
      409,
    );
  }

  await prisma.promotion.delete({
    where: { id: existingPromotion.id },
  });

  publishRealtimeEvent({
    type: "promotion.deleted",
    targetRoles: ["ADMIN", "COMMERCE"],
    commerceOwnerUserId: params.ownerUserId,
    payload: {
      promotionId: existingPromotion.id,
    },
  });

  return {
    deletedPromotionId: existingPromotion.id,
  };
}
