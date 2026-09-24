import { env, isTest } from "../../../config/env";
import { BillingProvider, BillingProviderError } from "./billing-provider";
import { FakeBillingProvider } from "./fake-billing.provider";
import { MercadoPagoBillingProvider } from "./mercado-pago.provider";
const fake = new FakeBillingProvider();
export function getBillingProvider(): BillingProvider {
  if (isTest) return fake;
  if (env.MERCADO_PAGO_MODE === "disabled" || !env.MERCADO_PAGO_ACCESS_TOKEN) throw new BillingProviderError("Mercado Pago no está configurado.", "disabled");
  return new MercadoPagoBillingProvider(env.MERCADO_PAGO_ACCESS_TOKEN);
}
export function getFakeBillingProviderForTests() { return fake; }
