import { AppNotificationType, Prisma, User, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { z } from "zod";
import prisma from "../../config/prisma";
import { env, isDevelopment, isTest } from "../../config/env";
import { AUTH_REFRESH_INVALID_MESSAGE } from "../../shared/http/auth";
import { logWarn } from "../../shared/logging/logger";
import { sendTransactionalEmail } from "../../shared/services/email.service";
import { escapeHtmlAttribute, escapeHtmlText } from "../../shared/security/html";
import { newPasswordSchema, PASSWORD_MIN_LENGTH } from "../../shared/security/passwordPolicy";
import { getRefreshExpiresAt, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/utils/jwt";
import { buildWebPanelPath } from "../../shared/utils/deepLinks";
import { cleanText, ServiceError } from "../../shared/utils/service";
import { createAppNotification } from "../notifications/notifications.service";
import { publishRealtimeEvent } from "../realtime/realtime.service";

const EMAIL_TOKEN_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 30;
const DUMMY_PASSWORD_HASH =
  "$2b$10$5aMEhzxXgtrtXu6JG67biOTo0nH9bjbqOl7lQ31eeNpxK7Ygz/UTa";

export const registerSchema = z.object({
  fullName: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(120),
  email: z.string().trim().email("Email invalido").max(191),
  password: newPasswordSchema,
  phone: z.string().trim().min(6, "Telefono invalido").max(40).optional(),
});

export const registerCommerceSchema = z.object({
  fullName: z.string().trim().min(3, "El nombre del responsable debe tener al menos 3 caracteres").max(120),
  email: z.string().trim().email("Email invalido").max(191),
  password: newPasswordSchema,
  phone: z.string().trim().min(6, "Telefono invalido").max(40).optional(),
  commerceName: z.string().trim().min(3, "El nombre del comercio debe tener al menos 3 caracteres").max(120),
  shortDescription: z
    .string()
    .trim()
    .min(6, "La descripcion corta debe tener al menos 6 caracteres")
    .max(120)
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, "La descripcion debe tener al menos 10 caracteres")
    .max(1000)
    .optional(),
  address: z.string().trim().min(5, "La direccion es obligatoria").max(191),
  cityId: z.coerce.number().int().positive("Ciudad invalida"),
  categoryId: z.coerce.number().int().positive("Categoria invalida"),
  instagram: z.string().trim().max(80).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Email invalido").max(191),
  password: z.string().min(PASSWORD_MIN_LENGTH, "Credenciales invalidas"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token requerido"),
});

export const requestEmailVerificationSchema = z.object({
  email: z.string().trim().email("Email invalido").max(191),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(20, "Token invalido"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Email invalido").max(191),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, "Token invalido"),
  password: newPasswordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterCommerceInput = z.infer<typeof registerCommerceSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export function publicUser(user: {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
  birthDate?: Date | null;
  country?: string | null;
  gender?: string | null;
  emailVerifiedAt?: Date | null;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone,
    birthDate: user.birthDate,
    country: user.country,
    gender: user.gender,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildRefreshTokenFingerprint(refreshToken: string) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

async function hashRefreshToken(refreshToken: string) {
  return buildRefreshTokenFingerprint(refreshToken);
}

function buildOpaqueTokenFingerprint(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createOpaqueToken() {
  return `${randomUUID()}${randomUUID().replace(/-/g, "")}`;
}

function getEmailVerificationExpiresAt() {
  return new Date(Date.now() + EMAIL_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

function getPasswordResetExpiresAt() {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
}

export function buildPublicAppUrl(path: string) {
  const baseUrl = env.PUBLIC_WEB_URL
    ? env.PUBLIC_WEB_URL
    : env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .find((origin) => origin && origin !== "*");

  if (!baseUrl) {
    return null;
  }

  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return null;
  }
}

export function buildAuthActionPreview(path: string, token: string) {
  const link = buildPublicAppUrl(`${path}?token=${encodeURIComponent(token)}`);
  return isDevelopment || isTest
    ? {
        token,
        link,
      }
    : undefined;
}

async function sendEmailVerificationEmail(params: {
  email: string;
  fullName?: string | null;
  token: string;
}) {
  const link = buildPublicAppUrl(`/verify-email?token=${encodeURIComponent(params.token)}`);

  if (!link) {
    throw new ServiceError("No se pudo construir el enlace publico de verificacion.", 500, {
      code: "PUBLIC_URL_NOT_CONFIGURED",
    });
  }

  const preview = buildAuthActionPreview("/verify-email", params.token);
  const greeting = cleanText(params.fullName) ?? "Hola";
  const htmlGreeting = escapeHtmlText(greeting);
  const htmlLink = escapeHtmlAttribute(link);

  await sendTransactionalEmail({
    to: params.email,
    subject: "Verifica tu email en PROMY",
    text: `${greeting}, verifica tu email para activar tu cuenta en PROMY: ${link}`,
    html: `
      <p>${htmlGreeting},</p>
      <p>Necesitamos verificar tu email para activar tu cuenta en PROMY.</p>
      <p><a href="${htmlLink}">Verificar email</a></p>
      <p>Si no solicitaste este registro, puedes ignorar este mensaje.</p>
    `,
  });

  return preview;
}

async function sendPasswordResetEmail(params: {
  email: string;
  fullName?: string | null;
  token: string;
}) {
  const link = buildPublicAppUrl(`/reset-password?token=${encodeURIComponent(params.token)}`);

  if (!link) {
    throw new ServiceError("No se pudo construir el enlace publico de recuperacion.", 500, {
      code: "PUBLIC_URL_NOT_CONFIGURED",
    });
  }

  const preview = buildAuthActionPreview("/reset-password", params.token);
  const greeting = cleanText(params.fullName) ?? "Hola";
  const htmlGreeting = escapeHtmlText(greeting);
  const htmlLink = escapeHtmlAttribute(link);

  await sendTransactionalEmail({
    to: params.email,
    subject: "Recupera tu contrasena de PROMY",
    text: `${greeting}, usa este enlace para recuperar tu contrasena en PROMY: ${link}`,
    html: `
      <p>${htmlGreeting},</p>
      <p>Recibimos una solicitud para restablecer tu contrasena en PROMY.</p>
      <p><a href="${htmlLink}">Restablecer contrasena</a></p>
      <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
    `,
  });

  return preview;
}

async function sendWelcomeEmail(params: {
  email: string;
  fullName?: string | null;
  role: "CLIENT" | "COMMERCE";
}) {
  const greeting = cleanText(params.fullName) ?? "Hola";
  const body =
    params.role === "COMMERCE"
      ? "Tu cuenta comercio ya fue creada. Puedes completar el perfil del negocio y preparar promociones mientras el equipo revisa el alta."
      : "Tu cuenta ya esta lista. Puedes explorar promos, guardar favoritas y completar tu perfil para personalizar la experiencia.";

  await sendTransactionalEmail({
    to: params.email,
    subject: params.role === "COMMERCE" ? "Bienvenido a PROMY Comercios" : "Bienvenido a PROMY",
    text: `${greeting}, ${body}`,
    html: `
      <p>${escapeHtmlText(greeting)},</p>
      <p>${escapeHtmlText(body)}</p>
      <p>Equipo PROMY</p>
    `,
  });
}

async function verifyStoredRefreshToken(refreshToken: string, storedHash: string) {
  const fingerprint = buildRefreshTokenFingerprint(refreshToken);

  if (/^[a-f0-9]{64}$/.test(storedHash)) {
    return timingSafeEqual(Buffer.from(fingerprint, "hex"), Buffer.from(storedHash, "hex"));
  }

  const fingerprintMatches = await bcrypt.compare(
    fingerprint,
    storedHash,
  );

  if (fingerprintMatches) {
    return true;
  }

  // Compatibilidad con sesiones emitidas antes de endurecer el hashing.
  return bcrypt.compare(refreshToken, storedHash);
}

function slugifyCommerceName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return normalized || `comercio-${Date.now()}`;
}

async function buildUniqueCommerceSlug(
  tx: Pick<Prisma.TransactionClient, "commerce">,
  commerceName: string,
) {
  const baseSlug = slugifyCommerceName(commerceName);
  let candidate = baseSlug;
  let suffix = 2;

  while (await tx.commerce.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function createCommerceRecord(
  tx: Pick<Prisma.TransactionClient, "commerce" | "$executeRaw">,
  input: {
    ownerUserId: number;
    cityId: number;
    categoryId: number;
    name: string;
    slug: string;
    shortDescription: string | null;
    description: string | null;
    address: string;
    phone: string | null;
    instagram: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED" | "INACTIVE";
  },
) {
  await tx.$executeRaw`
    INSERT INTO Commerce (
      ownerUserId,
      cityId,
      categoryId,
      name,
      slug,
      shortDescription,
      description,
      address,
      phone,
      instagram,
      status,
      isFeatured,
      featuredRank,
      isHiddenByAdmin,
      createdAt,
      updatedAt
    )
    VALUES (
      ${input.ownerUserId},
      ${input.cityId},
      ${input.categoryId},
      ${input.name},
      ${input.slug},
      ${input.shortDescription},
      ${input.description},
      ${input.address},
      ${input.phone},
      ${input.instagram},
      ${input.status},
      false,
      0,
      false,
      NOW(),
      NOW()
    )
  `;

  return tx.commerce.findUniqueOrThrow({
    where: { slug: input.slug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      shortDescription: true,
      address: true,
      city: {
        select: {
          id: true,
          name: true,
          province: true,
          slug: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
        },
      },
    },
  });
}

async function createSessionTokens(input: {
  user: Pick<User, "id" | "role" | "sessionVersion">;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const { user, userAgent, ipAddress } = input;

  await prisma.session.deleteMany({
    where: {
      userId: user.id,
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  const tempSession = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: `pending-${user.id}-${Date.now()}-${Math.random()}`,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt: getRefreshExpiresAt(),
    },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    sessionId: tempSession.id,
    sessionVersion: user.sessionVersion,
  });

  const refreshToken = signRefreshToken({
    userId: user.id,
    role: user.role,
    sessionId: tempSession.id,
    sessionVersion: user.sessionVersion,
    tokenId: randomUUID(),
  });

  const refreshTokenHash = await hashRefreshToken(refreshToken);

  await prisma.session.update({
    where: { id: tempSession.id },
    data: {
      refreshTokenHash,
      expiresAt: getRefreshExpiresAt(),
      lastUsedAt: new Date(),
    },
  });

  return {
    accessToken,
    refreshToken,
  };
}

async function ensureEmailAvailable(email: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ServiceError("Ya existe un usuario con ese email", 409);
  }
}

function ensureActiveUser(user: Pick<User, "status">) {
  if (user.status !== UserStatus.ACTIVE) {
    throw new ServiceError("Tu usuario no esta activo", 403);
  }
}

async function issueEmailVerificationToken(userId: number) {
  const token = createOpaqueToken();

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationTokenHash: buildOpaqueTokenFingerprint(token),
      emailVerificationExpiresAt: getEmailVerificationExpiresAt(),
    },
  });

  return token;
}

async function issuePasswordResetToken(userId: number) {
  const token = createOpaqueToken();

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetTokenHash: buildOpaqueTokenFingerprint(token),
      passwordResetExpiresAt: getPasswordResetExpiresAt(),
    },
  });

  return token;
}

export async function registerClient(input: RegisterInput) {
  const password = newPasswordSchema.parse(input.password);
  const email = normalizeEmail(input.email);
  const phone = cleanText(input.phone) ?? null;

  await ensureEmailAvailable(email);

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName.trim(),
      email,
      passwordHash,
      emailVerifiedAt: null,
      phone,
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
    },
  });

  const verificationToken = await issueEmailVerificationToken(user.id);
  const verification = await sendEmailVerificationEmail({
    email: user.email,
    fullName: user.fullName,
    token: verificationToken,
  });

  void sendWelcomeEmail({
    email: user.email,
    fullName: user.fullName,
    role: "CLIENT",
  }).catch((error) =>
    logWarn(undefined, "No pudimos enviar el email de bienvenida al cliente", {
      userId: user.id,
      email: user.email,
      error,
    }),
  );

  return {
    user: publicUser(user),
    verification,
  };
}

export async function registerCommerceOwner(input: RegisterCommerceInput) {
  const password = newPasswordSchema.parse(input.password);
  const email = normalizeEmail(input.email);
  const phone = cleanText(input.phone) ?? null;
  const instagram = cleanText(input.instagram) ?? null;
  const shortDescription = cleanText(input.shortDescription) ?? null;
  const description = cleanText(input.description) ?? shortDescription ?? null;

  await ensureEmailAvailable(email);

  const [city, category] = await Promise.all([
    prisma.city.findFirst({
      where: {
        id: input.cityId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        province: true,
        slug: true,
      },
    }),
    prisma.category.findFirst({
      where: {
        id: input.categoryId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
      },
    }),
  ]);

  if (!city) {
    throw new ServiceError("La ciudad seleccionada no existe o esta inactiva", 400);
  }

  if (!category) {
    throw new ServiceError("La categoria seleccionada no existe o esta inactiva", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: {
        fullName: input.fullName.trim(),
        email,
        passwordHash,
        emailVerifiedAt: null,
        phone,
        role: UserRole.COMMERCE,
        status: UserStatus.ACTIVE,
      },
    });

    const slug = await buildUniqueCommerceSlug(tx, input.commerceName.trim());

    const commerce = await createCommerceRecord(tx, {
      ownerUserId: owner.id,
      cityId: city.id,
      categoryId: category.id,
      name: input.commerceName.trim(),
      slug,
      shortDescription,
      description,
      address: input.address.trim(),
      phone,
      instagram,
      status: "PENDING",
    });

    return {
      owner,
      commerce,
    };
  });

  const verificationToken = await issueEmailVerificationToken(result.owner.id);
  const verification = await sendEmailVerificationEmail({
    email: result.owner.email,
    fullName: result.owner.fullName,
    token: verificationToken,
  });

  void sendWelcomeEmail({
    email: result.owner.email,
    fullName: result.owner.fullName,
    role: "COMMERCE",
  }).catch((error) =>
    logWarn(undefined, "No pudimos enviar el email de bienvenida al comercio", {
      userId: result.owner.id,
      email: result.owner.email,
      error,
    }),
  );

  await createAppNotification({
    userId: result.owner.id,
    type: AppNotificationType.COMMERCE_PENDING,
    title: "Alta de comercio recibida",
    body: `Recibimos la solicitud de ${result.commerce.name}. Ya puedes entrar al panel mientras el equipo revisa el alta.`,
    data: {
      commerceId: result.commerce.id,
      commerceSlug: result.commerce.slug,
      commerceStatus: result.commerce.status,
      webPath: buildWebPanelPath("/commerce/profile"),
    },
  });

  publishRealtimeEvent({
    type: "commerce.updated",
    targetRoles: ["ADMIN", "COMMERCE"],
    commerceOwnerUserId: result.owner.id,
    payload: {
      commerceId: result.commerce.id,
      commerceName: result.commerce.name,
      commerceSlug: result.commerce.slug,
      status: result.commerce.status,
      createdBy: "register-commerce",
    },
  });

  return {
    user: publicUser(result.owner),
    commerce: result.commerce,
    verification,
  };
}

