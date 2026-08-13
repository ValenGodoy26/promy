import { Request, Response } from "express";
import { logControllerError } from "../../shared/http/controllerLogger";
import { createBetaAccessRequest, createBetaAccessRequestSchema } from "./beta.service";

export async function createBetaRequest(req: Request, res: Response) {
  try {
    const parsed = createBetaAccessRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await createBetaAccessRequest(parsed.data);

    return res.status(201).json({
      ok: true,
      message: result.message,
      request: {
        id: result.request.id,
        email: result.request.email,
        city: result.request.city,
        platform: result.request.platform,
        createdAt: result.request.createdAt,
      },
    });
  } catch (error) {
    logControllerError(req, "Create beta request error", error);

    return res.status(500).json({
      ok: false,
      message: "No pudimos guardar tu pedido ahora. Proba de nuevo en un rato.",
    });
  }
}
