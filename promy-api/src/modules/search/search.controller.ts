import { Request, Response } from "express";
import { logControllerError } from "../../shared/http/controllerLogger";
import { isServiceError } from "../../shared/utils/service";
import { performCatalogSearch, searchQuerySchema } from "./search.service";

export const searchCatalog = async (req: Request, res: Response) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Parametros invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await performCatalogSearch(parsed.data);

    return res.status(200).json({
      ok: true,
      commerces: result.commerces,
      promotions: result.promotions,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Search catalog error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al buscar en el catalogo",
    });
  }
};