export async function loginUser(input: {
  email: string;
  password: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const email = normalizeEmail(input.email);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  const validPassword = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !validPassword) {
    throw new ServiceError("Credenciales invalidas", 401);
  }

  ensureActiveUser(user);

  const tokens = await createSessionTokens({
    user,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  return {
    ...tokens,
    user: publicUser(user),
  };
}

export async function refreshUserSession(input: { refreshToken: string }) {
  const payload = verifyRefreshToken(input.refreshToken);

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });

  if (!session) {
    throw new ServiceError(AUTH_REFRESH_INVALID_MESSAGE, 401);
  }

  const validRefreshToken = await verifyStoredRefreshToken(
    input.refreshToken,
    session.refreshTokenHash,
  );

  if (!validRefreshToken) {
    throw new ServiceError(AUTH_REFRESH_INVALID_MESSAGE, 401);
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.deleteMany({
      where: {
        id: session.id,
        refreshTokenHash: session.refreshTokenHash,
      },
    });

    throw new ServiceError(AUTH_REFRESH_INVALID_MESSAGE, 401);
  }

  ensureActiveUser(session.user);

  if (payload.sessionVersion !== session.user.sessionVersion) {
    await prisma.session.deleteMany({
      where: {
        id: session.id,
        refreshTokenHash: session.refreshTokenHash,
      },
    });

    throw new ServiceError(AUTH_REFRESH_INVALID_MESSAGE, 401);
  }

  const accessToken = signAccessToken({
    userId: session.user.id,
    role: session.user.role,
    sessionId: session.id,
    sessionVersion: session.user.sessionVersion,
  });

  const refreshToken = signRefreshToken({
    userId: session.user.id,
    role: session.user.role,
    sessionId: session.id,
    sessionVersion: session.user.sessionVersion,
    tokenId: randomUUID(),
  });

  const refreshTokenHash = await hashRefreshToken(refreshToken);

  const rotation = await prisma.session.updateMany({
    where: {
      id: session.id,
      refreshTokenHash: session.refreshTokenHash,
      expiresAt: { gte: new Date() },
    },
    data: {
      refreshTokenHash,
      expiresAt: getRefreshExpiresAt(),
      lastUsedAt: new Date(),
    },
  });

  if (rotation.count !== 1) {
    throw new ServiceError(AUTH_REFRESH_INVALID_MESSAGE, 401);
  }

  return {
    accessToken,
    refreshToken,
    user: publicUser(session.user),
  };
}

