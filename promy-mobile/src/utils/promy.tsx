import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  ApiCategory,
  ApiCommerce,
  ApiPromotion,
  CommerceStatus,
  FeedPromotion,
  ValidationMethod,
  Weekday,
} from "../types/api";
import { theme } from "../styles/theme";

export const DEFAULT_LAT = -31.3929;
export const DEFAULT_LNG = -58.0209;

const PLACEHOLDER_DOMAINS = ["placehold.co", "via.placeholder.com"];

type CategoryVisual = {
  tint: string;
  icon: React.ReactNode;
};

export function getUserFirstName(fullName?: string | null) {
  if (!fullName) return "PROMY";
  return fullName.trim().split(/\s+/)[0] || "PROMY";
}

export function getCategoryVisual(name?: string | null): CategoryVisual {
  const normalized = (name || "").toLowerCase();

  if (normalized.includes("gastro") || normalized.includes("resto")) {
    return {
      tint: "#FFE8E6",
      icon: (
        <MaterialCommunityIcons
          name="silverware-fork-knife"
          size={24}
          color={theme.colors.accentRed}
        />
      ),
    };
  }

  if (normalized.includes("cafe")) {
    return {
      tint: "#FFF1DD",
      icon: <MaterialCommunityIcons name="coffee-outline" size={24} color="#B86A1B" />,
    };
  }

  if (normalized.includes("gym") || normalized.includes("gim")) {
    return {
      tint: "#E8F1FF",
      icon: <MaterialCommunityIcons name="dumbbell" size={24} color="#2F80ED" />,
    };
  }

  if (normalized.includes("helad")) {
    return {
      tint: "#FFF6D9",
      icon: <MaterialCommunityIcons name="ice-cream" size={24} color="#E7A400" />,
    };
  }

  if (normalized.includes("retail") || normalized.includes("tienda")) {
    return {
      tint: "#E6FAEC",
      icon: <MaterialCommunityIcons name="shopping-outline" size={24} color="#24A865" />,
    };
  }

  if (normalized.includes("servicio")) {
    return {
      tint: "#F2E8FF",
      icon: <Feather name="tag" size={22} color="#8D4DE8" />,
    };
  }

  if (normalized.includes("bar") || normalized.includes("cerve")) {
    return {
      tint: "#FFF0E7",
      icon: <MaterialCommunityIcons name="glass-cocktail" size={24} color="#FF8A30" />,
    };
  }

  if (normalized.includes("estet") || normalized.includes("belle") || normalized.includes("pelu")) {
    return {
      tint: "#FFE8F5",
      icon: <Feather name="scissors" size={22} color="#E252A0" />,
    };
  }

  return {
    tint: "#F5F1E8",
    icon: <Feather name="tag" size={22} color={theme.colors.textMuted} />,
  };
}

export function flattenCommercesToPromotions(commerces: ApiCommerce[]): FeedPromotion[] {
  return commerces
    .filter((commerce) => !commerce.status || commerce.status === "APPROVED")
    .flatMap((commerce) =>
      (commerce.promotions || [])
        .filter((promotion) => !promotion.status || promotion.status === "APPROVED_VISIBLE")
        .map((promotion) => ({
          ...promotion,
          commerce,
          categoryName: commerce.category?.name,
          cityName: commerce.city?.name,
          distanceKm: getDistanceFromDefault(commerce.latitude, commerce.longitude),
        })),
    );
}

