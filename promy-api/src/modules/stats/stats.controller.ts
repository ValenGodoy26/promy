import { Request, Response } from "express";
import { getPublicStats } from "./stats.service";
import { logControllerError } from "../../shared/http/controllerLogger";

export async function getStatsPublic(req: Request, res: Response) {
  try {
    const stats = await getPublicStats();

    return res.status(200).json({
      ok: true,
      stats,
    });
  } catch (error) {
    logControllerError(req as any, "Get public stats error", error);
    return res.status(500).json({
      ok: false,
      message: "No pudimos cargar las metricas publicas en este momento.",
    });
  }
}
