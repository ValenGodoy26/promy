import { AppNotificationType, Prisma, RedemptionStatus } from "@prisma/client";
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

const promotionScheduleSelect = Prisma.validator<Prisma.PromotionScheduleFindManyArgs>()({
  select: {
    weekday: true,
    startTime: true,
    endTime: true,
  },
  orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
});

const redemptionSelect = Prisma.validator<Prisma.RedemptionSelect>()({
  id: true,
  validationMethod: true,
  validationCode: true,
  status: true,
  redeemedAt: true,
  validationExpiresAt: true,
  failedValidationAttempts: true,
  lastValidationAttemptAt: true,
  validationBlockedUntil: true,
  createdAt: true,
  promotion: {
    select: {
      id: true,
      title: true,
      description: true,
      promotionType: true,
      validationMethod: true,
      discountValue: true,
      maxRedemptions: true,
      imageUrl: true,
      schedules: promotionScheduleSelect,
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
});

const commerceRedemptionSelect = Prisma.validator<Prisma.RedemptionSelect>()({
  id: true,
  validationMethod: true,
  validationCode: true,
  status: true,
  redeemedAt: true,
  validationExpiresAt: true,
  failedValidationAttempts: true,
  lastValidationAttemptAt: true,
  validationBlockedUntil: true,
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
      maxRedemptions: true,
      schedules: promotionScheduleSelect,
    },
  },
  commerce: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
});

export const parseTimeToMinutes = parsePromotionTimeToMinutes;

