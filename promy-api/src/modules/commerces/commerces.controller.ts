import { Request, Response } from "express";
import { logControllerError } from "../../shared/http/controllerLogger";
import { isServiceError } from "../../shared/utils/service";
import {
  getCommerceDetails,
  getCommercesCatalog,
  getCommercesQuerySchema,
  getNearbyCommercesCatalog,
} from "./commerces.service";

export const getCommerces = async (req: Request, res: Response) => {
  try {
    const parsed = getCommercesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Parametros invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await getCommercesCatalog(parsed.data);

    return res.status(200).json({
      ok: true,
      commerces: result.commerces,
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

    logControllerError(req, "Get commerces error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener comercios",
    });
  }
};

export const getCommerceById = async (req: Request, res: Response) => {
  try {
    const commerceId = Number(req.params.id);

    if (Number.isNaN(commerceId)) {
      return res.status(400).json({
        ok: false,
        message: "ID de comercio invalido",
      });
    }

    const commerce = await getCommerceDetails(commerceId);

    return res.status(200).json({
      ok: true,
      commerce,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Get commerce by id error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener el comercio",
    });
  }
};

export const getNearbyCommerces = async (req: Request, res: Response) => {
  try {
    const parsed = getCommercesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Parametros invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await getNearbyCommercesCatalog(parsed.data);

    return res.status(200).json({
      ok: true,
      commerces: result.commerces,
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

    logControllerError(req, "Get nearby commerces error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener comercios cercanos",
    });
  }
};
