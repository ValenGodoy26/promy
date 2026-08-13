import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { logControllerError } from "../../shared/http/controllerLogger";
import { logOperationalEvent } from "../../shared/logging/logger";
import { isServiceError } from "../../shared/utils/service";
import {
  changeCurrentUserPassword,
  changeCurrentUserPasswordSchema,
  confirmCurrentUserEmailChange,
  confirmCurrentUserEmailChangeSchema,
  deleteCurrentUserAccount,
  getCurrentUserProfile,
  listCurrentUserSessions,
  requestCurrentUserEmailChange,
  requestCurrentUserEmailChangeSchema,
  registerPushTokenSchema,
  registerUserPushToken,
  revokeCurrentUserSessionById,
  revokeOtherCurrentUserSessions,
  unregisterPushTokenSchema,
  unregisterUserPushToken,
  updateCurrentUserProfile,
  updateCurrentUserSchema,
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

    logControllerError(req, "Get me error", error);
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

    logControllerError(req, "Register push token error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al registrar el token push",
    });
  }
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const parsed = updateCurrentUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const user = await updateCurrentUserProfile({
      userId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      birthDate: parsed.data.birthDate,
      country: parsed.data.country,
      gender: parsed.data.gender,
    });

    return res.status(200).json({
      ok: true,
      message: "Tus datos se actualizaron correctamente",
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

    logControllerError(req, "Update me error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al actualizar la cuenta",
    });
  }
};

export const getMySessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const sessions = await listCurrentUserSessions({
      userId,
      currentSessionId: req.user?.sessionId,
    });

    return res.status(200).json({
      ok: true,
      sessions,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Get my sessions error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener las sesiones activas",
    });
  }
};

export const changeMyPassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const parsed = changeCurrentUserPasswordSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    await changeCurrentUserPassword({
      userId,
      currentPassword: parsed.data.currentPassword,
      nextPassword: parsed.data.nextPassword,
      currentSessionId: req.user?.sessionId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
    });

    logOperationalEvent(req, "users.password_changed", {
      requestId: req.requestId,
      userId,
    });

    return res.status(200).json({
      ok: true,
      message: "Tu contrasena se actualizo correctamente y te enviamos un aviso de seguridad por email.",
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Change my password error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al cambiar la contrasena",
    });
  }
};

export const requestMyEmailChange = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const parsed = requestCurrentUserEmailChangeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await requestCurrentUserEmailChange({
      userId,
      nextEmail: parsed.data.nextEmail,
      currentPassword: parsed.data.currentPassword,
    });

    logOperationalEvent(req, "users.email_change_requested", {
      requestId: req.requestId,
      userId,
      pendingEmail: result.pendingEmail,
    });

    return res.status(200).json({
      ok: true,
      message: "Te enviamos un enlace al nuevo email para confirmar el cambio. Tu cuenta seguira usando el correo actual hasta que lo confirmes.",
      pendingEmail: result.pendingEmail,
      verification: result.preview,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Request my email change error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al iniciar el cambio de email",
    });
  }
};

export const confirmMyEmailChange = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = confirmCurrentUserEmailChangeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Datos invalidos",
        errors: parsed.error.flatten(),
      });
    }

    const result = await confirmCurrentUserEmailChange({
      token: parsed.data.token,
    });

    logOperationalEvent(req, "users.email_change_confirmed", {
      requestId: req.requestId,
      userId: result.user.id,
      previousEmail: result.previousEmail,
      nextEmail: result.user.email,
    });

    return res.status(200).json({
      ok: true,
      message: "Tu email se actualizo correctamente. Por seguridad, cerramos tus sesiones activas. Vuelve a ingresar con el nuevo correo.",
      user: result.user,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Confirm my email change error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al confirmar el cambio de email",
    });
  }
};

export const revokeMySession = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const targetSessionId = Number(req.params.sessionId);

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    if (!Number.isInteger(targetSessionId) || targetSessionId <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Sesion invalida",
      });
    }

    const result = await revokeCurrentUserSessionById({
      userId,
      targetSessionId,
      currentSessionId: req.user?.sessionId,
    });

    logOperationalEvent(req, "users.session_revoked", {
      requestId: req.requestId,
      userId,
      targetSessionId: result.revokedSessionId,
    });

    return res.status(200).json({
      ok: true,
      message: "La sesion seleccionada se cerro correctamente.",
      revokedSessionId: result.revokedSessionId,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Revoke my session error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al cerrar la sesion",
    });
  }
};

export const revokeMyOtherSessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const result = await revokeOtherCurrentUserSessions({
      userId,
      currentSessionId: req.user?.sessionId,
    });

    logOperationalEvent(req, "users.other_sessions_revoked", {
      requestId: req.requestId,
      userId,
      revokedSessionsCount: result.revokedSessionsCount,
    });

    return res.status(200).json({
      ok: true,
      message:
        result.revokedSessionsCount > 0
          ? "Cerramos las otras sesiones activas de tu cuenta."
          : "No habia otras sesiones activas para cerrar.",
      revokedSessionsCount: result.revokedSessionsCount,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Revoke other sessions error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al cerrar las otras sesiones",
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

    logControllerError(req, "Unregister push token error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al desactivar el token push",
    });
  }
};

export const deleteMyAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const deletedAccount = await deleteCurrentUserAccount(userId);

    logOperationalEvent(req, "users.account_deleted", {
      requestId: req.requestId,
      userId: deletedAccount.deletedUserId,
      email: deletedAccount.deletedEmail,
      role: "CLIENT",
    });

    return res.status(200).json({
      ok: true,
      message: "Tu cuenta fue eliminada correctamente",
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Delete my account error", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno al eliminar la cuenta",
    });
  }
};
