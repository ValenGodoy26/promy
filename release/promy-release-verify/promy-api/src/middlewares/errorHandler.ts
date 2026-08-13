import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("ERROR:", error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      ok: false,
      message: "Datos inválidos",
      errors: error.flatten(),
    });
  }

  if (error.message === "Origin no permitida por CORS") {
    return res.status(403).json({
      ok: false,
      message: "Origin no permitida",
    });
  }

  return res.status(500).json({
    ok: false,
    message: "Error interno del servidor",
  });
};
