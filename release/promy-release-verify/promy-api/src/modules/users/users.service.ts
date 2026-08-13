import { z } from "zod";
import prisma from "../../config/prisma";
import { ServiceError, cleanText } from "../../shared/utils/service";
import {
  deactivatePushTokenForUser,
  registerPushTokenForUser,
} from "../push/push.service";

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(20, "Token push invalido"),
  platform: z.enum(["ios", "android"]),
  deviceLabel: z.string().trim().max(120).optional(),
});

export const unregisterPushTokenSchema = z.object({
  token: z.string().trim().min(20, "Token push invalido"),
});

export async function getCurrentUserProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      status: true,
      phone: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ServiceError("Usuario no encontrado", 404);
  }

  return user;
}

export async function registerUserPushToken(params: {
  userId: number;
  token: string;
  platform: "ios" | "android";
  deviceLabel?: string;
}) {
  return registerPushTokenForUser({
    userId: params.userId,
    token: params.token,
    platform: params.platform,
    deviceLabel: cleanText(params.deviceLabel) || null,
  });
}

export async function unregisterUserPushToken(params: {
  userId: number;
  token: string;
}) {
  await deactivatePushTokenForUser({
    userId: params.userId,
    token: params.token,
  });
}
