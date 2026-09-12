import prisma from "../../config/prisma";
import { env } from "../../config/env";
import { withRequestDeadline } from "../../shared/http/deadline";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  details?: {
    error?: string;
  };
  message?: string;
};

const isExpoPushToken = (value: string) => /^ExponentPushToken\[[^\]]+\]$/.test(value);

const pushTokenSelect = {
  id: true,
  token: true,
  platform: true,
  deviceLabel: true,
  isActive: true,
  lastRegisteredAt: true,
} as const;

export async function registerPushTokenForUser(input: {
  userId: number;
  token: string;
  platform: string;
  deviceLabel?: string | null;
}) {
  return prisma.pushToken.upsert({
    where: {
      token: input.token,
    },
    update: {
      userId: input.userId,
      platform: input.platform,
      deviceLabel: input.deviceLabel || null,
      isActive: true,
      lastRegisteredAt: new Date(),
    },
    create: {
      userId: input.userId,
      token: input.token,
      platform: input.platform,
      deviceLabel: input.deviceLabel || null,
      isActive: true,
      lastRegisteredAt: new Date(),
    },
    select: pushTokenSelect,
  });
}

export async function deactivatePushToken(token: string) {
  await prisma.pushToken.updateMany({
    where: {
      token,
    },
    data: {
      isActive: false,
    },
  });
}

export async function deactivatePushTokenForUser(input: {
  userId: number;
  token: string;
}) {
  await prisma.pushToken.updateMany({
    where: {
      userId: input.userId,
      token: input.token,
    },
    data: {
      isActive: false,
    },
  });
}

export async function sendPushNotificationToUser(userId: number, payload: PushPayload) {
  if (!env.EXPO_ACCESS_TOKEN) {
    return;
  }

  const pushTokens = await prisma.pushToken.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      token: true,
    },
  });

  const validTokens = pushTokens.filter((item) => isExpoPushToken(item.token));

  if (!validTokens.length) {
    return;
  }

  const { response, result } = await withRequestDeadline(10_000, async (signal) => {
    const nextResponse = await fetch(env.EXPO_PUSH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(
        validTokens.map((item) => ({
          to: item.token,
          sound: "default",
          title: payload.title,
          body: payload.body,
          data: payload.data || undefined,
        })),
      ),
      signal,
    });
    return { response: nextResponse, result: await nextResponse.json().catch(() => null) };
  });

  const typedResult = result as
    | {
        data?: ExpoPushTicket[];
        errors?: Array<{ message?: string }>;
      }
    | null;

  if (!response.ok) {
    throw new Error(
      typedResult?.errors?.[0]?.message || "Expo Push API rechazo la notificacion.",
    );
  }

  const tickets = typedResult?.data || [];

  await Promise.all(
    validTokens.map(async (item, index) => {
      const ticket = tickets[index];

      if (ticket?.status === "ok") {
        await prisma.pushToken.update({
          where: {
            id: item.id,
          },
          data: {
            lastSentAt: new Date(),
          },
        });
        return;
      }

      if (ticket?.details?.error === "DeviceNotRegistered") {
        await deactivatePushToken(item.token);
      }
    }),
  );
}
