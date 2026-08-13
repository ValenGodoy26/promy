import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import {
  createPromotionForOwner,
  createPromotionSchema,
  deletePromotionForOwner,
  getCommerceDashboardByOwner,
  getPrimaryCommerceByOwner,
  isCommerceServiceError,
  listPromotionsByOwner,
  updateCommerceSchema,
  updateManagedCommerceByOwner,
  updatePromotionForOwner,
  updatePromotionSchema,
} from "./commerce.service";
import {
  getCommerceRedemptionsByOwner,
  isRedemptionServiceError,
  validateCommerceRedemptionByCode,
  validateRedemptionSchema,
} from "../redemptions/redemptions.service";

function handleCommerceServiceError(error: unknown, res: Response) {
  if (isCommerceServiceError(error)) {
    return res.status(error.statusCode).json({
      ok: false,
      message: error.message,
      ...(error.details ?? {}),
    });
  }

  return null;
}

export const getCommerceDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const dashboard = await getCommerceDashboardByOwner(userId);
    return res.status(200).json({ ok: true, dashboard });
  } catch (error: unknown) {
    const handled = handleCommerceServiceError(error, res);
    if (handled) {
      return handled;
    }

    console.error("Get commerce dashboard error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener el dashboard del comercio",
    });
  }
};

export const getMyCommerce = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const result = await getPrimaryCommerceByOwner(userId);

    return res.status(200).json({
      ok: true,
      commerce: result.commerce,
      commercesCount: result.commercesCount,
    });
  } catch (error: unknown) {
    const handled = handleCommerceServiceError(error, res);
    if (handled) {
      return handled;
    }

    console.error("Get my commerce error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener el comercio",
    });
  }
};

export const updateMyCommerce = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const parsed = updateCommerceSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const updatedCommerce = await updateManagedCommerceByOwner({
      ownerUserId: userId,
      data: parsed.data,
    });

    return res.status(200).json({
      ok: true,
      message: "Comercio actualizado correctamente",
      commerce: updatedCommerce,
    });
  } catch (error: unknown) {
    const handled = handleCommerceServiceError(error, res);
    if (handled) {
      return handled;
    }

    console.error("Update my commerce error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al actualizar el comercio",
    });
  }
};

export const getMyPromotions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const promotions = await listPromotionsByOwner(userId);
    return res.status(200).json({ ok: true, promotions });
  } catch (error: unknown) {
    const handled = handleCommerceServiceError(error, res);
    if (handled) {
      return handled;
    }

    console.error("Get my promotions error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener promociones del comercio",
    });
  }
};

export const createMyPromotion = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const parsed = createPromotionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const newPromotion = await createPromotionForOwner({
      ownerUserId: userId,
      data: parsed.data,
    });

    return res.status(201).json({
      ok: true,
      message: "Promocion creada correctamente",
      promotion: newPromotion,
    });
  } catch (error: unknown) {
    const handled = handleCommerceServiceError(error, res);
    if (handled) {
      return handled;
    }

    console.error("Create my promotion error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al crear la promocion",
    });
  }
};

export const updateMyPromotion = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const promotionId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    if (Number.isNaN(promotionId)) {
      return res.status(400).json({ ok: false, message: "ID de promocion invalido" });
    }

    const parsed = updatePromotionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const updatedPromotion = await updatePromotionForOwner({
      ownerUserId: userId,
      promotionId,
      data: parsed.data,
    });

    return res.status(200).json({
      ok: true,
      message: "Promocion actualizada correctamente",
      promotion: updatedPromotion,
    });
  } catch (error: unknown) {
    const handled = handleCommerceServiceError(error, res);
    if (handled) {
      return handled;
    }

    console.error("Update my promotion error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al actualizar la promocion",
    });
  }
};

export const deleteMyPromotion = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const promotionId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    if (Number.isNaN(promotionId)) {
      return res.status(400).json({ ok: false, message: "ID de promocion invalido" });
    }

    const result = await deletePromotionForOwner({
      ownerUserId: userId,
      promotionId,
    });

    return res.status(200).json({
      ok: true,
      message: "Promocion eliminada correctamente",
      deletedPromotionId: result.deletedPromotionId,
    });
  } catch (error: unknown) {
    const handled = handleCommerceServiceError(error, res);
    if (handled) {
      return handled;
    }

    console.error("Delete my promotion error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al eliminar la promocion",
    });
  }
};

export const getMyRedemptions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const redemptions = await getCommerceRedemptionsByOwner(userId);
    return res.status(200).json({ ok: true, redemptions });
  } catch (error: unknown) {
    if (isRedemptionServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    console.error("Get my commerce redemptions error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener los canjes del comercio",
    });
  }
};

export const validateCommerceRedemption = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const parsed = validateRedemptionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await validateCommerceRedemptionByCode({
      ownerUserId: userId,
      validationCode: parsed.data.validationCode,
    });

    return res.status(result.statusCode).json({
      ok: true,
      message: result.message,
      redemption: result.redemption,
    });
  } catch (error: unknown) {
    if (isRedemptionServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    console.error("Validate commerce redemption error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al validar el canje",
    });
  }
};