export async function logoutUserSession(input: { refreshToken?: string }) {
  const refreshToken = cleanText(input.refreshToken);

  if (!refreshToken) {
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      select: { id: true, refreshTokenHash: true },
    });

    if (!session || !(await verifyStoredRefreshToken(refreshToken, session.refreshTokenHash))) {
      return;
    }

    await prisma.session.deleteMany({
      where: {
        id: session.id,
        refreshTokenHash: session.refreshTokenHash,
      },
    });
  } catch {
    // Mantenemos logout idempotente y silencioso.
  }
}

export async function requestEmailVerification(input: { email: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (!user || user.emailVerifiedAt) {
    return {
      sent: true,
    };
  }

  const token = await issueEmailVerificationToken(user.id);
  const verification = await sendEmailVerificationEmail({
    email: user.email,
    token,
  });

  return {
    sent: true,
    verification,
  };
}

export async function verifyEmailAddress(input: { token: string }) {
  const tokenHash = buildOpaqueTokenFingerprint(input.token);

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: {
        gt: new Date(),
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
    },
  });

  if (!user) {
    throw new ServiceError("El enlace de verificacion no es valido o ya vencio", 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
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
    },
  });

  return {
    user: publicUser(updatedUser),
  };
}

export async function requestPasswordReset(input: { email: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  if (!user) {
    return {
      sent: true,
    };
  }

  const token = await issuePasswordResetToken(user.id);
  const reset = await sendPasswordResetEmail({
    email: user.email,
    fullName: user.fullName,
    token,
  });

  return {
    sent: true,
    reset,
  };
}

export async function resetUserPassword(input: { token: string; password: string }) {
  const password = newPasswordSchema.parse(input.password);
  const tokenHash = buildOpaqueTokenFingerprint(input.token);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new ServiceError("El enlace para recuperar la contrasena no es valido o ya vencio", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        sessionVersion: {
          increment: 1,
        },
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    }),
    prisma.session.deleteMany({
      where: {
        userId: user.id,
      },
    }),
  ]);

  return {
    reset: true,
  };
}
