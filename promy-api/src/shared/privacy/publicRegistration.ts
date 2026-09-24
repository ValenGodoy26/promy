import type { NextFunction, Request, Response } from "express";
import { env, isPublicRegistrationEnabled } from "../../config/env";

export const PUBLIC_REGISTRATION_DISABLED_MESSAGE =
  "El registro público todavía no está habilitado para este entorno.";

export function createPublicRegistrationGate(config: typeof env) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isPublicRegistrationEnabled(config)) {
      return next();
    }

    return res.status(503).json({
      ok: false,
      code: "PUBLIC_REGISTRATION_DISABLED",
      message: PUBLIC_REGISTRATION_DISABLED_MESSAGE,
    });
  };
}

export const requirePublicRegistration = createPublicRegistrationGate(env);
