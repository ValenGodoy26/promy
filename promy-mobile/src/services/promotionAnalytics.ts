import { apiRequest } from "../api/client";
import {
  createPromotionAnalyticsClient,
  type PromotionAnalyticsEvent,
} from "./promotionAnalyticsCore";

async function sendPromotionAnalyticsEvents(sessionId: string, events: PromotionAnalyticsEvent[]) {
  await apiRequest<null>("/analytics/promotion-events", {
    method: "POST",
    body: { sessionId, events },
    skipAuthRefresh: true,
    suppressSessionInvalidation: true,
  });
}

const promotionAnalytics = createPromotionAnalyticsClient(sendPromotionAnalyticsEvents);

/** Called at app bootstrap so the ephemeral 24-hour session starts with the process. */
export function initializePromotionAnalytics() {
  return undefined;
}

export function trackPromotionImpression(promotionId: number) {
  try { promotionAnalytics.track(promotionId, "IMPRESSION"); } catch { /* analytics never breaks UX */ }
}

export function trackPromotionOpen(promotionId: number) {
  try { promotionAnalytics.track(promotionId, "OPEN"); } catch { /* analytics never breaks UX */ }
}
