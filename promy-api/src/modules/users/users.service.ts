import { UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import prisma from "../../config/prisma";
import { env } from "../../config/env";
import { logWarn } from "../../shared/logging/logger";
import { sendTransactionalEmail } from "../../shared/services/email.service";
import { ServiceError, cleanText } from "../../shared/utils/service";
import { buildAuthActionPreview, buildPublicAppUrl, normalizeEmail } from "../auth/auth.service";
import {
  deactivatePushTokenForUser,
  registerPushTokenForUser,
} from "../push/push.service";

const PASSWORD_MIN_LENGTH = 8;
const EMAIL_CHANGE_TTL_HOURS = 24;
const genderValues = ["WOMAN", "MAN", "NON_BINARY", "PREFER_NOT_TO_SAY", "OTHER"] as const;

function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day &&
    date < new Date()
  );
}

function formatSecurityTimestamp(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: env.PROMOTION_TIMEZONE,
  }).format(date);
}

function buildSecurityContactEmail() {
  return env.AUTH_EMAIL_REPLY_TO || env.AUTH_EMAIL_FROM || "hola@promy.app";
}

function createOpaqueToken() {
  return `${randomUUID()}${randomUUID().replace(/-/g, "")}`;
}

function buildOpaqueTokenFingerprint(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getEmailChangeExpiresAt() {
  return new Date(Date.now() + EMAIL_CHANGE_TTL_HOURS * 60 * 60 * 1000);
}

function buildSessionDeviceLabel(userAgent?: string | null) {
  const source = (userAgent || "").toLowerCase();

  if (!source) return "Dispositivo desconocido";
  if (source.includes("iphone")) return "iPhone";
  if (source.includes("ipad")) return "iPad";
  if (source.includes("android")) return "Android";
  if (source.includes("windows")) return "Windows";
  if (source.includes("mac os") || source.includes("macintosh")) return "Mac";
  if (source.includes("linux")) return "Linux";
  if (source.includes("expo")) return "Expo";

  return "Sesión web o móvil";
}

async function sendPasswordChangedSecurityEmail(params: {
  email: string;
  fullName?: string | null;
  changedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const greeting = cleanText(params.fullName) ?? "Hola";
  const supportEmail = buildSecurityContactEmail();
  const timestamp = formatSecurityTimestamp(params.changedAt);
  const ipLine = cleanText(params.ipAddress) || "IP no disponible";
  const deviceLine = buildSessionDeviceLabel(params.userAgent);

  await sendTransactionalEmail({
    to: params.email,
    subject: "Se cambió tu contraseña de PROMY",
    text: `${greeting}, alguien cambió la contraseña de tu cuenta el ${timestamp} desde ${ipLine} (${deviceLine}). Si no fuiste vos, escribinos a ${supportEmail}.`,
    html: `
      <p>${greeting},</p>
      <p>Se cambió la contraseña de tu cuenta de PROMY.</p>
      <ul>
        <li><strong>Fecha:</strong> ${timestamp}</li>
        <li><strong>IP:</strong> ${ipLine}</li>
        <li><strong>Dispositivo:</strong> ${deviceLine}</li>
      </ul>
      <p>Si no fuiste vos, escribinos cuanto antes a <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
    `,
  });
}

async function sendEmailChangeVerificationEmail(params: {
  currentEmail: string;
  nextEmail: string;
  fullName?: string | null;
  token: string;
}) {
  const link = buildPublicAppUrl(`/confirm-email-change?token=${encodeURIComponent(params.token)}`);

  if (!link) {
    throw new ServiceError("No se pudo construir el enlace publico para confirmar el nuevo email.", 500, {
      code: "PUBLIC_URL_NOT_CONFIGURED",
    });
  }

  const preview = buildAuthActionPreview("/confirm-email-change", params.token);
  const greeting = cleanText(params.fullName) ?? "Hola";

  await sendTransactionalEmail({
    to: params.nextEmail,
    subject: "Confirma tu nuevo email en PROMY",
    text: `${greeting}, recibimos un pedido para cambiar el email de tu cuenta PROMY desde ${params.currentEmail} a ${params.nextEmail}. Confirma el nuevo email aqui: ${link}`,
    html: `
      <p>${greeting},</p>
      <p>Recibimos un pedido para cambiar el email de tu cuenta PROMY.</p>
      <ul>
        <li><strong>Email actual:</strong> ${params.currentEmail}</li>
        <li><strong>Nuevo email:</strong> ${params.nextEmail}</li>
      </ul>
      <p><a href="${link}">Confirmar nuevo email</a></p>
      <p>Si no fuiste vos, puedes ignorar este mensaje y tu cuenta seguira usando el email actual.</p>
    `,
  });

  return preview;
}

async function sendEmailChangedSecurityNotice(params: {
  previousEmail: string;
  nextEmail: string;
  fullName?: string | null;
  changedAt: Date;
}) {
  const greeting = cleanText(params.fullName) ?? "Hola";
  const timestamp = formatSecurityTimestamp(params.changedAt);
  const supportEmail = buildSecurityContactEmail();
  const recipients = new Set([params.previousEmail, params.nextEmail]);

  await Promise.all(
    [...recipients].map((recipient) =>
      sendTransactionalEmail({
        to: recipient,
        subject: "Tu email de PROMY fue actualizado",
        text: `${greeting}, el email de tu cuenta PROMY se actualizo el ${timestamp}. Nuevo email: ${params.nextEmail}. Si no fuiste vos, escribinos a ${supportEmail}.`,
        html: `
          <p>${greeting},</p>
          <p>El email de tu cuenta PROMY se actualizo el ${timestamp}.</p>
          <ul>
            <li><strong>Email anterior:</strong> ${params.previousEmail}</li>
            <li><strong>Nuevo email:</strong> ${params.nextEmail}</li>
          </ul>
          <p>Si no fuiste vos, escribinos cuanto antes a <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
        `,
      }),
    ),
  );
}

const optionalTrimmedString = z
  .string()
  .trim()
  .max(120)
  .optional()
  .or(z.literal(""));

const birthDateSchema = z
  .string()
  .trim()
  .refine(isValidBirthDate, "Fecha de nacimiento invalida")
  .optional()
  .or(z.literal(""))
  .nullable();

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(20, "Token push invalido"),
  platform: z.enum(["ios", "android"]),
  deviceLabel: z.string().trim().max(120).optional(),
});

