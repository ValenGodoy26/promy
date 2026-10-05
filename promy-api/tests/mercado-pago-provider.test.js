require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const { FakeBillingProvider } = require("../dist/modules/billing/providers/fake-billing.provider.js");
const { BillingProviderError } = require("../dist/modules/billing/providers/billing-provider.js");
const { MercadoPagoBillingProvider } = require("../dist/modules/billing/providers/mercado-pago.provider.js");
const { verifyMercadoPagoWebhookSignature } = require("../dist/modules/billing/mercado-pago.webhook.js");
const { describeMercadoPagoReconciliation, mapMercadoPagoSubscriptionStatus, isMercadoPagoApprovedPayment, resolveMercadoPagoPayerEmail, shouldClearEnrollmentReservation, webhookFingerprint } = require("../dist/modules/billing/mercado-pago.service.js");

test("fake provider provisions one plan and deduplicates an enrollment by opaque external reference", async () => {
  const provider = new FakeBillingProvider();
  const plan = await provider.ensurePlan({ amount: 2000, currency: "ARS", reason: "PROMY" });
  const input = { planId: plan.id, externalReference: "8e7046d7-e4d2-42dc-ae19-82b9d7b0b83e", payerEmail: "commerce@example.test", cardToken: "temporary-token-only", backUrl: "https://example.test/return", amount: 2000, currency: "ARS" };
  const first = await provider.createEnrollment(input); const second = await provider.createEnrollment(input);
  assert.equal(first.id, second.id); assert.equal(first.status, "authorized"); assert.equal(first.externalReference, input.externalReference);
});
test("fake provider exposes bounded provider failures without network", async () => {
  const provider = new FakeBillingProvider(); provider.failure = new BillingProviderError("timeout", "timeout");
  await assert.rejects(() => provider.getPlan("missing"), { name: "BillingProviderError" });
});
test("Mercado Pago plan creation carries back_url and cancellation uses canceled", async (t) => {
  const originalFetch = global.fetch; const requests = [];
  global.fetch = async (url, init) => { requests.push({ url: String(url), init }); const path = new URL(String(url)).pathname; const body = path === "/preapproval_plan" ? { id: "plan_test_1", status: "active", auto_recurring: { transaction_amount: 2000, currency_id: "ARS" } } : { id: "preapproval_test_1", status: "canceled", preapproval_plan_id: "plan_test_1", external_reference: "opaque-reference" }; return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }); };
  t.after(() => { global.fetch = originalFetch; });
  const provider = new MercadoPagoBillingProvider("test-token");
  await provider.ensurePlan({ amount: 2000, currency: "ARS", reason: "PROMY Sandbox", backUrl: "https://sandbox.example.test/return" });
  const cancelled = await provider.cancelSubscription("preapproval_test_1");
  assert.equal(JSON.parse(requests[0].init.body).back_url, "https://sandbox.example.test/return");
  assert.deepEqual(JSON.parse(requests[1].init.body), { status: "canceled" });
  assert.equal(cancelled.status, "canceled");
});
test("Mercado Pago failures retain only an allowlisted provider summary", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ message: "Card token is invalid", error: "bad_request", status: 400, cause: [{ code: "card_token_invalid", description: "The card token is not valid" }], card_token_id: "synthetic-card-token-must-not-leak", authorization: "Bearer synthetic-access-token-must-not-leak", payer: { card: { number: "synthetic-pan-must-not-leak" } } }), { status: 400, headers: { "Content-Type": "application/json" } });
  t.after(() => { global.fetch = originalFetch; });
  const provider = new MercadoPagoBillingProvider("synthetic-access-token-must-not-leak");
  await assert.rejects(() => provider.createEnrollment({ planId: "plan", externalReference: "opaque-reference", payerEmail: "commerce@example.test", cardToken: "synthetic-card-token-must-not-leak", backUrl: "https://sandbox.example.test/return", amount: 1000, currency: "ARS" }), (error) => {
    assert.ok(error instanceof BillingProviderError);
    assert.deepEqual(error.metadata, { httpStatus: 400, providerMessage: "Card token is invalid", providerError: "bad_request", providerStatus: 400, causeCodes: ["card_token_invalid"], causeDescriptions: ["The card token is not valid"] });
    assert.doesNotMatch(JSON.stringify(error.metadata), /synthetic-card-token|synthetic-access-token|synthetic-pan|authorization|payer/i);
    return true;
  });
});
test("Mercado Pago webhook HMAC uses the official id/request-id/ts manifest", () => {
  const secret = "a-strong-test-webhook-secret"; const dataId = "PREAPPROVALABC"; const requestId = "request-123"; const ts = "1704908010";
  const signature = createHmac("sha256", secret).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest("hex");
  assert.equal(verifyMercadoPagoWebhookSignature({ signature: `ts=${ts},v1=${signature}`, requestId, dataId, secret }), true);
  assert.equal(verifyMercadoPagoWebhookSignature({ signature: `ts=${ts},v1=${signature}`, requestId: "other", dataId, secret }), false);
});
test("provider status mapping is explicit and unknown statuses preserve the last safe domain state", () => {
  assert.equal(mapMercadoPagoSubscriptionStatus("authorized"), "ACTIVE"); assert.equal(mapMercadoPagoSubscriptionStatus("pending"), "PENDING_PAYMENT"); assert.equal(mapMercadoPagoSubscriptionStatus("canceled"), "CANCELLED"); assert.equal(mapMercadoPagoSubscriptionStatus("cancelled"), "CANCELLED"); assert.equal(mapMercadoPagoSubscriptionStatus("unexpected"), null);
  assert.equal(isMercadoPagoApprovedPayment("approved"), true); assert.equal(isMercadoPagoApprovedPayment("rejected"), false);
  assert.equal(webhookFingerprint("subscription_preapproval", "id-1"), webhookFingerprint("subscription_preapproval", "id-1"));
});
test("reconciliation compares provider state without proposing a local mutation", () => {
  const start = new Date("2026-02-01T12:00:00.000Z"); const end = new Date("2026-03-01T12:00:00.000Z");
  const local = { id: 1, commerceId: 1, status: "ACTIVE", providerStatus: "authorized", providerPlanId: "plan_fixture", providerExternalReference: "reference-1", currentPeriodStart: start, currentPeriodEnd: end };
  const matching = { id: "subscription-1", planId: "plan_fixture", externalReference: "reference-1", status: "authorized", version: 1, lastModifiedAt: start, currentPeriodStart: start, currentPeriodEnd: end, nextBillingDate: end, initPoint: null };
  assert.deepEqual(describeMercadoPagoReconciliation(local, matching), { result: "MATCH", mismatchFields: [] });
  const mismatch = describeMercadoPagoReconciliation(local, { ...matching, status: "cancelled", planId: "other-plan" });
  assert.equal(mismatch.result, "MISMATCH"); assert.deepEqual(mismatch.mismatchFields, ["status", "providerStatus", "plan"]);
});
test("sandbox payer override never changes the production owner payer", () => {
  assert.equal(resolveMercadoPagoPayerEmail({ mode: "sandbox", ownerEmail: "owner@example.test", sandboxPayerEmail: "payer@example.test" }), "payer@example.test");
  assert.equal(resolveMercadoPagoPayerEmail({ mode: "sandbox", ownerEmail: "owner@example.test" }), "owner@example.test");
  assert.equal(resolveMercadoPagoPayerEmail({ mode: "production", ownerEmail: "owner@example.test", sandboxPayerEmail: "payer@example.test" }), "owner@example.test");
});
test("only definitive Mercado Pago rejections release an enrollment reservation", () => {
  for (const status of [400, 401, 403, 404]) assert.equal(shouldClearEnrollmentReservation(new BillingProviderError("rejected", "upstream", { httpStatus: status })), true);
  assert.equal(shouldClearEnrollmentReservation(new BillingProviderError("timeout", "timeout")), false);
  assert.equal(shouldClearEnrollmentReservation(new BillingProviderError("upstream", "upstream", { httpStatus: 500 })), false);
});
