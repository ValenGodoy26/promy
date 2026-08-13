import { Request, Response } from "express";
import { logControllerError } from "../../shared/http/controllerLogger";
import { isServiceError } from "../../shared/utils/service";
import { listMapMarkers, mapQuerySchema } from "./map.service";

export const getMapMarkers = async (req: Request, res: Response) => {
  try {
    const parsed = mapQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Parametros invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await listMapMarkers(parsed.data);

    return res.status(200).json({
      ok: true,
      context: result.context,
      markers: result.markers,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Get map markers error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener markers del mapa",
    });
  }
};
