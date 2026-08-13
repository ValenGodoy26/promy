import { NextFunction, Request, Response } from "express";
import { CommerceStatus, UserRole } from "@prisma/client";
import prisma from "../config/prisma";
import {
  AUTH_FORBIDDEN_MESSAGE,
  AUTH_REQUIRED_MESSAGE,
  AUTH_TOKEN_INVALID_MESSAGE,
  AUTH_TOKEN_REQUIRED_MESSAGE,
} from "../shared/http/auth";
import { AccessTokenPayload, verifyAccessToken } from "../shared/utils/jwt";
import { logError } from "../shared/logging/logger";

export interface AuthRequest extends Request {
  user?: AccessTokenPayload;
  managedCommerce?: {
    id: number;
    name: string;
    status: CommerceStatus;
    ownerEmailVerifiedAt?: Date | null;
  };
}

const getBearerToken = (authHeader?: string) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: AUTH_TOKEN_REQUIRED_MESSAGE,
      });
    }

    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({
      ok: false,
      message: AUTH_TOKEN_INVALID_MESSAGE,
    });
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: AUTH_REQUIRED_MESSAGE,
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        message: AUTH_FORBIDDEN_MESSAGE,
      });
    }

    return next();
  };

export const requireVerifiedEmail = async (
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: AUTH_REQUIRED_MESSAGE,
      });
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        ok: false,
        message:
          "Necesitas verificar el email de tu cuenta antes de generar canjes en PROMY.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    return next();
  } catch (error) {
    logError(req, error, "Require verified email middleware failed");
    return res.status(500).json({
      ok: false,
      message: "Error interno al validar la cuenta del usuario",
      requestId: req.requestId,
    });
  }
};
