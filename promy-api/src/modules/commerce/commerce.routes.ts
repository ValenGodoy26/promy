import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  requireActiveSession,
  requireAuth,
  requireRole,
} from "../../middlewares/auth.middleware";
import {
  requireManagedCommerce,
  requireBillingPromotionAccess,
  requireOperableCommerce,
} from "../../middlewares/commerce.middleware";
import {
  createMyPromotion,
  deleteMyPromotion,
  getCommerceDashboard,
  getMyCommerce,
  getMyPromotions,
  getMyRedemptions,
  getCommerceStatistics,
  updateMyCommerceStatus,
  validateCommerceRedemption,
  updateMyCommerce,
  updateMyPromotion,
} from "./commerce.controller";
import { redemptionValidationLimiter } from "../../middlewares/rateLimiters";

const router = Router();

router.use(
  requireAuth,
  requireActiveSession,
  requireRole(UserRole.COMMERCE),
  requireManagedCommerce,
);

router.get("/dashboard", getCommerceDashboard);

router.get("/me", getMyCommerce);
router.put("/me", updateMyCommerce);
router.patch("/me/status", updateMyCommerceStatus);

router.get("/promotions", getMyPromotions);
router.post("/promotions", requireOperableCommerce, requireBillingPromotionAccess, createMyPromotion);
router.put("/promotions/:id", requireOperableCommerce, requireBillingPromotionAccess, updateMyPromotion);
router.delete("/promotions/:id", requireOperableCommerce, requireBillingPromotionAccess, deleteMyPromotion);

router.get("/redemptions", getMyRedemptions);
router.get("/statistics", getCommerceStatistics);
router.post(
  "/redemptions/validate",
  redemptionValidationLimiter,
  requireOperableCommerce,
  validateCommerceRedemption,
);

export default router;
