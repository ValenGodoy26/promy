import { createHmac } from "crypto";
import { PromotionAnalyticsEventType, Prisma, RedemptionStatus } from "@prisma/client";
import { z } from "zod";
import prisma from "../../config/prisma";
import { env } from "../../config/env";
import { buildPublicPromotionWhere, isPromotionPubliclyVisibleNow } from "../../shared/utils/promotionStatus";
import { addProductDays, getProductDateKey, getProductDateKeys, productDateKeyToDate, productDateToKey } from "../../shared/utils/productDate";

const RECEIPT_RETENTION_MS = 48 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const MAX_CUSTOM_RANGE_DAYS = 366;

const eventSchema = z.object({
  promotionId: z.number().int().positive(),
  type: z.enum([PromotionAnalyticsEventType.IMPRESSION, PromotionAnalyticsEventType.OPEN]),
}).strict();

export const promotionAnalyticsEventsSchema = z.object({
  sessionId: z.string().uuid(),
  events: z.array(eventSchema).min(1).max(10),
}).strict();

export const commerceStatisticsQuerySchema = z.object({
  range: z.enum(["today", "7d", "30d", "custom"]).default("30d"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.range !== "custom") {
    if (value.from || value.to) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El rango elegido no acepta fechas manuales" });
    return;
  }
  const from = value.from ? productDateKeyToDate(value.from) : null;
  const to = value.to ? productDateKeyToDate(value.to) : null;
  if (!from || !to) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El rango personalizado requiere fechas validas" });
  } else if (from > to) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "La fecha inicial no puede ser posterior a la final" });
  } else if (Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1 > MAX_CUSTOM_RANGE_DAYS) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "El rango personalizado no puede superar 366 dias" });
  }
});

type AnalyticsEventInput = z.infer<typeof promotionAnalyticsEventsSchema>;
type StatisticsRangeInput = z.infer<typeof commerceStatisticsQuerySchema>;

