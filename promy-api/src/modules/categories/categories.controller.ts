import { Request, Response } from "express";
import {
  getCategoriesCatalog,
  getCategoriesQuerySchema,
} from "./categories.service";
import { logControllerError } from "../../shared/http/controllerLogger";

export const getCategories = async (req: Request, res: Response) => {
  try {
    const parsed = getCategoriesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Parametros invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const categories = await getCategoriesCatalog(parsed.data);

    return res.status(200).json({
      ok: true,
      categories,
    });
  } catch (error) {
    logControllerError(req, "Get categories error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener categorias",
    });
  }
};
