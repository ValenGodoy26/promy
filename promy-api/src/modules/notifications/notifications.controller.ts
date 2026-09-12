import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { logControllerError } from "../../shared/http/controllerLogger";
import { isServiceError } from "../../shared/utils/service";
import {
  getUserNotifications,
  markAllNotificationsAsReadForUser,
  markNotificationAsReadForUser,
  notificationListQuerySchema,
  registerNotificationPushToken,
  registerPushTokenSchema,
  unregisterNotificationPushToken,
  unregisterPushTokenSchema,
} from "./notifications.service";

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const parsed = notificationListQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ ok: false, message: "Paginacion invalida" });
    const result = await getUserNotifications(userId, parsed.data);

    return res.status(200).json({
      ok: true,
      unreadCount: result.unreadCount,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      notifications: result.notifications,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Get notifications error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener notificaciones",
    });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const notificationId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Notificacion invalida",
      });
    }

    const notification = await markNotificationAsReadForUser({
      userId,
      notificationId,
    });

    return res.status(200).json({
      ok: true,
      message: "Notificacion marcada como leida",
      notification,
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Mark notification as read error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al marcar la notificacion",
    });
  }
};

export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    await markAllNotificationsAsReadForUser(userId);

    return res.status(200).json({
      ok: true,
      message: "Todas las notificaciones quedaron como leidas",
    });
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({
        ok: false,
        message: error.message,
        ...(error.details ?? {}),
      });
    }

    logControllerError(req, "Mark all notifications as read error", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno al actualizar notificaciones",
    });
  }
};

export const registerMyPushToken = async (req: AuthRequest, res: Response) => {
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

    await registerNotificationPushToken({
      userId,
      token: parsed.data.token,
      platform: parsed.data.platform,
      deviceLabel: parsed.data.deviceLabel,
    });

    return res.status(200).json({
      ok: true,
      message: "Token push registrado correctamente",
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

export const unregisterMyPushToken = async (req: AuthRequest, res: Response) => {
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

    await unregisterNotificationPushToken({
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
