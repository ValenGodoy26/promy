export const MOBILE_PROMOTION_STATUS_MODES = ["DRAFT", "PENDING_REVIEW"] as const;

export type MobilePromotionMode = (typeof MOBILE_PROMOTION_STATUS_MODES)[number];
