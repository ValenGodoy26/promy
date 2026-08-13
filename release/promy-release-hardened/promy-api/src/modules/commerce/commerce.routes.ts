import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import {
  requireManagedCommerce,
  requireOperableCommerce,
} from "../../middlewares/commerce.middleware";
import {
  createMyPromotion,
  deleteMyPromotion,
  getCommerceDashboard,
  getMyCommerce,
  getMyPromotions,
  getMyRedemptions,
  updateMyCommerceStatus,
  validateCommerceRedemption,
  updateMyCommerce,
  updateMyPromotion,
} from "./commerce.controller";
import { redemptionValidationLimiter } from "../../middlewares/rateLimiters";

const router = Router();

router.use(requireAuth, requireRole(UserRole.COMMERCE), requireManagedCommerce);

router.get("/dashboard", getCommerceDashboard);

router.get("/me", getMyCommerce);
router.put("/me", updateMyCommerce);
router.patch("/me/status", updateMyCommerceStatus);

router.get("/promotions", getMyPromotions);
router.post("/promotions", requireOperableCommerce, createMyPromotion);
router.put("/promotions/:id", requireOperableCommerce, updateMyPromotion);
router.delete("/promotions/:id", requireOperableCommerce, deleteMyPromotion);

router.get("/redemptions", getMyRedemptions);
router.post(
  "/redemptions/validate",
  redemptionValidationLimiter,
  requireOperableCommerce,
  validateCommerceRedemption,
);

export default router;
