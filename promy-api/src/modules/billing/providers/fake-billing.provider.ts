import { randomUUID } from "crypto";
import { BillingProvider, BillingProviderError, EnrollmentInput, ProviderAuthorizedPayment, ProviderPlan, ProviderSubscription } from "./billing-provider";

/** Deterministic in-memory provider used only by tests and isolated integration harnesses. */
export class FakeBillingProvider implements BillingProvider {
  readonly name = "fake" as const;
  readonly plans = new Map<string, ProviderPlan>(); readonly subscriptions = new Map<string, ProviderSubscription>(); readonly payments = new Map<string, ProviderAuthorizedPayment>();
  failure: BillingProviderError | null = null;
  private sequence = 0;
  private id(prefix: string) { this.sequence += 1; return `${prefix}_${String(this.sequence).padStart(4, "0")}`; }
  private check() { if (this.failure) throw this.failure; }
  async ensurePlan(input: { existingPlanId?: string | null; amount: number; currency: string; reason: string }) { this.check(); if (input.existingPlanId) return this.getPlan(input.existingPlanId); const plan = { id: this.id("plan"), status: "active", amount: input.amount, currency: input.currency, frequency: 1, frequencyType: "months" as const }; this.plans.set(plan.id, plan); return plan; }
  async getPlan(id: string) { this.check(); const value = this.plans.get(id); if (!value) throw new BillingProviderError("Recurso no encontrado.", "not_found"); return value; }
  async updatePlan(id: string, input: { amount: number; reason?: string }) { const plan = await this.getPlan(id); const next = { ...plan, amount: input.amount }; this.plans.set(id, next); return next; }
  async createEnrollment(input: EnrollmentInput) { this.check(); const duplicate = [...this.subscriptions.values()].find((item) => item.externalReference === input.externalReference); if (duplicate) return duplicate; const now = new Date(); const end = new Date(now); end.setMonth(end.getMonth() + 1); const subscription: ProviderSubscription = { id: this.id("preapproval"), planId: input.planId, externalReference: input.externalReference, status: "authorized", version: 1, lastModifiedAt: now, currentPeriodStart: now, currentPeriodEnd: end, nextBillingDate: end, initPoint: `https://fake.mercadopago.local/checkout/${randomUUID()}` }; this.subscriptions.set(subscription.id, subscription); return subscription; }
  async getSubscription(id: string) { this.check(); const value = this.subscriptions.get(id); if (!value) throw new BillingProviderError("Recurso no encontrado.", "not_found"); return value; }
  async cancelSubscription(id: string) { const subscription = await this.getSubscription(id); const next = { ...subscription, status: "cancelled", version: (subscription.version ?? 0) + 1, lastModifiedAt: new Date() }; this.subscriptions.set(id, next); return next; }
  async getAuthorizedPayment(id: string) { this.check(); const value = this.payments.get(id); if (value) return value; if (id.startsWith("approved:")) { const subscriptionId = id.slice("approved:".length); const subscription = await this.getSubscription(subscriptionId); return this.addPayment({ id, subscriptionId, status: "approved", amount: 1000, currency: "ARS", paidAt: new Date(), periodStart: subscription.currentPeriodStart, periodEnd: subscription.currentPeriodEnd }); } if (id.startsWith("rejected:")) { const subscriptionId = id.slice("rejected:".length); return this.addPayment({ id, subscriptionId, status: "rejected", amount: 1000, currency: "ARS", paidAt: null, periodStart: null, periodEnd: null }); } throw new BillingProviderError("Recurso no encontrado.", "not_found"); }
  async listAuthorizedPayments(subscriptionId: string) { this.check(); return [...this.payments.values()].filter((payment) => payment.subscriptionId === subscriptionId); }
  addPayment(input: Omit<ProviderAuthorizedPayment, "id"> & { id?: string }) { const payment = { ...input, id: input.id ?? this.id("authorized_payment") }; this.payments.set(payment.id, payment); return payment; }
}
