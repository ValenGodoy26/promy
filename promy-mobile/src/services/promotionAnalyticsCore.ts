export type PromotionAnalyticsEventType = "IMPRESSION" | "OPEN";
export type PromotionAnalyticsEvent = { promotionId: number; type: PromotionAnalyticsEventType };
type SendEvents = (sessionId: string, events: PromotionAnalyticsEvent[]) => Promise<void>;
type Clock = () => number;

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_BATCH_SIZE = 10;
const MAX_QUEUE_SIZE = 50;
const MAX_RETRIES = 2;

function createSessionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  if (bytes.every((value) => value === 0)) throw new Error("No hay una fuente segura para analytics");
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createPromotionAnalyticsClient(send: SendEvents, clock: Clock = () => Date.now()) {
  let sessionId = createSessionId();
  let sessionStartedAt = clock();
  let claimed = new Set<string>();
  let queue: PromotionAnalyticsEvent[] = [];
  let flushing = false;
  let scheduled = false;
  const scheduleFlush = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; void flush(); }, 0);
  };
  const rotateIfExpired = () => {
    if (clock() - sessionStartedAt < SESSION_TTL_MS) return;
    sessionId = createSessionId(); sessionStartedAt = clock(); claimed = new Set(); queue = [];
  };
  const flush = async () => {
    if (flushing || !queue.length) return;
    flushing = true;
    try {
      const batch = queue.slice(0, MAX_BATCH_SIZE);
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        try { await send(sessionId, batch); queue = queue.slice(batch.length); break; }
        catch { if (attempt === MAX_RETRIES) queue = queue.slice(batch.length); }
      }
    } finally { flushing = false; if (queue.length) scheduleFlush(); }
  };
  const track = (promotionId: number, type: PromotionAnalyticsEventType) => {
    if (!Number.isInteger(promotionId) || promotionId <= 0) return;
    rotateIfExpired();
    const key = `${promotionId}:${type}`;
    if (claimed.has(key)) return;
    claimed.add(key);
    if (queue.length >= MAX_QUEUE_SIZE) return;
    queue.push({ promotionId, type });
    scheduleFlush();
  };
  return { track, flush, debug: () => ({ sessionId, sessionStartedAt, queueSize: queue.length, claimed: [...claimed] }) };
}
