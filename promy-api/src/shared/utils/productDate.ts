import { env } from "../../config/env";

const productDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: env.PROMOTION_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function partsForProductDate(value: Date) {
  const parts = productDateFormatter.formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return { year: read("year"), month: read("month"), day: read("day") };
}

export function getProductDateKey(value = new Date()) {
  const { year, month, day } = partsForProductDate(value);
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

/** A calendar key stored in MySQL DATE. It is never an event timestamp. */
export function productDateKeyToDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

export function productDateToKey(value: Date) {
  return `${value.getUTCFullYear().toString().padStart(4, "0")}-${(value.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${value.getUTCDate().toString().padStart(2, "0")}`;
}

export function addProductDays(value: string, days: number) {
  const date = productDateKeyToDate(value);
  if (!date) throw new Error("Fecha de producto invalida");
  date.setUTCDate(date.getUTCDate() + days);
  return productDateToKey(date);
}

export function getProductDateKeys(from: string, to: string) {
  const keys: string[] = [];
  for (let current = from; current <= to; current = addProductDays(current, 1)) keys.push(current);
  return keys;
}