export const unregisterPushTokenSchema = z.object({
  token: z.string().trim().min(20, "Token push invalido"),
});

const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
  )
  .regex(/[A-Z]/, "La contrasena debe incluir al menos una mayuscula")
  .regex(/[a-z]/, "La contrasena debe incluir al menos una minuscula")
  .regex(/\d/, "La contrasena debe incluir al menos un numero");

export const updateCurrentUserSchema = z.object({
  fullName: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(120),
  phone: z.string().trim().min(6, "Telefono invalido").max(40).optional().or(z.literal("")),
  birthDate: birthDateSchema,
  country: optionalTrimmedString,
  gender: z.enum(genderValues).optional().or(z.literal("")),
});

export const requestCurrentUserEmailChangeSchema = z.object({
  nextEmail: z.string().trim().email("Email invalido"),
  currentPassword: z.string().min(8, "Ingresa tu contrasena actual"),
});

export const confirmCurrentUserEmailChangeSchema = z.object({
  token: z.string().trim().min(20, "Token invalido"),
});

export const changeCurrentUserPasswordSchema = z.object({
  currentPassword: z.string().min(8, "Ingresa tu contrasena actual"),
  nextPassword: passwordSchema,
});

export type ActiveSessionSummary = {
  id: number;
  deviceLabel: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
};

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
      birthDate: true,
      country: true,
      gender: true,
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

export async function listCurrentUserSessions(params: {
  userId: number;
  currentSessionId?: number | null;
}) {
  const now = new Date();

  // Limpieza de sesiones vencidas en segundo plano — no bloqueamos la lectura.
  // Si falla silenciosamente no es crítico: el SELECT siguiente filtra por expiresAt >= now.
  void prisma.session
    .deleteMany({
      where: {
        userId: params.userId,
        expiresAt: {
          lt: now,
        },
      },
    })
    .catch(() => {
      // Ignorar errores de limpieza para no interrumpir la respuesta al usuario.
    });

  const sessions = await prisma.session.findMany({
    where: {
      userId: params.userId,
      expiresAt: {
        gte: now,
      },
    },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
    orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
  });

  return sessions
    .map<ActiveSessionSummary>((session) => ({
      id: session.id,
      deviceLabel: buildSessionDeviceLabel(session.userAgent),
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      isCurrent: session.id === params.currentSessionId,
    }))
    .sort((left, right) => Number(right.isCurrent) - Number(left.isCurrent));
}

