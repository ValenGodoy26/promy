import type { AdminBillingCommerceSubscription, AdminBillingSubscriptionFilter } from "../../types/api";

export const adminBillingSubscriptionFilters: Array<{ value: AdminBillingSubscriptionFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "BETA", label: "Beta" },
  { value: "ACTIVE", label: "Activas" },
  { value: "PENDING_PAYMENT", label: "Pendientes" },
  { value: "PAST_DUE", label: "Pago pendiente" },
  { value: "SUSPENDED", label: "Suspendidas" },
  { value: "COMPLIMENTARY", label: "Bonificadas" },
  { value: "CANCELLED", label: "Canceladas" },
];

const statusLabels: Record<string, string> = {
  BETA_FREE: "Beta",
  PENDING_PAYMENT: "Pendiente de activación",
  ACTIVE: "Activa",
  PAST_DUE: "Pago pendiente",
  SUSPENDED: "Suspendida",
  CANCELLED: "Cancelada",
  NO_COVERAGE: "Sin cobertura",
};

const coverageLabels: Record<string, string> = {
  BETA_FREE: "Beta PROMY",
  MERCADO_PAGO: "Mercado Pago",
  COMPLIMENTARY: "Bonificada",
  MANUAL: "Cobertura registrada",
};

export function getAdminBillingSubscriptionPresentation(subscription: Pick<AdminBillingCommerceSubscription, "status" | "coverageSource" | "cancelAtPeriodEnd">) {
  const sourceLabel = subscription.coverageSource ? coverageLabels[subscription.coverageSource] : null;
  const statusLabel = subscription.coverageSource === "COMPLIMENTARY"
    ? "Bonificada"
    : subscription.coverageSource === "MANUAL"
      ? "Cobertura registrada"
      : statusLabels[subscription.status] ?? "Estado no disponible";
  return {
    statusLabel,
    sourceLabel,
    cancellationLabel: subscription.cancelAtPeriodEnd ? "Cancelación programada" : null,
  };
}

export function getAdminBillingCoverageLabel(subscription: Pick<AdminBillingCommerceSubscription, "hasCoverage" | "coverageSource">) {
  if (!subscription.hasCoverage) return "Sin cobertura";
  if (subscription.coverageSource === "BETA_FREE") return "Acceso completo";
  return subscription.coverageSource ? coverageLabels[subscription.coverageSource] ?? "Acceso completo" : "Acceso completo";
}

export function formatAdminBillingDate(value: string | null | undefined) {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No disponible";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatAdminBillingProvider(value: string | null | undefined) {
  if (!value) return "No disponible";
  return value === "mercado_pago" ? "Mercado Pago" : "Proveedor registrado";
}

export function truncateOperationalId(value: string | null | undefined) {
  if (!value) return "No disponible";
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
