import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  requireActiveSession,
  requireAuth,
  requireRole,
} from "../../middlewares/auth.middleware";
import {
  createAdminCategory,
  getAdminAuditLogs,
  getAdminBetaRequests,
  getAdminCategories,
  getAdminCommerces,
  getAdminDashboard,
  getAdminPromotions,
  updateCommerce,
  updateAdminCategory,
  updateCommerceStatus,
  updatePromotion,
  updatePromotionStatus,
} from "./admin.controller";
import { adminWriteLimiter } from "../../middlewares/rateLimiters";

const router = Router();

router.use(requireAuth, requireActiveSession, requireRole(UserRole.ADMIN));

router.get("/dashboard", getAdminDashboard);
router.get("/audit-logs", getAdminAuditLogs);
router.get("/beta-requests", getAdminBetaRequests);

router.get("/commerces", getAdminCommerces);
router.patch("/commerces/:id", adminWriteLimiter, updateCommerce);
router.patch("/commerces/:id/status", adminWriteLimiter, updateCommerceStatus);

router.get("/promotions", getAdminPromotions);
router.patch("/promotions/:id", adminWriteLimiter, updatePromotion);
router.patch("/promotions/:id/status", adminWriteLimiter, updatePromotionStatus);

router.get("/categories", getAdminCategories);
router.post("/categories", adminWriteLimiter, createAdminCategory);
router.put("/categories/:id", adminWriteLimiter, updateAdminCategory);

export default router;
