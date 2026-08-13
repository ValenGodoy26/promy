import { apiRequest } from "./client";
import {
  CommerceDashboardResponse,
  DeleteCommercePromotionResponse,
  CommerceManagedPromotionResponse,
  CommerceManagedPromotionsResponse,
  CommerceManagedRedemptionsResponse,
  CreateCommercePromotionInput,
  MyCommerceResponse,
  UpdateCommercePromotionInput,
  UpdateMyCommerceStatusInput,
  UpdateMyCommerceInput,
  ValidateCommerceRedemptionInput,
  ValidateCommerceRedemptionResponse,
} from "../types/api";

export async function fetchCommerceDashboard() {
  return apiRequest<CommerceDashboardResponse>("/commerce/dashboard");
}

export async function fetchMyCommerce() {
  return apiRequest<MyCommerceResponse>("/commerce/me");
}

export async function updateMyCommerce(body: UpdateMyCommerceInput) {
  return apiRequest<MyCommerceResponse>("/commerce/me", {
    method: "PUT",
    body,
  });
}

export async function updateMyCommerceStatus(body: UpdateMyCommerceStatusInput) {
  return apiRequest<MyCommerceResponse>("/commerce/me/status", {
    method: "PATCH",
    body,
  });
}

export async function fetchCommercePromotions() {
  return apiRequest<CommerceManagedPromotionsResponse>("/commerce/promotions");
}

export async function createCommercePromotion(body: CreateCommercePromotionInput) {
  return apiRequest<CommerceManagedPromotionResponse>("/commerce/promotions", {
    method: "POST",
    body,
  });
}

export async function updateCommercePromotion(
  promotionId: number,
  body: UpdateCommercePromotionInput,
) {
  return apiRequest<CommerceManagedPromotionResponse>(`/commerce/promotions/${promotionId}`, {
    method: "PUT",
    body,
  });
}

export async function deleteCommercePromotion(promotionId: number) {
  return apiRequest<DeleteCommercePromotionResponse>(`/commerce/promotions/${promotionId}`, {
    method: "DELETE",
  });
}

export async function fetchCommerceRedemptions() {
  return apiRequest<CommerceManagedRedemptionsResponse>("/commerce/redemptions");
}

export async function validateCommerceRedemption(body: ValidateCommerceRedemptionInput) {
  return apiRequest<ValidateCommerceRedemptionResponse>("/commerce/redemptions/validate", {
    method: "POST",
    body,
  });
}
