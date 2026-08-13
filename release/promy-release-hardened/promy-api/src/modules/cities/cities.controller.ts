import { Request, Response } from "express";
import { getCitiesCatalog, getCitiesQuerySchema } from "./cities.service";
import { logControllerError } from "../../shared/http/controllerLogger";

export const getCities = async (req: Request, res: Response) => {
  try {
    const parsed = getCitiesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Parametros invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const cities = await getCitiesCatalog(parsed.data);

    return res.status(200).json({
      ok: true,
      cities,
    });
  } catch (error) {
    logControllerError(req, "Get cities error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener ciudades",
    });
  }
};