export async function revokeCurrentUserSessionById(params: {
  userId: number;
  targetSessionId: number;
  currentSessionId?: number | null;
}) {
  if (params.currentSessionId && params.targetSessionId === params.currentSessionId) {
    throw new ServiceError(
      "No puedes cerrar la sesion actual desde esta pantalla. Usa el boton de cerrar sesion.",
      409,
      { code: "CURRENT_SESSION_CANNOT_BE_REVOKED_HERE" },
    );
  }

  const deleted = await prisma.session.deleteMany({
    where: {
      id: params.targetSessionId,
      userId: params.userId,
    },
  });

  if (deleted.count === 0) {
    throw new ServiceError("La sesion indicada ya no existe o no pertenece a tu cuenta.", 404, {
      code: "SESSION_NOT_FOUND",
    });
  }

  return {
    revokedSessionId: params.targetSessionId,
  };
}

export async function revokeOtherCurrentUserSessions(params: {
  userId: number;
  currentSessionId?: number | null;
}) {
  const deleted = await prisma.session.deleteMany({
    where: {
      userId: params.userId,
      ...(params.currentSessionId
        ? {
            id: {
              not: params.currentSessionId,
            },
          }
        : {}),
    },
  });

  return {
    revokedSessionsCount: deleted.count,
  };
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

export async function updateCurrentUserProfile(params: {
  userId: number;
  fullName: string;
  phone?: string | null;
  birthDate?: string | null;
  country?: string | null;
  gender?: (typeof genderValues)[number] | "" | null;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true },
  });

  if (!user) {
    throw new ServiceError("Usuario no encontrado", 404);
  }

  return prisma.user.update({
    where: { id: params.userId },
    data: {
      fullName: params.fullName.trim(),
      phone: cleanText(params.phone) || null,
      birthDate: params.birthDate ? new Date(params.birthDate) : null,
      country: cleanText(params.country) || null,
      gender: cleanText(params.gender) || null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      status: true,
      phone: true,
      birthDate: true,
      country: true,
      gender: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function ensureEmailChangeTargetAvailable(nextEmail: string, userId: number) {
  const existingUser = await prisma.user.findUnique({
    where: { email: nextEmail },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== userId) {
    throw new ServiceError("Ya existe una cuenta usando ese email.", 409, {
      code: "EMAIL_ALREADY_IN_USE",
    });
  }

  const existingPendingUser = await prisma.user.findFirst({
    where: {
      pendingEmail: nextEmail,
      id: {
        not: userId,
      },
    },
    select: { id: true },
  });

  if (existingPendingUser) {
    throw new ServiceError("Ese email ya esta reservado en otro cambio pendiente. Prueba con otro correo.", 409, {
      code: "EMAIL_CHANGE_ALREADY_PENDING",
    });
  }
}

export async function requestCurrentUserEmailChange(params: {
  userId: number;
  nextEmail: string;
  currentPassword: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new ServiceError("Usuario no encontrado", 404);
  }

  const nextEmail = normalizeEmail(params.nextEmail);

  if (nextEmail === user.email) {
    throw new ServiceError("El nuevo email debe ser distinto al actual.", 409, {
      code: "EMAIL_NOT_CHANGED",
    });
  }

  const matches = await bcrypt.compare(params.currentPassword, user.passwordHash);
  if (!matches) {
    throw new ServiceError("La contrasena actual no coincide con la cuenta.", 409, {
      code: "CURRENT_PASSWORD_INVALID",
    });
  }

  await ensureEmailChangeTargetAvailable(nextEmail, user.id);

  const token = createOpaqueToken();
  const tokenHash = buildOpaqueTokenFingerprint(token);
  const expiresAt = getEmailChangeExpiresAt();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pendingEmail: nextEmail,
      pendingEmailTokenHash: tokenHash,
      pendingEmailTokenExpiresAt: expiresAt,
    },
  });

  let preview: ReturnType<typeof buildAuthActionPreview> | undefined;

  try {
    preview = await sendEmailChangeVerificationEmail({
      currentEmail: user.email,
      nextEmail,
      fullName: user.fullName,
      token,
    });
  } catch (error) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingEmail: null,
        pendingEmailTokenHash: null,
        pendingEmailTokenExpiresAt: null,
      },
    });

    throw error;
  }

  return {
    pendingEmail: nextEmail,
    expiresAt,
    preview,
  };
}

