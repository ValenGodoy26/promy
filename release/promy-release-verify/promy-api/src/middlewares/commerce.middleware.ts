import { NextFunction, Response } from "express";
import { CommerceStatus } from "@prisma/client";
import prisma from "../config/prisma";
import { AUTH_REQUIRED_MESSAGE } from "../shared/http/auth";
import { AuthRequest } from "./auth.middleware";

const nonOperableCommerceMessages: Record<CommerceStatus, string> = {
  APPROVED: "OK",
  PENDING: "Tu comercio todavia esta pendiente de aprobacion.",
  REJECTED: "Tu comercio fue rechazado. Revisa tu informacion o contacta soporte.",
  INACTIVE: "Tu comercio esta inactivo. Reactivalo desde administracion para volver a operar.",
};

export const requireManagedCommerce = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: AUTH_REQUIRED_MESSAGE,
      });
    }

    const commerce = await prisma.commerce.findFirst({
      where: {
        ownerUserId: userId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        owner: {
          select: {
            emailVerifiedAt: true,
          },
        },
      },
    });

    if (!commerce) {
      return res.status(404).json({
        ok: false,
        message: "No encontramos un comercio asociado a este usuario.",
      });
    }

    req.managedCommerce = {
      id: commerce.id,
      name: commerce.name,
      status: commerce.status,
      ownerEmailVerifiedAt: commerce.owner.emailVerifiedAt,
    };
    return next();
  } catch (error) {
    console.error("Require managed commerce error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al validar el comercio del usuario",
    });
  }
};

export const requireOperableCommerce = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const managedCommerce = req.managedCommerce;

  if (!managedCommerce) {
    return res.status(500).json({
      ok: false,
      message: "No pudimos resolver el comercio del usuario actual",
    });
  }

  if (managedCommerce.status !== "APPROVED") {
    return res.status(403).json({
      ok: false,
      message: nonOperableCommerceMessages[managedCommerce.status],
      commerceStatus: managedCommerce.status,
    });
  }

  if (!managedCommerce.ownerEmailVerifiedAt) {
    return res.status(403).json({
      ok: false,
      message:
        "Necesitas verificar el email de la cuenta antes de operar promociones o validar canjes.",
      commerceStatus: managedCommerce.status,
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  return next();
};
