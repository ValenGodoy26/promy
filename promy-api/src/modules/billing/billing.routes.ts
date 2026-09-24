import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireActiveSession, requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { requireManagedCommerce } from "../../middlewares/commerce.middleware";
import { adminWriteLimiter } from "../../middlewares/rateLimiters";
import { getCommerceSubscription } from "./billing.controller";

const commerceRouter = Router();
commerceRouter.use(requireAuth, requireActiveSession, requireRole(UserRole.COMMERCE), requireManagedCommerce);
commerceRouter.get("/subscription", getCommerceSubscription);

export const adminBillingRouter = Router();
import {
  createComplimentary, createManualPayment, getAdminBillingSettings, getAdminBillingSubscription,
  getAdminBillingSubscriptions, patchAdminBillingSettings, reverseManualPayment, revokeComplimentary,
} from "./billing.controller";
adminBillingRouter.use(requireAuth, requireActiveSession, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN));
adminBillingRouter.get("/billing/settings", getAdminBillingSettings);
adminBillingRouter.get("/subscriptions", getAdminBillingSubscriptions);
adminBillingRouter.get("/subscriptions/:commerceId", getAdminBillingSubscription);
adminBillingRouter.patch("/billing/settings", adminWriteLimiter, requireRole(UserRole.SUPER_ADMIN), patchAdminBillingSettings);
adminBillingRouter.post("/billing/:commerceId/complimentary", adminWriteLimiter, requireRole(UserRole.SUPER_ADMIN), createComplimentary);
adminBillingRouter.post("/billing/:commerceId/revoke-complimentary", adminWriteLimiter, requireRole(UserRole.SUPER_ADMIN), revokeComplimentary);
adminBillingRouter.post("/billing/:commerceId/manual-payment", adminWriteLimiter, requireRole(UserRole.SUPER_ADMIN), createManualPayment);
adminBillingRouter.post("/billing/:commerceId/manual-payment/:paymentId/reverse", adminWriteLimiter, requireRole(UserRole.SUPER_ADMIN), reverseManualPayment);

export default commerceRouter;