export async function confirmCurrentUserEmailChange(params: {
  token: string;
}) {
  const tokenHash = buildOpaqueTokenFingerprint(params.token);
  const now = new Date();

  const user = await prisma.user.findFirst({
    where: {
      pendingEmailTokenHash: tokenHash,
      pendingEmailTokenExpiresAt: {
        gte: now,
      },
      pendingEmail: {
        not: null,
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      pendingEmail: true,
    },
  });

  if (!user?.pendingEmail) {
    throw new ServiceError("El enlace para cambiar el email es invalido o ya vencio.", 404, {
      code: "EMAIL_CHANGE_TOKEN_INVALID",
    });
  }

  const nextEmail = user.pendingEmail;

  await ensureEmailChangeTargetAvailable(nextEmail, user.id);

  const changedAt = new Date();

  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        email: nextEmail,
        emailVerifiedAt: changedAt,
        pendingEmail: null,
        pendingEmailTokenHash: null,
        pendingEmailTokenExpiresAt: null,
        sessionVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        birthDate: true,
        country: true,
        gender: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await tx.session.deleteMany({
      where: {
        userId: user.id,
      },
    });

    return updated;
  });

  try {
    await sendEmailChangedSecurityNotice({
      previousEmail: user.email,
      nextEmail: updatedUser.email,
      fullName: updatedUser.fullName,
      changedAt,
    });
  } catch (error) {
    logWarn(undefined, "No pudimos enviar el aviso de seguridad por cambio de email", {
      userId: updatedUser.id,
      previousEmail: user.email,
      nextEmail: updatedUser.email,
      error,
    });
  }

  return {
    user: updatedUser,
    changedAt,
    previousEmail: user.email,
  };
}

export async function changeCurrentUserPassword(params: {
  userId: number;
  currentPassword: string;
  nextPassword: string;
  currentSessionId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new ServiceError("Usuario no encontrado", 404);
  }

  const matches = await bcrypt.compare(params.currentPassword, user.passwordHash);
  if (!matches) {
    throw new ServiceError("La contrasena actual no coincide con la cuenta.", 409, {
      code: "CURRENT_PASSWORD_INVALID",
    });
  }

  if (params.currentPassword === params.nextPassword) {
    throw new ServiceError("Elige una contrasena nueva distinta a la actual.", 409, {
      code: "PASSWORD_NOT_CHANGED",
    });
  }

  const nextPasswordHash = await bcrypt.hash(params.nextPassword, 10);
  const changedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: params.userId },
      data: {
        passwordHash: nextPasswordHash,
      },
    });

    await tx.session.deleteMany({
      where: {
        userId: params.userId,
        ...(params.currentSessionId
          ? {
              id: {
                not: params.currentSessionId,
              },
            }
          : {}),
      },
    });
  });

  try {
    await sendPasswordChangedSecurityEmail({
      email: user.email,
      fullName: user.fullName,
      changedAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (error) {
    logWarn(undefined, "No pudimos enviar el email de seguridad por cambio de contrasena", {
      userId: user.id,
      email: user.email,
      error,
    });
  }

  return {
    changedAt,
  };
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

export async function deleteCurrentUserAccount(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      fullName: true,
      email: true,
    },
  });

  if (!user) {
    throw new ServiceError("Usuario no encontrado", 404);
  }

  if (user.role !== UserRole.CLIENT) {
    throw new ServiceError(
      "Por ahora la eliminacion automatica solo esta disponible para cuentas cliente. Si necesitas cerrar una cuenta de comercio o admin, escribinos a soporte.",
      409,
      { code: "ACCOUNT_DELETION_NOT_SUPPORTED_FOR_ROLE" },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.pushToken.deleteMany({ where: { userId } });
    await tx.appNotification.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });

  return {
    deletedUserId: user.id,
    deletedEmail: user.email,
    deletedFullName: user.fullName,
  };
}
