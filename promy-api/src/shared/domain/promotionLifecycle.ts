import type { PromotionStatus } from "@prisma/client";

export const ADMIN_PROMOTION_ALLOWED_TRANSITIONS: Readonly<
  Record<PromotionStatus, readonly PromotionStatus[]>
> = {
  DRAFT: [],
  PENDING_REVIEW: ["APPROVED_VISIBLE", "REJECTED", "EXPIRED"],
  APPROVED_VISIBLE: ["PENDING_REVIEW", "REJECTED", "EXPIRED"],
  REJECTED: ["PENDING_REVIEW", "APPROVED_VISIBLE"],
  EXPIRED: ["PENDING_REVIEW"],
};

export function canTransitionPromotionStatus(
  currentStatus: PromotionStatus,
  nextStatus: PromotionStatus,
) {
  return (
    currentStatus === nextStatus ||
    ADMIN_PROMOTION_ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus) ||
    false
  );
}
