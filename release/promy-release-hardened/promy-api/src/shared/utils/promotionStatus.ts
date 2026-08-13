import { Prisma, PromotionStatus, Weekday } from "@prisma/client";
import { env } from "../../config/env";

export const PUBLIC_PROMOTION_STATUS = PromotionStatus.APPROVED_VISIBLE;

export type PromotionScheduleWindow = {
  weekday: Weekday | string;
  startTime: string;
  endTime: string;
};

export type PromotionAvailabilityWindow = {
  status?: PromotionStatus | string | null;
  startDate: Date | null;
  endDate: Date | null;
  startTime?: string | null;
  endTime?: string | null;
  schedules?: PromotionScheduleWindow[] | null;
};

const weekdayByLabel: Record<string, Weekday> = {
  Sunday: Weekday.SUNDAY,
  Monday: Weekday.MONDAY,
  Tuesday: Weekday.TUESDAY,
  Wednesday: Weekday.WEDNESDAY,
  Thursday: Weekday.THURSDAY,
  Friday: Weekday.FRIDAY,
  Saturday: Weekday.SATURDAY,
};

const promotionClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: env.PROMOTION_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "long",
});

function getPromotionLocalTimeParts(now = new Date()) {
  const parts = promotionClockFormatter.formatToParts(now);
  const weekdayLabel = parts.find((part) => part.type === "weekday")?.value ?? "Sunday";
  const hourValue = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minuteValue = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return {
    weekday: weekdayByLabel[weekdayLabel] ?? Weekday.SUNDAY,
    hour: Number.isFinite(hourValue) ? hourValue : 0,
    minute: Number.isFinite(minuteValue) ? minuteValue : 0,
  };
}

export function buildPublicPromotionWhere(now = new Date()): Prisma.PromotionWhereInput {
  return {
    status: PUBLIC_PROMOTION_STATUS,
    isHiddenByAdmin: false,
    commerce: {
      is: {
        isHiddenByAdmin: false,
      },
    },
    AND: [
      {
        OR: [{ startDate: null }, { startDate: { lte: now } }],
      },
      {
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    ],
  };
}

export function parsePromotionTimeToMinutes(value?: string | null) {
  if (!value || !value.includes(":")) {
    return null;
  }

  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function isCurrentTimeWithinPromotionWindow(
  promotion: Pick<PromotionAvailabilityWindow, "startTime" | "endTime">,
  now = new Date(),
) {
  const startMinutes = parsePromotionTimeToMinutes(promotion.startTime);
  const endMinutes = parsePromotionTimeToMinutes(promotion.endTime);

  if (startMinutes == null && endMinutes == null) {
    return true;
  }

  const { hour, minute } = getPromotionLocalTimeParts(now);
  const currentMinutes = hour * 60 + minute;

  if (startMinutes != null && endMinutes != null) {
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  if (startMinutes != null) {
    return currentMinutes >= startMinutes;
  }

  return currentMinutes <= endMinutes!;
}

export function getWeekdayFromDate(now = new Date()): Weekday {
  return getPromotionLocalTimeParts(now).weekday;
}

export function normalizePromotionSchedules(
  schedules?: PromotionScheduleWindow[] | null,
): PromotionScheduleWindow[] {
  if (!Array.isArray(schedules) || schedules.length === 0) {
    return [];
  }

  return schedules
    .filter((schedule) => Boolean(schedule))
    .map((schedule) => ({
      weekday: schedule.weekday,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    }));
}

export function isPromotionScheduleActiveNow(
  schedule: PromotionScheduleWindow,
  now = new Date(),
) {
  const currentWeekday = getWeekdayFromDate(now);

  if (schedule.weekday !== currentWeekday) {
    return false;
  }

  return isCurrentTimeWithinPromotionWindow(schedule, now);
}

export function hasPromotionSchedules(
  promotion: Pick<PromotionAvailabilityWindow, "schedules">,
) {
  return normalizePromotionSchedules(promotion.schedules).length > 0;
}

export function isPromotionCurrentlyAvailable(
  promotion: Pick<
    PromotionAvailabilityWindow,
    "startDate" | "endDate" | "startTime" | "endTime" | "schedules"
  >,
  now = new Date(),
) {
  if (promotion.startDate && now < promotion.startDate) {
    return false;
  }

  if (promotion.endDate && now > promotion.endDate) {
    return false;
  }

  const schedules = normalizePromotionSchedules(promotion.schedules);

  if (schedules.length > 0) {
    return schedules.some((schedule) => isPromotionScheduleActiveNow(schedule, now));
  }

  return isCurrentTimeWithinPromotionWindow(promotion, now);
}

export function isPromotionPubliclyVisibleNow(
  promotion: PromotionAvailabilityWindow,
  now = new Date(),
) {
  return (
    promotion.status === PUBLIC_PROMOTION_STATUS &&
    isPromotionCurrentlyAvailable(promotion, now)
  );
}

export function filterPublicPromotionsVisibleNow<T extends PromotionAvailabilityWindow>(
  promotions: T[],
  now = new Date(),
) {
  return promotions.filter((promotion) => isPromotionPubliclyVisibleNow(promotion, now));
}
