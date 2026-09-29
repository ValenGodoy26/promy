import type { CommerceSubscription } from "../../types/api";

type SubscriptionSnapshot = Pick<
  CommerceSubscription,
  "billingMode" | "coverageSource" | "status" | "hasCoverage" | "cancelAtPeriodEnd" | "graceEndsAt" | "needsPayment" | "monthlyPrice" | "currency"
>;

export type SubscriptionPresentation = {
  label: string;
  tone: "beta" | "success" | "warning" | "danger" | "neutral";
  heading: string;
  description: string;
};

export type SubscriptionPaymentAction = {
  label: "Activar suscripción" | "Regularizar pago";
  heading: string;
  description: string;
};

export function isBetaSubscriptionAccess(subscription: SubscriptionSnapshot) {
  return subscription.billingMode === "OFF"
    && subscription.hasCoverage
    && (subscription.coverageSource === "BETA_FREE" || subscription.status === "BETA_FREE");
}

export function shouldShowSubscriptionActionPanel(subscription: SubscriptionSnapshot) {
  return !isBetaSubscriptionAccess(subscription);
}

export function getSubscriptionPaymentAction(subscription: SubscriptionSnapshot): SubscriptionPaymentAction | null {
  if (subscription.billingMode === "OFF") return null;
  if (subscription.status === "PAST_DUE" || subscription.status === "SUSPENDED") {
    return {
      label: "Regularizar pago",
      heading: "Regularizá el acceso de tu negocio",
      description: "Actualizá el medio de pago para mantener las funciones de PROMY habilitadas.",
    };
  }
  if (subscription.needsPayment) {
    return {
      label: "Activar suscripción",
      heading: "Activá el acceso de tu negocio",
      description: "Completá el pago seguro para habilitar todas las funciones de PROMY.",
    };
  }
  return null;
}

export function hasSubscriptionPrice(subscription: SubscriptionSnapshot) {
  return Boolean(subscription.currency && subscription.monthlyPrice && Number(subscription.monthlyPrice) > 0);
}

export function formatMoneyARS(value?: string | null, currency?: string | null) {
  if (value == null || !currency) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatBillingDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function getSubscriptionPresentation(subscription: SubscriptionSnapshot): SubscriptionPresentation {
  if (subscription.coverageSource === "BETA_FREE" || subscription.status === "BETA_FREE") {
    return {
      label: "Beta activa",
      tone: "beta",
      heading: "Acceso incluido durante la etapa beta",
      description: "Tu negocio tiene todas las funciones habilitadas. Te avisaremos con anticipación antes de que comiencen los cobros.",
    };
  }

  if (subscription.cancelAtPeriodEnd) {
    return {
      label: "Cancelación programada",
      tone: "warning",
      heading: "Tu acceso continúa hasta finalizar el período actual",
      description: "Podés seguir usando las funciones habilitadas hasta la fecha indicada.",
    };
  }

  if (subscription.coverageSource === "COMPLIMENTARY") {
    return {
      label: "Acceso bonificado",
      tone: "success",
      heading: "Tu comercio cuenta con acceso bonificado",
      description: "No necesitás realizar ningún pago mientras esta cobertura siga vigente.",
    };
  }

  if (subscription.coverageSource === "MANUAL") {
    return {
      label: "Cobertura registrada",
      tone: "success",
      heading: "Tu acceso está registrado",
      description: "Las funciones de tu comercio continúan habilitadas durante el período indicado.",
    };
  }

  if (subscription.status === "PAST_DUE" && subscription.graceEndsAt) {
    return {
      label: "Pago pendiente",
      tone: "warning",
      heading: "No pudimos confirmar el último pago",
      description: "Tu acceso sigue disponible durante el período de gracia indicado.",
    };
  }

  if (subscription.status === "SUSPENDED") {
    return {
      label: "Suscripción suspendida",
      tone: "danger",
      heading: "Tu suscripción necesita regularizarse",
      description: "Podés entrar al panel, pero algunas acciones del negocio quedan pausadas hasta regularizar el acceso.",
    };
  }

  if (subscription.status === "CANCELLED") {
    return {
      label: "Suscripción cancelada",
      tone: "neutral",
      heading: "Tu suscripción está cancelada",
      description: "Cuando quieras volver a habilitar el acceso, vas a poder retomar el proceso desde este panel.",
    };
  }

  if (subscription.status === "ACTIVE" && subscription.hasCoverage) {
    return {
      label: "Suscripción activa",
      tone: "success",
      heading: "Tu suscripción está al día",
      description: "Tu negocio tiene las funciones de PROMY habilitadas.",
    };
  }

  return {
    label: "Pendiente de activación",
    tone: "neutral",
    heading: "Tu suscripción todavía no está activa",
    description: "Estamos terminando de habilitar el acceso de tu negocio.",
  };
}
