import type { CommerceSubscription } from "../../types/api";

export type SubscriptionPaymentPhase =
  | "IDLE"
  | "LOADING_SDK"
  | "READY"
  | "TOKENIZING"
  | "SUBMITTING"
  | "CONFIRMING"
  | "PENDING"
  | "SUCCESS"
  | "ERROR"
  | "AMBIGUOUS";

export type SubscriptionConfirmation = {
  state: "success" | "pending" | "attention";
  title: string;
  description: string;
};

export class SubscriptionPaymentAttempt {
  private phase: SubscriptionPaymentPhase = "IDLE";

  get currentPhase() { return this.phase; }

  markReady() { this.phase = "READY"; }
  startTokenizing() {
    if (this.phase !== "READY") return false;
    this.phase = "TOKENIZING";
    return true;
  }
  markSubmitting() { this.phase = "SUBMITTING"; }
  markConfirming() { this.phase = "CONFIRMING"; }
  markPending() { this.phase = "PENDING"; }
  markSuccess() { this.phase = "SUCCESS"; }
  markError() { this.phase = "ERROR"; }
  markAmbiguous() { this.phase = "AMBIGUOUS"; }
}

export async function submitSubscriptionEnrollment(input: {
  attempt: SubscriptionPaymentAttempt;
  tokenize: () => Promise<string | null | undefined>;
  enroll: (cardToken: string) => Promise<void>;
  onPhaseChange?: () => void;
}) {
  if (!input.attempt.startTokenizing()) return { outcome: "blocked" as const };
  input.onPhaseChange?.();
  let cardToken: string | null | undefined;
  try {
    cardToken = await input.tokenize();
    if (!cardToken) {
      input.attempt.markError();
      input.onPhaseChange?.();
      return { outcome: "tokenization_error" as const };
    }
    input.attempt.markSubmitting();
    input.onPhaseChange?.();
    await input.enroll(cardToken);
    input.attempt.markConfirming();
    input.onPhaseChange?.();
    return { outcome: "accepted" as const };
  } catch (error) {
    if (isAmbiguousEnrollmentError(error)) {
      input.attempt.markAmbiguous();
      input.onPhaseChange?.();
      return { outcome: "ambiguous" as const };
    }
    input.attempt.markError();
    input.onPhaseChange?.();
    return { outcome: "error" as const };
  } finally {
    cardToken = null;
  }
}

export function isAmbiguousEnrollmentError(error: unknown) {
  return typeof error === "object" && error !== null
    && "kind" in error
    && (((error as { kind?: unknown }).kind === "network") || ((error as { kind?: unknown }).kind === "timeout"));
}

export function getSubscriptionConfirmation(subscription: CommerceSubscription): SubscriptionConfirmation {
  if (subscription.status === "ACTIVE" && subscription.hasCoverage) {
    return { state: "success", title: "Suscripción activada", description: "Tu acceso a PROMY está activo." };
  }
  if (subscription.status === "PAST_DUE") {
    return { state: "attention", title: "Tu pago necesita regularizarse.", description: "Revisá el medio de pago e intentá nuevamente más tarde." };
  }
  if (subscription.status === "SUSPENDED") {
    return { state: "attention", title: "Tu suscripción necesita regularizarse.", description: "Actualizá el estado antes de intentar una nueva activación." };
  }
  return { state: "pending", title: "Estamos esperando la confirmación del pago.", description: "Podés actualizar el estado en unos instantes." };
}

export async function pollSubscriptionConfirmation(
  readSubscription: () => Promise<CommerceSubscription>,
  options: { signal?: AbortSignal; attempts?: number; delay?: (milliseconds: number, signal?: AbortSignal) => Promise<void> } = {},
) {
  const attempts = Math.max(1, Math.min(options.attempts ?? 4, 5));
  const delay = options.delay ?? ((milliseconds, signal) => new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => { window.clearTimeout(timer); resolve(); }, { once: true });
  }));
  let subscription = await readSubscription();
  for (let attempt = 1; attempt < attempts && !options.signal?.aborted; attempt += 1) {
    if (getSubscriptionConfirmation(subscription).state !== "pending") break;
    await delay(2_000, options.signal);
    if (options.signal?.aborted) break;
    subscription = await readSubscription();
  }
  return subscription;
}
