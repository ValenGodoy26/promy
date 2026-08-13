import { AppNotificationType } from "@prisma/client";
import { randomBytes } from "crypto";
import { z } from "zod";
import { env } from "../../config/env";
import prisma from "../../config/prisma";
import { buildCommerceDeepLink, buildPromotionDeepLink } from "../../shared/utils/deepLinks";
import {
  buildPublicPromotionWhere,
  isCurrentTimeWithinPromotionWindow,
  isPromotionCurrentlyAvailable,
  parsePromotionTimeToMinutes,
} from "../../shared/utils/promotionStatus";
import { createAppNotification } from "../notifications/notifications.service";
import { publishRealtimeEvent } from "../realtime/realtime.service";

export const createRedemptionSchema = z.object({
  promotionId: z.number().int().positive(),
});

export const validateRedemptionSchema = z.object({
  validationCode: z.string().trim().min(4, "Codigo invalido"),
});

export class RedemptionServiceError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = "RedemptionServiceError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function isRedemptionServiceError(error: unknown): error is RedemptionServiceError {
  return error instanceof RedemptionServiceError;
}

export { isCurrentTimeWithinPromotionWindow, isPromotionCurrentlyAvailable };

const redemptionSelect = {
  id: true,
  validationMethod: true,
  validationCode: true,
  status: true,
  redeemedAt: true,
  validationExpiresAt: true,
  failedValidationAttempts: true,
  lastValidationAttemptAt: true,
  createdAt: true,
  promotion: {
    select: {
      id: true,
      title: true,
      description: true,
      promotionType: true,
      validationMethod: true,
      discountValue: true,
      imageUrl: true,
    },
  },
  commerce: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
    },
  },
} as const;

