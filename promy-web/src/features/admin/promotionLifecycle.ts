import type { PromotionStatus } from "../../types/api";

export function getAvailablePromotionTransitions(status: string): PromotionStatus[] {
  if (status === "PENDING_REVIEW") {
    return ["APPROVED_VISIBLE", "REJECTED", "EXPIRED"];
  }

  if (status === "APPROVED_VISIBLE") {
    return ["PENDING_REVIEW", "REJECTED", "EXPIRED"];
  }

  if (status === "REJECTED") {
    return ["PENDING_REVIEW", "APPROVED_VISIBLE"];
  }

  if (status === "EXPIRED") {
    return ["PENDING_REVIEW"];
  }

  return [];
}
