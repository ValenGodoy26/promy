import { AppNotificationType } from "@prisma/client";
import { z } from "zod";
import prisma from "../../config/prisma";
import { logError } from "../../shared/logging/logger";
import { ServiceError, cleanText } from "../../shared/utils/service";
import {
  deactivatePushTokenForUser,
  registerPushTokenForUser,
  sendPushNotificationToUser,
} from "../push/push.service";

type CreateNotificationInput = {
  userId: number;
  type: AppNotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  data: true,
  readAt: true,
  createdAt: true,
} as const;

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(10, "Token invalido"),
  platform: z.string().trim().min(2).max(30),
  deviceLabel: z.string().trim().max(120).optional(),
});

export const unregisterPushTokenSchema = z.object({
  token: z.string().trim().min(10, "Token invalido"),
});

function parseNotificationData(value: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function createAppNotification(input: CreateNotificationInput) {
  const notification = await prisma.appNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ? JSON.stringify(input.data) : null,
    },
  });

  try {
    await sendPushNotificationToUser(input.userId, {
      title: input.title,
      body: input.body,
      data: input.data || null,
    });
  } catch (error) {
    logError(undefined, error, "Push notification error", {
      userId: input.userId,
      notificationType: input.type,
    });
  }

  return notification;
}

export async function getUserNotifications(userId: number) {
  const notifications = await prisma.appNotification.findMany({
    where: {
      userId,
    },
    select: notificationSelect,
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return {
    unreadCount: notifications.filter((item) => !item.readAt).length,
    notifications: notifications.map((item) => ({
      ...item,
      data: parseNotificationData(item.data),
    })),
  };
}

export async function markNotificationAsReadForUser(params: {
  userId: number;
  notificationId: number;
}) {
  const existing = await prisma.appNotification.findFirst({
    where: {
      id: params.notificationId,
      userId: params.userId,
    },
    select: notificationSelect,
  });

  if (!existing) {
    throw new ServiceError("No encontramos esa notificacion", 404);
  }

  const notification = existing.readAt
    ? existing
    : await prisma.appNotification.update({
        where: {
          id: existing.id,
        },
        data: {
          readAt: new Date(),
        },
        select: notificationSelect,
      });

  return {
    ...notification,
    data: parseNotificationData(notification.data),
  };
}

export async function markAllNotificationsAsReadForUser(userId: number) {
  await prisma.appNotification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function registerNotificationPushToken(params: {
  userId: number;
  token: string;
  platform: string;
  deviceLabel?: string;
}) {
  await registerPushTokenForUser({
    userId: params.userId,
    token: params.token,
    platform: params.platform,
    deviceLabel: cleanText(params.deviceLabel) || null,
  });
}

export async function unregisterNotificationPushToken(params: {
  userId: number;
  token: string;
}) {
  await deactivatePushTokenForUser({
    userId: params.userId,
    token: params.token,
  });
}
