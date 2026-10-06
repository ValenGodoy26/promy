import type { AdminBillingSettings, BillingMode } from "../../types/api";

const maximumMonthlyPrice = 9_999_999_999.99;

export function getBillingModePresentation(mode: BillingMode) {
  if (mode === "ON") return { label: "Activo", tone: "success" as const, description: "Los comercios alcanzados por la política vigente pueden iniciar su suscripción." };
  if (mode === "SCHEDULED") return { label: "Programado", tone: "warning" as const, description: "Los comercios continúan con acceso beta hasta la fecha programada." };
  return { label: "Desactivado", tone: "neutral" as const, description: "Los comercios continúan con acceso beta y no se realizan cobros." };
}

export function formatBillingMoney(value: string | number | null | undefined, currency?: string | null) {
  if (value === null || value === undefined || value === "") return "No configurado";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "No configurado";
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: currency || "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency || ""}`.trim();
  }
}

export function parseMonthlyPrice(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return { value: null, error: "Ingresá un precio mensual." };
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return { value: null, error: "Ingresá un monto válido de hasta dos decimales." };
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > maximumMonthlyPrice) return { value: null, error: "Ingresá un precio positivo dentro del límite permitido." };
  return { value: amount, error: null };
}

export function toLocalDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function getMercadoPagoPlanPresentation(settings: Pick<AdminBillingSettings, "mercadoPagoPlanId">) {
  if (!settings.mercadoPagoPlanId) return { label: "No configurado", planId: "No configurado" };
  const id = settings.mercadoPagoPlanId;
  return { label: "Plan asociado", planId: id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id };
}