export function buildValidationCode() {
  return `PROMY-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function isValidationCodeUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    (error.meta.target.includes("Redemption_validationCode_key") ||
      error.meta.target.includes("validationCode"))
  );
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
      maxRedemptions: true,
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

  // Verificación previa rápida (fuera de transacción) para salir antes de tiempo
  // si el cupo ya está claramente superado. La validación atómica real ocurre
  // dentro de la transacción de escritura más abajo.
  if (typeof promotion.maxRedemptions === "number") {
    const earlySuccessCount = await prisma.redemption.count({
      where: {
        promotionId: promotion.id,
        status: RedemptionStatus.SUCCESS,
      },
    });

    if (earlySuccessCount >= promotion.maxRedemptions) {
      throw new RedemptionServiceError("Esta promocion ya alcanzo su cupo maximo de canjes.", 409, {
        code: "PROMOTION_CAP_REACHED",
        maxRedemptions: promotion.maxRedemptions,
      });
    }
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
      validationBlockedUntil: true,
    },
  });

  if (existingRedemption?.status === "SUCCESS") {
    throw new RedemptionServiceError("Ya usaste esta promocion anteriormente", 400);
  }

  if (
    existingRedemption?.validationBlockedUntil &&
    existingRedemption.validationBlockedUntil.getTime() > now.getTime()
  ) {
    throw new RedemptionServiceError(
      "Este canje quedo bloqueado temporalmente por demasiados intentos fallidos. Espera un rato antes de generar uno nuevo.",
      429,
      {
        code: "REDEMPTION_TEMPORARILY_BLOCKED",
        blockedUntil: existingRedemption.validationBlockedUntil,
      },
    );
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

  const maxValidationCodeAttempts = 5;
  let redemption:
    | Prisma.RedemptionGetPayload<{ select: typeof redemptionSelect }>
    | null = null;

  for (let attempt = 1; attempt <= maxValidationCodeAttempts; attempt += 1) {
    const validationCode = buildValidationCode();
    const validationExpiresAt = buildValidationExpiresAt();

    try {
      // Transacción serializable: el re-check del cupo y la escritura son atómicos.
      // Esto previene que dos requests concurrentes para la misma promo con cupo lleno
      // generen dos PENDING codes simultáneamente.
      redemption = await prisma.$transaction(
        async (tx) => {
          // Re-check del cupo adentro de la transacción para garantizar atomicidad.
          if (typeof promotion.maxRedemptions === "number") {
            const lockedCount = await tx.redemption.count({
              where: {
                promotionId: promotion.id,
                status: RedemptionStatus.SUCCESS,
              },
            });

            if (lockedCount >= promotion.maxRedemptions) {
              throw new RedemptionServiceError(
                "Esta promocion ya alcanzo su cupo maximo de canjes.",
                409,
                {
                  code: "PROMOTION_CAP_REACHED",
                  maxRedemptions: promotion.maxRedemptions,
                },
              );
            }
          }

          if (existingRedemption) {
            return tx.redemption.update({
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
                validationBlockedUntil: null,
                validatedByUserId: null,
              },
              select: redemptionSelect,
            });
          }

          return tx.redemption.create({
            data: {
              promotionId: promotion.id,
              userId,
              commerceId: promotion.commerceId,
              validationMethod: promotion.validationMethod,
              validationCode,
              status: "PENDING",
              redeemedAt: null,
              validationExpiresAt,
              validationBlockedUntil: null,
            },
            select: redemptionSelect,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      break;
    } catch (error) {
      if (attempt < maxValidationCodeAttempts && isValidationCodeUniqueConstraintError(error)) {
        continue;
      }

      throw error;
    }
  }

  if (!redemption) {
    throw new RedemptionServiceError(
      "No pudimos generar un codigo de canje unico. Intenta nuevamente.",
      500,
      { code: "REDEMPTION_CODE_GENERATION_FAILED" },
    );
  }

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

  if (commerceOwner?.ownerUserId) {
    await createAppNotification({
      userId: commerceOwner.ownerUserId,
      type: AppNotificationType.REDEMPTION_CREATED,
      title: "Nuevo canje pendiente",
      body: `Se genero un nuevo canje para ${promotion.title} en ${promotion.commerce.name}.`,
      data: {
        redemptionId: redemption.id,
        promotionId: promotion.id,
        commerceId: promotion.commerce.id,
        webPath: "/commerce/redemptions",
      },
    });
  }

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

  const now = new Date();

  if (
    redemption.validationBlockedUntil &&
    redemption.validationBlockedUntil.getTime() > now.getTime()
  ) {
    throw new RedemptionServiceError(
      "Este canje quedo bloqueado temporalmente por demasiados intentos fallidos. Intenta nuevamente mas tarde.",
      429,
      {
        code: "REDEMPTION_TEMPORARILY_BLOCKED",
        blockedUntil: redemption.validationBlockedUntil,
        redemption,
      },
    );
  }

  if (redemption.status !== "PENDING") {
    throw new RedemptionServiceError("Este canje no esta disponible para validar", 409, {
      redemption,
    });
  }

  if (typeof redemption.promotion.maxRedemptions === "number") {
    const successCount = await prisma.redemption.count({
      where: {
        promotionId: redemption.promotion.id,
        status: RedemptionStatus.SUCCESS,
      },
    });

    if (successCount >= redemption.promotion.maxRedemptions) {
      const cancelledRedemption = await prisma.redemption.update({
        where: {
          id: redemption.id,
        },
        data: {
          status: RedemptionStatus.CANCELLED,
          lastValidationAttemptAt: now,
        },
        select: commerceRedemptionSelect,
      });

      throw new RedemptionServiceError(
        "La promocion ya alcanzo su cupo maximo de canjes y este codigo quedo cancelado.",
        409,
        {
          code: "PROMOTION_CAP_REACHED",
          redemption: cancelledRedemption,
          maxRedemptions: redemption.promotion.maxRedemptions,
        },
      );
    }
  }

  const validationExpired =
    redemption.validationExpiresAt && redemption.validationExpiresAt.getTime() < now.getTime();

  if (validationExpired) {
    const failedAttempts = redemption.failedValidationAttempts + 1;
    const blockedUntil =
      failedAttempts >= env.REDEMPTION_MAX_FAILED_ATTEMPTS
        ? new Date(
            now.getTime() + env.REDEMPTION_VALIDATION_BLOCK_MINUTES * 60 * 1000,
          )
        : null;
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
        validationBlockedUntil: blockedUntil,
      },
      select: commerceRedemptionSelect,
    });

    throw new RedemptionServiceError(
      nextStatus === "FAILED"
        ? "El codigo vencio y el canje quedo bloqueado temporalmente por demasiados intentos."
        : "El codigo de validacion vencio. El cliente debe generar un nuevo canje.",
      409,
      {
        redemption: expiredRedemption,
        ...(blockedUntil ? { blockedUntil } : {}),
      },
    );
  }

  const updateResult = await prisma.redemption.updateMany({
    where: {
      id: redemption.id,
      status: "PENDING",
      validationCode,
      failedValidationAttempts: {
        lt: env.REDEMPTION_MAX_FAILED_ATTEMPTS,
      },
      AND: [
        {
          OR: [
            { validationExpiresAt: null },
            {
              validationExpiresAt: {
                gte: now,
              },
            },
          ],
        },
        {
          OR: [
            { validationBlockedUntil: null },
            {
              validationBlockedUntil: {
                lte: now,
              },
            },
          ],
        },
      ],
    },
    data: {
      status: "SUCCESS",
      redeemedAt: now,
      lastValidationAttemptAt: now,
      validatedByUserId: ownerUserId,
      validationBlockedUntil: null,
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
