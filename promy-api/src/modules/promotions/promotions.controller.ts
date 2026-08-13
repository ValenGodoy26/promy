import { Request, Response } from "express";
import { logControllerError } from "../../shared/http/controllerLogger";
import { isServiceError } from "../../shared/utils/service";
import {
  getFeaturedPromotionsCatalog,
  getNearbyPromotionsCatalog,
  getPromotionDetails,
  getPromotionsCatalog,
  getPromotionsQuerySchema,
} from "./promotions.service";

export const getPromotions = async (req: Request, res: Response) => {
  try {
    const parsed = getPromotionsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Parametros invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await getPromotionsCatalog(parsed.data);

    return res.status(200).json({
      ok: true,
      promotions: result.promotions,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Get promotions error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener promociones",
    });
  }
};

export const getFeaturedPromotions = async (req: Request, res: Response) => {
  try {
    const promotions = await getFeaturedPromotionsCatalog();

    return res.status(200).json({
      ok: true,
      promotions,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Get featured promotions error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener promociones destacadas",
    });
  }
};

export const getPromotionById = async (req: Request, res: Response) => {
  try {
    const promotionId = Number(req.params.id);

    if (Number.isNaN(promotionId)) {
      return res.status(400).json({
        ok: false,
        message: "ID de promocion invalido",
      });
    }

    const promotion = await getPromotionDetails(promotionId);

    return res.status(200).json({
      ok: true,
      promotion,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Get promotion by id error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener la promocion",
    });
  }
};

export const getNearbyPromotions = async (req: Request, res: Response) => {
  try {
    const parsed = getPromotionsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Parametros invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await getNearbyPromotionsCatalog(parsed.data);

    return res.status(200).json({
      ok: true,
      promotions: result.promotions,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      context: result.context,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Get nearby promotions error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener promociones cercanas",
    });
  }
};