function buildDedupeKey(sessionId: string, promotionId: number, eventType: PromotionAnalyticsEventType) {
  return createHmac("sha256", env.ANALYTICS_HMAC_SECRET).update(`${sessionId}:${promotionId}:${eventType}`).digest("hex");
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function getStatisticsRange(input: StatisticsRangeInput, now = new Date()) {
  const today = getProductDateKey(now);
  if (input.range === "today") return { preset: input.range, from: today, to: today };
  if (input.range === "7d") return { preset: input.range, from: addProductDays(today, -6), to: today };
  if (input.range === "30d") return { preset: input.range, from: addProductDays(today, -29), to: today };
  return { preset: input.range, from: input.from!, to: input.to! };
}

function rate(numerator: number | null, denominator: number | null) {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

/** The unique receipt is claimed and the aggregate incremented in one transaction. */
export async function ingestPromotionAnalyticsEvents(input: AnalyticsEventInput, now = new Date()) {
  const promotionIds = [...new Set(input.events.map((event) => event.promotionId))];
  const promotions = await prisma.promotion.findMany({
    where: { id: { in: promotionIds }, ...buildPublicPromotionWhere(now) },
    select: {
      id: true, commerceId: true, status: true, isHiddenByAdmin: true, startDate: true, endDate: true,
      startTime: true, endTime: true,
      schedules: { select: { weekday: true, startTime: true, endTime: true } },
      commerce: { select: { status: true, isHiddenByAdmin: true } },
    },
  });
  const eligible = new Map(promotions.filter((promotion) => isPromotionPubliclyVisibleNow(promotion, now)).map((promotion) => [promotion.id, promotion]));
  const day = productDateKeyToDate(getProductDateKey(now));
  if (!day) throw new Error("No pudimos calcular el dia de analytics");
  const expiresAt = new Date(now.getTime() + RECEIPT_RETENTION_MS);

  for (const event of input.events) {
    const promotion = eligible.get(event.promotionId);
    if (!promotion) continue;
    const dedupeKey = buildDedupeKey(input.sessionId, promotion.id, event.type);
    await prisma.$transaction(async (tx) => {
      try {
        await tx.promotionAnalyticsReceipt.create({ data: { dedupeKey, promotionId: promotion.id, eventType: event.type, expiresAt } });
      } catch (error) {
        if (isUniqueConstraintError(error)) return;
        throw error;
      }
      await tx.promotionAnalyticsDaily.upsert({
        where: { promotionId_day: { promotionId: promotion.id, day } },
        create: { promotionId: promotion.id, commerceId: promotion.commerceId, day, impressions: event.type === PromotionAnalyticsEventType.IMPRESSION ? 1 : 0, opens: event.type === PromotionAnalyticsEventType.OPEN ? 1 : 0 },
        update: event.type === PromotionAnalyticsEventType.IMPRESSION ? { impressions: { increment: 1 } } : { opens: { increment: 1 } },
      });
    });
  }
}

export async function cleanupExpiredPromotionAnalyticsReceipts(now = new Date()) {
  return prisma.promotionAnalyticsReceipt.deleteMany({ where: { expiresAt: { lte: now } } });
}

let cleanupTimer: NodeJS.Timeout | null = null;
export function startPromotionAnalyticsReceiptCleanupLoop() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => { void cleanupExpiredPromotionAnalyticsReceipts().catch(() => undefined); }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}
export function stopPromotionAnalyticsReceiptCleanupLoop() {
  if (!cleanupTimer) return;
  clearInterval(cleanupTimer);
  cleanupTimer = null;
}

function isInProductRange(value: Date | null, from: string, to: string) {
  if (!value) return false;
  const key = getProductDateKey(value);
  return key >= from && key <= to;
}

export async function getCommerceStatisticsByOwner(ownerUserId: number, input: StatisticsRangeInput, now = new Date()) {
  const commerce = await prisma.commerce.findUnique({ where: { ownerUserId }, select: { id: true } });
  if (!commerce) throw new Error("Commerce not found");
  const range = getStatisticsRange(input, now);
  const fromDate = productDateKeyToDate(range.from)!;
  const toDate = productDateKeyToDate(range.to)!;
  const paddedStart = new Date(fromDate.getTime() - 36 * 60 * 60 * 1000);
  const paddedEnd = new Date(toDate.getTime() + 36 * 60 * 60 * 1000);
  const [dataFrom, analyticsByDay, analyticsByPromotion, promotions, generatedRows, validatedRows] = await Promise.all([
    prisma.promotionAnalyticsDaily.aggregate({ _min: { day: true } }),
    prisma.promotionAnalyticsDaily.groupBy({ by: ["day"], where: { commerceId: commerce.id, day: { gte: fromDate, lte: toDate } }, _sum: { impressions: true, opens: true } }),
    prisma.promotionAnalyticsDaily.groupBy({ by: ["promotionId"], where: { commerceId: commerce.id, day: { gte: fromDate, lte: toDate } }, _sum: { impressions: true, opens: true } }),
    prisma.promotion.findMany({ where: { commerceId: commerce.id }, select: { id: true, title: true, status: true }, orderBy: { title: "asc" } }),
    prisma.redemption.findMany({ where: { commerceId: commerce.id, createdAt: { gte: paddedStart, lte: paddedEnd } }, select: { promotionId: true, createdAt: true } }),
    prisma.redemption.findMany({ where: { commerceId: commerce.id, status: RedemptionStatus.SUCCESS, redeemedAt: { gte: paddedStart, lte: paddedEnd } }, select: { promotionId: true, redeemedAt: true } }),
  ]);
  const analyticsDataFrom = dataFrom._min.day ? productDateToKey(dataFrom._min.day) : null;
  const dayMap = new Map(analyticsByDay.map((row) => [productDateToKey(row.day), { impressions: row._sum.impressions ?? 0, opens: row._sum.opens ?? 0 }]));
  const promotionMap = new Map(analyticsByPromotion.map((row) => [row.promotionId, { impressions: row._sum.impressions ?? 0, opens: row._sum.opens ?? 0 }]));
  const generatedByDay = new Map<string, number>(); const validatedByDay = new Map<string, number>();
  const generatedByPromotion = new Map<number, number>(); const validatedByPromotion = new Map<number, number>();
  for (const row of generatedRows) {
    if (!isInProductRange(row.createdAt, range.from, range.to)) continue;
    const key = getProductDateKey(row.createdAt); generatedByDay.set(key, (generatedByDay.get(key) ?? 0) + 1); generatedByPromotion.set(row.promotionId, (generatedByPromotion.get(row.promotionId) ?? 0) + 1);
  }
  for (const row of validatedRows) {
    if (!isInProductRange(row.redeemedAt, range.from, range.to)) continue;
    const key = getProductDateKey(row.redeemedAt!); validatedByDay.set(key, (validatedByDay.get(key) ?? 0) + 1); validatedByPromotion.set(row.promotionId, (validatedByPromotion.get(row.promotionId) ?? 0) + 1);
  }
  const series = getProductDateKeys(range.from, range.to).map((date) => {
    const coverage = analyticsDataFrom !== null && date >= analyticsDataFrom; const analytics = dayMap.get(date);
    return { date, impressions: coverage ? analytics?.impressions ?? 0 : null, opens: coverage ? analytics?.opens ?? 0 : null, generated: generatedByDay.get(date) ?? 0, validated: validatedByDay.get(date) ?? 0 };
  });
  const impressions = analyticsDataFrom === null ? null : series.reduce((sum, item) => sum + (item.impressions ?? 0), 0);
  const opens = analyticsDataFrom === null ? null : series.reduce((sum, item) => sum + (item.opens ?? 0), 0);
  const generatedRedemptions = series.reduce((sum, item) => sum + item.generated, 0);
  const validatedRedemptions = series.reduce((sum, item) => sum + item.validated, 0);
  return {
    timezone: env.PROMOTION_TIMEZONE, range, analyticsDataFrom,
    summary: { impressions, opens, generatedRedemptions, validatedRedemptions, openRate: rate(opens, impressions), redemptionRate: rate(generatedRedemptions, opens), finalConversion: rate(validatedRedemptions, impressions), validationRate: rate(validatedRedemptions, generatedRedemptions) },
    series,
    promotions: promotions.map((promotion) => {
      const analytics = promotionMap.get(promotion.id); const promotionImpressions = analyticsDataFrom === null ? null : analytics?.impressions ?? 0; const promotionOpens = analyticsDataFrom === null ? null : analytics?.opens ?? 0; const generated = generatedByPromotion.get(promotion.id) ?? 0; const validated = validatedByPromotion.get(promotion.id) ?? 0;
      return { promotionId: promotion.id, title: promotion.title, status: promotion.status, impressions: promotionImpressions, opens: promotionOpens, generated, validated, openRate: rate(promotionOpens, promotionImpressions), redemptionRate: rate(generated, promotionOpens), finalConversion: rate(validated, promotionImpressions), validationRate: rate(validated, generated) };
    }),
  };
}
