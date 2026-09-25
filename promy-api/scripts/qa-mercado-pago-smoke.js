const { createHmac } = require("crypto");
const prisma = require("../dist/config/prisma").default;
const { assert, createWebClient, loginWeb } = require("./qa-http-client");
const { assertCurrentTestDatabase } = require("./qa-database-guard");
const SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
async function main() {
  await assertCurrentTestDatabase(prisma, "Mercado Pago billing smoke");
  const commerce = await prisma.commerce.findFirstOrThrow({ where: { owner: { email: "comercio@promy.com" } }, select: { id: true } });
  await prisma.billingSettings.update({ where: { id: 1 }, data: { monthlyPrice: 1000, currency: "ARS", mercadoPagoPlanId: "plan_fake_0001" } });
  await prisma.billingSubscription.deleteMany({ where: { commerceId: commerce.id } });
  const web = createWebClient(); const session = await loginWeb(web, "comercio@promy.com", "demo1234");
  const first = await web.request("/commerce/subscription/enroll", { method: "POST", headers: { Authorization: `Bearer ${session.accessToken}` }, body: JSON.stringify({ cardToken: "token-only-for-fake-provider" }) });
  assert(first.status === 201 && first.data.enrollment.status === "ACTIVE", `Enrollment failed: ${JSON.stringify(first.data)}`);
  const duplicate = await web.request("/commerce/subscription/enroll", { method: "POST", headers: { Authorization: `Bearer ${session.accessToken}` }, body: JSON.stringify({ cardToken: "different-token-must-not-create-second" }) });
  assert(duplicate.status === 200 && duplicate.data.enrollment.duplicate === true, "Concurrent/retry enrollment must reuse the internal subscription");
  const subscription = await prisma.billingSubscription.findUniqueOrThrow({ where: { commerceId: commerce.id } });
  const resourceId = `approved:${subscription.providerSubscriptionId}`; const requestId = "mp-smoke-request"; const ts = "1704908010"; const signature = createHmac("sha256", SECRET).update(`id:${resourceId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest("hex");
  const headers = { "x-signature": `ts=${ts},v1=${signature}`, "x-request-id": requestId };
  const webhook = await web.request("/webhooks/mercado-pago", { method: "POST", headers, body: JSON.stringify({ type: "subscription_authorized_payment", data: { id: resourceId } }) }); assert(webhook.status === 200, "Signed payment webhook failed");
  const repeated = await web.request("/webhooks/mercado-pago", { method: "POST", headers, body: JSON.stringify({ type: "subscription_authorized_payment", data: { id: resourceId } }) }); assert(repeated.status === 200, "Duplicate signed webhook must be idempotent");
  assert(await prisma.billingPayment.count({ where: { providerPaymentId: resourceId } }) === 1, "Provider payment must be unique"); assert(await prisma.mercadoPagoWebhookReceipt.count({ where: { resourceId } }) === 1, "Webhook receipt must be unique");
  const cancellation = await web.request("/commerce/subscription/cancel", { method: "POST", headers: { Authorization: `Bearer ${session.accessToken}` } }); assert(cancellation.status === 200 && cancellation.data.subscription.cancelAtPeriodEnd === true, "Cancellation must preserve current period coverage");
  await prisma.mercadoPagoWebhookReceipt.deleteMany({ where: { resourceId } }); await prisma.billingPayment.deleteMany({ where: { commerceId: commerce.id, source: "MERCADO_PAGO" } }); await prisma.billingSubscription.deleteMany({ where: { commerceId: commerce.id } });
  console.log(JSON.stringify({ smoke: "mercado-pago", enrollment: "PASS", webhook: "PASS", idempotency: "PASS", cancellation: "PASS", status: "PASS" }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