const commerceRedemptionSelect = {
  id: true,
  validationMethod: true,
  validationCode: true,
  status: true,
  redeemedAt: true,
  validationExpiresAt: true,
  failedValidationAttempts: true,
  lastValidationAttemptAt: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
  promotion: {
    select: {
      id: true,
      title: true,
      description: true,
      promotionType: true,
      validationMethod: true,
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
} as const;

export const parseTimeToMinutes = parsePromotionTimeToMinutes;

export function buildValidationCode() {
  return `PROMY-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function buildValidationExpiresAt() {
  return new Date(Date.now() + env.REDEMPTION_CODE_TTL_MINUTES * 60 * 1000);
}

export function isValidationStillAvailable(expiresAt?: Date | null) {
  return !expiresAt || expiresAt.getTime() >= Date.now();
}

export async function createRedemptionForUser(input: { userId: number; promotionId: number }) {
  const { userId, promotionId } = input;
  const now = new Date();

  const promotion = await prisma.promotion.findFirst({
    where: {
      id: promotionId,
      ...buildPublicPromotionWhere(now),
      commerce: {
        status: "APPROVED",
      },
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
      commerceId: true,
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

  if (!promotion) {
    throw new RedemptionServiceError("Promocion no encontrada o no disponible", 404);
  }

  if (!isPromotionCurrentlyAvailable(promotion)) {
    throw new RedemptionServiceError("La promocion no esta disponible en este momento", 400);
  }

  const existingRedemption = await prisma.redemption.findUnique({
    where: {
      promotionId_userId: {
        promotionId,
        userId,
      },
    },
    select: {
      id: true,
      status: true,
      validationCode: true,
      validationExpiresAt: true,
      failedValidationAttempts: true,
    },
  });

  if (existingRedemption?.status === "SUCCESS") {
    throw new RedemptionServiceError("Ya usaste esta promocion anteriormente", 400);
  }

  if (
    existingRedemption?.status === "PENDING" &&
    existingRedemption.validationCode &&
    isValidationStillAvailable(existingRedemption.validationExpiresAt) &&
    existingRedemption.failedValidationAttempts < env.REDEMPTION_MAX_FAILED_ATTEMPTS
  ) {
    const activeRedemption = await prisma.redemption.findUnique({
      where: {
        promotionId_userId: {
          promotionId,
          userId,
        },
      },
      select: redemptionSelect,
    });

    return {
      statusCode: 200,
      message:
        promotion.validationMethod === "QR"
          ? "Ya tenes un canje pendiente. Mostra el QR o el codigo de respaldo en el comercio para validarlo."
          : "Ya tenes un canje pendiente. Mostra el codigo en el comercio para validarlo.",
      redemption: activeRedemption,
    };
  }

  const validationCode = buildValidationCode();
  const validationExpiresAt = buildValidationExpiresAt();

  const redemption = existingRedemption
    ? await prisma.redemption.update({
        where: {
          promotionId_userId: {
            promotionId,
            userId,
          },
        },
        data: {
          commerceId: promotion.commerceId,
          validationMethod: promotion.validationMethod,
          validationCode,
          status: "PENDING",
          redeemedAt: null,
          validationExpiresAt,
          failedValidationAttempts: 0,
          lastValidationAttemptAt: null,
          validatedByUserId: null,
        },
        select: redemptionSelect,
      })
    : await prisma.redemption.create({
        data: {
          promotionId: promotion.id,
          userId,
          commerceId: promotion.commerceId,
          validationMethod: promotion.validationMethod,
          validationCode,
          status: "PENDING",
          redeemedAt: null,
          validationExpiresAt,
        },
        select: redemptionSelect,
      });

  const commerceOwner = await prisma.commerce.findUnique({
    where: {
      id: promotion.commerceId,
    },
    select: {
      ownerUserId: true,
    },
  });

  publishRealtimeEvent({
    type: "redemption.created",
    targetRoles: ["ADMIN", "COMMERCE"],
    commerceOwnerUserId: commerceOwner?.ownerUserId ?? null,
    payload: {
      redemptionId: redemption.id,
      promotionId: promotion.id,
      promotionTitle: promotion.title,
      commerceId: promotion.commerce.id,
      commerceName: promotion.commerce.name,
      status: redemption.status,
      validationMethod: redemption.validationMethod,
    },
  });

  return {
    statusCode: existingRedemption ? 200 : 201,
    message:
      promotion.validationMethod === "QR"
        ? "Canje generado. Mostra el QR en el comercio; si hace falta, tambien pueden usar el codigo de respaldo."
        : "Canje generado. Mostra este codigo en el comercio para validarlo.",
    redemption,
  };
}

export async function getUserRedemptions(userId: number) {
  return prisma.redemption.findMany({
    where: {
      userId,
    },
    select: redemptionSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getCommerceRedemptionsByOwner(ownerUserId: number) {
  return prisma.redemption.findMany({
    where: {
      commerce: {
        ownerUserId,
      },
    },
    select: commerceRedemptionSelect,
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function validateCommerceRedemptionByCode(input: {
  ownerUserId: number;
  validationCode: string;
}) {
  const { ownerUserId } = input;
  const validationCode = input.validationCode.trim().toUpperCase();

  const redemption = await prisma.redemption.findFirst({
    where: {
      validationCode,
      commerce: {
        ownerUserId,
      },
    },
    select: commerceRedemptionSelect,
  });

  if (!redemption) {
    throw new RedemptionServiceError(
      "No encontramos un canje pendiente con ese codigo en este comercio",
      404,
    );
  }

  if (redemption.status === "SUCCESS") {
    throw new RedemptionServiceError("Este canje ya fue validado anteriormente", 409, {
      redemption,
    });
  }

  if (redemption.status !== "PENDING") {
    throw new RedemptionServiceError("Este canje no esta disponible para validar", 409, {
      redemption,
    });
  }

  const now = new Date();
  const validationExpired =
    redemption.validationExpiresAt && redemption.validationExpiresAt.getTime() < now.getTime();

  if (validationExpired) {
    const failedAttempts = redemption.failedValidationAttempts + 1;
    const nextStatus =
      failedAttempts >= env.REDEMPTION_MAX_FAILED_ATTEMPTS ? "FAILED" : "PENDING";

    const expiredRedemption = await prisma.redemption.update({
      where: {
        id: redemption.id,
      },
      data: {
        failedValidationAttempts: failedAttempts,
        lastValidationAttemptAt: now,
        status: nextStatus,
      },
      select: commerceRedemptionSelect,
    });

    throw new RedemptionServiceError(
      nextStatus === "FAILED"
        ? "El codigo vencio y el canje quedo bloqueado por demasiados intentos."
        : "El codigo de validacion vencio. El cliente debe generar un nuevo canje.",
      409,
      {
        redemption: expiredRedemption,
      },
    );
  }

  const updateResult = await prisma.redemption.updateMany({
    where: {
      id: redemption.id,
      status: "PENDING",
      validationCode,
      OR: [
        { validationExpiresAt: null },
        {
          validationExpiresAt: {
            gte: now,
          },
        },
      ],
      failedValidationAttempts: {
        lt: env.REDEMPTION_MAX_FAILED_ATTEMPTS,
      },
    },
    data: {
      status: "SUCCESS",
      redeemedAt: now,
      lastValidationAttemptAt: now,
      validatedByUserId: ownerUserId,
    },
  });

  if (updateResult.count === 0) {
    const currentState = await prisma.redemption.findFirst({
      where: {
        id: redemption.id,
      },
      select: commerceRedemptionSelect,
    });

    throw new RedemptionServiceError(
      "Este canje ya cambio de estado mientras intentabas validarlo.",
      409,
      {
        redemption: currentState,
      },
    );
  }

  const validatedRedemption = await prisma.redemption.findUnique({
    where: {
      id: redemption.id,
    },
    select: commerceRedemptionSelect,
  });

  if (!validatedRedemption) {
    throw new RedemptionServiceError("No pudimos recuperar el canje validado", 404);
  }

  await createAppNotification({
    userId: validatedRedemption.user.id,
    type: AppNotificationType.REDEMPTION_VALIDATED,
    title: "Canje validado",
    body: `Tu canje de "${validatedRedemption.promotion.title}" en ${validatedRedemption.commerce.name} fue confirmado correctamente.`,
    data: {
      redemptionId: validatedRedemption.id,
      promotionId: validatedRedemption.promotion.id,
      commerceId: validatedRedemption.commerce.id,
      validationCode: validatedRedemption.validationCode,
      deepLink: buildPromotionDeepLink(validatedRedemption.promotion.id),
      commerceDeepLink: buildCommerceDeepLink(validatedRedemption.commerce.id),
      section: "notifications",
    },
  });

  publishRealtimeEvent({
    type: "redemption.validated",
    targetRoles: ["ADMIN", "COMMERCE"],
    commerceOwnerUserId: ownerUserId,
    payload: {
      redemptionId: validatedRedemption.id,
      promotionId: validatedRedemption.promotion.id,
      promotionTitle: validatedRedemption.promotion.title,
      commerceId: validatedRedemption.commerce.id,
      commerceName: validatedRedemption.commerce.name,
      validationCode: validatedRedemption.validationCode,
      status: validatedRedemption.status,
    },
  });

  return {
    statusCode: 200,
    message: "Canje validado correctamente",
    redemption: validatedRedemption,
  };
}
