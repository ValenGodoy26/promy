import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { logControllerError } from "../../shared/http/controllerLogger";
// Keep the explicit service filename to avoid ambiguity inside the redemptions module.
import {
  createRedemptionForUser,
  createRedemptionSchema,
  getCommerceRedemptionsByOwner,
  getUserRedemptions,
  isRedemptionServiceError,
} from "./redemptions.service";

export const createRedemption = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const parsed = createRedemptionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await createRedemptionForUser({
      userId,
      promotionId: parsed.data.promotionId,
    });

    return res.status(result.statusCode).json({
      ok: true,
      message: result.message,
      redemption: result.redemption,
    });
  } catch (error) {
    if (isRedemptionServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Create redemption error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al registrar el canje",
    });
  }
};

export const getMyRedemptions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const redemptions = await getUserRedemptions(userId);

    return res.status(200).json({
      ok: true,
      redemptions,
    });
  } catch (error) {
    logControllerError(req, "Get my redemptions error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener el historial de canjes",
    });
  }
};

export const getCommerceRedemptions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const redemptions = await getCommerceRedemptionsByOwner(userId);

    return res.status(200).json({
      ok: true,
      redemptions,
    });
  } catch (error) {
    logControllerError(req, "Get commerce redemptions error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener los canjes del comercio",
    });
  }
};