export function getDistanceFromDefault(
  latitude?: number | null,
  longitude?: number | null,
): number | null {
  if (latitude == null || longitude == null) return null;

  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(latitude - DEFAULT_LAT);
  const dLng = toRad(longitude - DEFAULT_LNG);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(DEFAULT_LAT)) *
      Math.cos(toRad(latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function getCommerceDistance(commerce: ApiCommerce) {
  return getDistanceFromDefault(commerce.latitude, commerce.longitude);
}

export function formatDistance(distanceKm?: number | null) {
  if (distanceKm == null) return undefined;
  if (distanceKm < 1) return `${Math.max(distanceKm, 0.1).toFixed(1)} km`;
  return `${distanceKm.toFixed(1)} km`;
}

export function hasUsableRemoteImage(url?: string | null) {
  if (!url) return false;
  const value = url.trim();
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return !PLACEHOLDER_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function getPromotionImage(promotion: ApiPromotion, commerce?: ApiCommerce) {
  const candidates = [promotion.imageUrl, commerce?.coverUrl, commerce?.logoUrl];
  return candidates.find((candidate) => hasUsableRemoteImage(candidate)) || null;
}

export function getCommerceImage(commerce: ApiCommerce) {
  return [commerce.coverUrl, commerce.logoUrl].find((candidate) => hasUsableRemoteImage(candidate)) || null;
}

export function getPromotionSecondaryText(promotion: ApiPromotion) {
  return (
    promotion.conditions ||
    promotion.description ||
    buildPromotionTimingV2(promotion) ||
    "Promo disponible por tiempo limitado"
  );
}

export function buildPromotionTiming(promotion: ApiPromotion) {
  if (promotion.schedules?.length) {
    return promotion.schedules
      .map((schedule) => {
        const label = weekdayLabels[schedule.weekday as Weekday] || schedule.weekday;
        return `${label} ${schedule.startTime}-${schedule.endTime}`;
      })
      .join(" · ");
  }

  const hasStart = Boolean(promotion.startTime);
  const hasEnd = Boolean(promotion.endTime);

  if (hasStart && hasEnd) {
    return `${promotion.startTime} a ${promotion.endTime}`;
  }

  if (hasStart) return `Desde ${promotion.startTime}`;
  if (hasEnd) return `Hasta ${promotion.endTime}`;
  return undefined;
}

const weekdayLabels: Record<Weekday, string> = {
  MONDAY: "Lun",
  TUESDAY: "Mar",
  WEDNESDAY: "Mie",
  THURSDAY: "Jue",
  FRIDAY: "Vie",
  SATURDAY: "Sab",
  SUNDAY: "Dom",
};

const weekdayOrder: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function formatGroupedWeekdays(days: Weekday[]) {
  const sorted = [...days].sort(
    (left, right) => weekdayOrder.indexOf(left) - weekdayOrder.indexOf(right),
  );

  if (sorted.length === weekdayOrder.length) {
    return "Todos los dias";
  }

  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let previous = sorted[0];

  for (let index = 1; index <= sorted.length; index += 1) {
    const current = sorted[index];
    const previousOrder = weekdayOrder.indexOf(previous);
    const currentOrder = current ? weekdayOrder.indexOf(current) : -1;
    const isContiguous = current && currentOrder === previousOrder + 1;

    if (isContiguous) {
      previous = current;
      continue;
    }

    ranges.push(
      rangeStart === previous
        ? weekdayLabels[rangeStart]
        : `${weekdayLabels[rangeStart]} a ${weekdayLabels[previous]}`,
    );

    if (current) {
      rangeStart = current;
      previous = current;
    }
  }

  return ranges.join(" y ");
}

function summarizeSchedules(
  schedules?: ApiPromotion["schedules"] | null,
) {
  if (!schedules?.length) return null;

  const grouped = new Map<string, Weekday[]>();

  schedules.forEach((schedule) => {
    const key = `${schedule.startTime}|${schedule.endTime}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(schedule.weekday as Weekday);
    grouped.set(key, bucket);
  });

  return [...grouped.entries()]
    .sort(([leftTimeKey, leftDays], [rightTimeKey, rightDays]) => {
      const leftOrder = Math.min(...leftDays.map((day) => weekdayOrder.indexOf(day)));
      const rightOrder = Math.min(...rightDays.map((day) => weekdayOrder.indexOf(day)));

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return leftTimeKey.localeCompare(rightTimeKey);
    })
    .map(([timeKey, days]) => {
      const [startTime, endTime] = timeKey.split("|");
      return `${formatGroupedWeekdays(days)} · ${startTime} a ${endTime}`;
    })
    .join(" / ");
}

function buildPromotionTimingV2(promotion: ApiPromotion) {
  return summarizeSchedules(promotion.schedules) || buildPromotionTiming(promotion);
}

export function getPromotionScheduleSummary(promotion: ApiPromotion) {
  const timing = buildPromotionTiming(promotion);
  const dateRange =
    promotion.startDate && promotion.endDate
      ? `${formatShortDateLabel(promotion.startDate)} al ${formatShortDateLabel(promotion.endDate)}`
      : promotion.startDate
      ? `Desde ${formatShortDateLabel(promotion.startDate)}`
      : promotion.endDate
      ? `Hasta ${formatShortDateLabel(promotion.endDate)}`
      : null;

  if (dateRange && timing) return `${dateRange} · ${timing}`;
  return dateRange || timing || "Sin horario definido";
}

export function getPromotionCapSummary(promotion: Pick<ApiPromotion, "maxRedemptions"> & { successRedemptionsCount?: number | null }) {
  if (typeof promotion.maxRedemptions !== "number") return "Sin cupo";
  const used = typeof promotion.successRedemptionsCount === "number" ? promotion.successRedemptionsCount : 0;
  return `${used}/${promotion.maxRedemptions} canjes usados`;
}

export function getPromotionScheduleSummaryV2(promotion: ApiPromotion) {
  const scheduleSummary = promotion.schedules?.length
    ? promotion.schedules
        .map((schedule) => {
          const label = weekdayLabels[schedule.weekday as Weekday] || schedule.weekday;
          return `${label} ${schedule.startTime}-${schedule.endTime}`;
        })
        .join(" · ")
    : null;

  const legacySummary = getPromotionScheduleSummary(promotion);

  if (scheduleSummary && promotion.startDate && promotion.endDate) {
    return `${formatShortDateLabel(promotion.startDate)} al ${formatShortDateLabel(promotion.endDate)} · ${scheduleSummary}`;
  }

  return scheduleSummary || legacySummary;
}

export function getPromotionScheduleSummaryV3(promotion: ApiPromotion) {
  const scheduleSummary = summarizeSchedules(promotion.schedules);
  const legacySummary = getPromotionScheduleSummary(promotion);

  if (scheduleSummary && promotion.startDate && promotion.endDate) {
    return `${formatShortDateLabel(promotion.startDate)} al ${formatShortDateLabel(promotion.endDate)} · ${scheduleSummary}`;
  }

  return scheduleSummary || legacySummary;
}

function formatShortDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

export function getNormalizedDiscountValue(promotion: ApiPromotion) {
  if (promotion.promotionType !== "PERCENTAGE") return null;
  const raw = promotion.discountValue;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw >= 1 && raw <= 95) return Math.round(raw);
  return null;
}

export function getPromotionBadgeLabel(promotion: ApiPromotion) {
  const safeDiscount = getNormalizedDiscountValue(promotion);
  if (safeDiscount != null) return `-${safeDiscount}%`;

  if (promotion.promotionType === "SPECIAL_COMBO") return "COMBO";
  if (promotion.promotionType === "FIXED_AMOUNT") return "AHORRO";
  if (promotion.promotionType === "TIME_SLOT") return "HORARIO";
  if (promotion.promotionType === "DAY_PROMO") return "DIA";
  return "PROMO";
}

export function getPromotionHot(promotion: ApiPromotion) {
  const safeDiscount = getNormalizedDiscountValue(promotion);
  if (safeDiscount != null) return safeDiscount >= 25;
  return promotion.promotionType === "SPECIAL_COMBO";
}

export function getPromoMetricText(promotion: ApiPromotion) {
  const safeDiscount = getNormalizedDiscountValue(promotion);
  if (safeDiscount != null) return `${safeDiscount}% OFF`;
  if (promotion.promotionType === "SPECIAL_COMBO") return "Combo especial";
  if (promotion.promotionType === "FIXED_AMOUNT") return "Monto fijo";
  if (promotion.promotionType === "BENEFIT") return "Beneficio puntual";
  return "Promo activa";
}

export function getPromoValueCaption(promotion: ApiPromotion) {
  const safeDiscount = getNormalizedDiscountValue(promotion);
  if (safeDiscount != null) return "Ahorro directo";
  if (promotion.promotionType === "SPECIAL_COMBO") return "Beneficio combinado";
  if (promotion.promotionType === "FIXED_AMOUNT") return "Monto final especial";
  if (promotion.promotionType === "BENEFIT") return "Beneficio disponible";
  return "Beneficio disponible";
}

export function getValidationMethodLabel(method?: ValidationMethod | null) {
  if (method === "MANUAL_CODE") return "Codigo manual";
  if (method === "QR") return "QR";
  return "Validacion";
}

export function getCommerceHeadline(commerce: ApiCommerce) {
  return commerce.shortDescription || commerce.description || "Descubri promos activas en este local";
}

export function sortPromotionsByRelevance(promotions: FeedPromotion[]) {
  return [...promotions].sort((a, b) => {
    const discountA = getNormalizedDiscountValue(a) || 0;
    const discountB = getNormalizedDiscountValue(b) || 0;
    if (discountB !== discountA) return discountB - discountA;
    return a.title.localeCompare(b.title);
  });
}

export function sortCommercesByPromotionCount(commerces: ApiCommerce[]) {
  return [...commerces].sort((a, b) => (b.promotions?.length || 0) - (a.promotions?.length || 0));
}

export function pickFeaturedPromotion(promotions: FeedPromotion[]) {
  return sortPromotionsByRelevance(promotions)[0];
}

export function formatAuthError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message || "";
    const normalized = message.toLowerCase();

    if (normalized.includes("no autenticado") || normalized.includes("sesion vencida")) {
      return "Tu sesion vencio. Volve a ingresar para seguir usando PROMY.";
    }

    if (normalized.includes("promocion no encontrada") || normalized.includes("promoci?n no encontrada")) {
      return "Esta promo ya no esta disponible. Puede haber vencido o estar inactiva.";
    }

    if (normalized.includes("no disponible en este momento")) {
      return "Esta promo no se puede usar ahora. Revisa la vigencia y el horario antes de volver a intentarlo.";
    }

    if (normalized.includes("ya usaste esta promocion") || normalized.includes("ya usaste esta promoci?n")) {
      return "Ya usaste esta promo anteriormente. Podes verla en tu historial.";
    }

    if (normalized.includes("ya tenes un canje pendiente") || normalized.includes("ya ten?s un canje pendiente")) {
      return "Ya generaste este canje. Mostra el QR o el codigo en el comercio para validarlo.";
    }

    if (
      normalized.includes("error interno al registrar el canje") ||
      normalized.includes("error interno al validar el canje")
    ) {
      return "No pudimos completar el canje en este momento. Proba nuevamente en unos segundos.";
    }

    if (
      normalized.includes("necesitas verificar el email") ||
      normalized.includes("necesit?s verificar el email") ||
      normalized.includes("email_not_verified")
    ) {
      return "Primero verifica tu email para poder generar canjes. Revisa tu casilla o solicita un nuevo enlace de verificacion.";
    }

    if (normalized.includes("conexion") || normalized.includes("conexi?n")) {
      return "No pudimos conectar con PROMY en este momento. Revisa tu conexion e intenta de nuevo.";
    }

    return message;
  }

  return "No pudimos completar la accion. Proba nuevamente.";
}

export function getPromotionAvailabilityState(promotion?: ApiPromotion | null) {
  if (!promotion) return "available" as const;

  if (
    promotion.status &&
    promotion.status !== "APPROVED_VISIBLE" &&
    promotion.status !== "EXPIRED"
  ) {
    return "inactive" as const;
  }
  if (promotion.status === "EXPIRED") return "expired" as const;

  const now = new Date();

  if (promotion.startDate) {
    const startsAt = new Date(promotion.startDate);
    if (!Number.isNaN(startsAt.getTime()) && startsAt.getTime() > now.getTime()) {
      return "upcoming" as const;
    }
  }

  if (promotion.endDate) {
    const endsAt = new Date(promotion.endDate);
    if (!Number.isNaN(endsAt.getTime()) && endsAt.getTime() < now.getTime()) {
      return "expired" as const;
    }
  }

  const currentWeekday = ([
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ] as const)[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const parseMinutes = (value?: string | null) => {
    if (!value || !value.includes(":")) return null;
    const [hoursRaw, minutesRaw] = value.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };

  const startMinutes = parseMinutes(promotion.startTime);
  const endMinutes = parseMinutes(promotion.endTime);

  if (promotion.schedules?.length) {
    const matchingSchedules = promotion.schedules.filter(
      (schedule) => schedule.weekday === currentWeekday,
    );

    if (!matchingSchedules.length) {
      return "upcoming" as const;
    }

    const isActiveInAnySchedule = matchingSchedules.some((schedule) => {
      const start = parseMinutes(schedule.startTime);
      const end = parseMinutes(schedule.endTime);

      if (start == null || end == null) return false;
      return currentMinutes >= start && currentMinutes <= end;
    });

    return isActiveInAnySchedule ? ("available" as const) : ("upcoming" as const);
  }

  if (startMinutes != null && currentMinutes < startMinutes) {
    return "upcoming" as const;
  }

  if (endMinutes != null && currentMinutes > endMinutes) {
    return "expired" as const;
  }

  return "available" as const;
}

export function getPromotionAvailabilityMessage(promotion?: ApiPromotion | null) {
  const state = getPromotionAvailabilityState(promotion);

  if (state === "inactive") {
    return "Esta promo esta inactiva por ahora. Volve mas tarde o explora otros beneficios.";
  }

  if (state === "expired") {
    return "Esta promo ya vencio o salio de horario. Explora otras opciones activas cerca tuyo.";
  }

  if (state === "upcoming") {
    return "Esta promo todavia no esta disponible. Revisa la vigencia o el horario antes de generar el canje.";
  }

  return null;
}

export function getCommerceStatusLabel(status?: CommerceStatus | null) {
  if (status === "APPROVED") return "Aprobado";
  if (status === "INACTIVE") return "Inactivo";
  if (status === "REJECTED") return "Rechazado";
  return "Pendiente";
}

export function getCommerceStatusTone(status?: CommerceStatus | null) {
  if (status === "APPROVED") return "success" as const;
  if (status === "INACTIVE") return "ghost" as const;
  if (status === "REJECTED") return "red" as const;
  return "yellow" as const;
}

export function buildCategoryOptions(categories: ApiCategory[]) {
  return categories.slice(0, 6).map((category) => ({
    ...category,
    ...getCategoryVisual(category.name),
  }));
}



