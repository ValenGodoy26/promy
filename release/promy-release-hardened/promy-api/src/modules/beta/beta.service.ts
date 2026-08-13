import { z } from "zod";
import prisma from "../../config/prisma";
import { logOperationalEvent, logWarn } from "../../shared/logging/logger";
import { sendTransactionalEmail } from "../../shared/services/email.service";

export const createBetaAccessRequestSchema = z.object({
  email: z.string().trim().email("Email invalido").max(120, "Email demasiado largo"),
  city: z
    .string()
    .trim()
    .max(80, "Ciudad demasiado larga")
    .optional()
    .transform((value) => (value ? value : undefined)),
  platform: z.enum(["IPHONE", "ANDROID"]),
  source: z
    .string()
    .trim()
    .max(40, "Origen demasiado largo")
    .optional()
    .transform((value) => (value ? value : "landing")),
});

export const adminBetaAccessRequestsQuerySchema = z.object({
  platform: z.enum(["IPHONE", "ANDROID"]).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).max(9999).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

function getPlatformLabel(platform: "IPHONE" | "ANDROID") {
  return platform === "IPHONE" ? "iPhone" : "Android";
}

async function sendBetaAccessConfirmationEmail(params: {
  email: string;
  city: string | null;
  platform: "IPHONE" | "ANDROID";
}) {
  const platformLabel = getPlatformLabel(params.platform);
  const cityLine = params.city ? `Ciudad registrada: ${params.city}.` : "";

  await sendTransactionalEmail({
    to: params.email,
    subject: "Recibimos tu pedido para la beta de PROMY",
    text: [
      "Hola,",
      "",
      `Ya guardamos tu pedido para acceder a la beta de PROMY en ${platformLabel}.`,
      cityLine,
      "",
      "Cuando abramos nuevos cupos para tu plataforma te vamos a avisar por este medio.",
      "",
      "Si no hiciste esta solicitud, puedes ignorar este mensaje.",
      "",
      "Equipo PROMY",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #1a1a1a; line-height: 1.6;">
        <p>Hola,</p>
        <p>Ya guardamos tu pedido para acceder a la beta de <strong>PROMY</strong> en <strong>${platformLabel}</strong>.</p>
        ${params.city ? `<p><strong>Ciudad registrada:</strong> ${params.city}</p>` : ""}
        <p>Cuando abramos nuevos cupos para tu plataforma te vamos a avisar por este medio.</p>
        <p>Si no hiciste esta solicitud, puedes ignorar este mensaje.</p>
        <p>Equipo PROMY</p>
      </div>
    `,
  });
}

export async function createBetaAccessRequest(input: z.infer<typeof createBetaAccessRequestSchema>) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedCity = input.city?.trim() || null;
  const normalizedSource = input.source?.trim() || "landing";

  const request = await (prisma as any).betaAccessRequest.upsert({
    where: {
      email_platform: {
        email: normalizedEmail,
        platform: input.platform,
      },
    },
    update: {
      city: normalizedCity,
      source: normalizedSource,
    },
      create: {
      email: normalizedEmail,
      city: normalizedCity,
      platform: input.platform,
      source: normalizedSource,
    },
  });

  logOperationalEvent(undefined, "beta_access_request_upserted", {
    email: normalizedEmail,
    platform: input.platform,
    source: normalizedSource,
    city: normalizedCity,
    requestId: null,
  }, "info");

  try {
    await sendBetaAccessConfirmationEmail({
      email: normalizedEmail,
      city: normalizedCity,
      platform: input.platform,
    });
  } catch (error) {
    logWarn(undefined, "No pudimos enviar la confirmacion de beta access", {
      email: normalizedEmail,
      platform: input.platform,
      city: normalizedCity,
      error,
    });
  }

  return {
    request,
    message:
      "Listo. Guardamos tu pedido de acceso y te vamos a avisar cuando abramos nuevos cupos.",
  };
}

export async function listAdminBetaAccessRequests(
  input: z.infer<typeof adminBetaAccessRequestsQuerySchema>,
) {
  const page = input.page ?? 1;
  const limit = input.limit ?? 25;
  const skip = (page - 1) * limit;
  const search = input.search?.trim().toLowerCase();

  const where = {
    ...(input.platform ? { platform: input.platform } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search } },
            { city: { contains: search } },
            { source: { contains: search } },
          ],
        }
      : {}),
  };

  const [total, requests] = await Promise.all([
    (prisma as any).betaAccessRequest.count({ where }),
    (prisma as any).betaAccessRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: limit,
    }),
  ]);

  return {
    total,
    page,
    limit,
    requests,
  };
}
