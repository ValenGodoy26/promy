import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { isServiceError } from "../../shared/utils/service";
import {
  getCurrentUserProfile,
  registerPushTokenSchema,
  registerUserPushToken,
  unregisterPushTokenSchema,
  unregisterUserPushToken,
} from "./users.service";

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const user = await getCurrentUserProfile(req.user.userId);

    return res.status(200).json({
      ok: true,
      user,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    console.error("Get me error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener el usuario",
    });
  }
};

export const registerPushToken = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const parsed = registerPushTokenSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const pushToken = await registerUserPushToken({
      userId,
      token: parsed.data.token,
      platform: parsed.data.platform,
      deviceLabel: parsed.data.deviceLabel,
    });

    return res.status(200).json({
      ok: true,
      message: "Token push registrado correctamente",
      pushToken,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    console.error("Register push token error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al registrar el token push",
    });
  }
};

export const unregisterPushToken = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const parsed = unregisterPushTokenSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    await unregisterUserPushToken({
      userId,
      token: parsed.data.token,
    });

    return res.status(200).json({
      ok: true,
      message: "Token push desactivado correctamente",
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    console.error("Unregister push token error:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al desactivar el token push",
    });
  }
};
