require("dotenv/config");
const test = require("node:test");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const { FakeBillingProvider } = require("../dist/modules/billing/providers/fake-billing.provider.js");
const { BillingProviderError } = require("../dist/modules/billing/providers/billing-provider.js");
const { verifyMercadoPagoWebhookSignature } = require("../dist/modules/billing/mercado-pago.webhook.js");
const { mapMercadoPagoSubscriptionStatus, isMercadoPagoApprovedPayment, webhookFingerprint } = require("../dist/modules/billing/mercado-pago.service.js");

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
test("Mercado Pago webhook HMAC uses the official id/request-id/ts manifest", () => {
  const secret = "a-strong-test-webhook-secret"; const dataId = "PREAPPROVALABC"; const requestId = "request-123"; const ts = "1704908010";
  const signature = createHmac("sha256", secret).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest("hex");
  assert.equal(verifyMercadoPagoWebhookSignature({ signature: `ts=${ts},v1=${signature}`, requestId, dataId, secret }), true);
  assert.equal(verifyMercadoPagoWebhookSignature({ signature: `ts=${ts},v1=${signature}`, requestId: "other", dataId, secret }), false);
});
test("provider status mapping is explicit and unknown statuses preserve the last safe domain state", () => {
  assert.equal(mapMercadoPagoSubscriptionStatus("authorized"), "ACTIVE"); assert.equal(mapMercadoPagoSubscriptionStatus("pending"), "PENDING_PAYMENT"); assert.equal(mapMercadoPagoSubscriptionStatus("cancelled"), "CANCELLED"); assert.equal(mapMercadoPagoSubscriptionStatus("unexpected"), null);
  assert.equal(isMercadoPagoApprovedPayment("approved"), true); assert.equal(isMercadoPagoApprovedPayment("rejected"), false);
  assert.equal(webhookFingerprint("subscription_preapproval", "id-1"), webhookFingerprint("subscription_preapproval", "id-1"));
});
