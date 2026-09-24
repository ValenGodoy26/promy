import { createHmac, timingSafeEqual } from "crypto";
export function verifyMercadoPagoWebhookSignature(input: { signature?: string; requestId?: string; dataId?: string; secret: string }) {
  if (!input.signature || !input.requestId || !input.dataId || !input.secret) return false;
  const parts = Object.fromEntries(input.signature.split(",").map((part) => part.trim().split("=", 2)).filter(([key, value]) => key && value));
  const timestamp = parts.ts; const received = parts.v1;
  if (!timestamp || !received || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${timestamp};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}
