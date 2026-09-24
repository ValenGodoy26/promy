import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireActiveSession, requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { analyticsIngestionLimiter } from "../../middlewares/rateLimiters";
import { ingestPromotionEvents } from "./analytics.controller";

const router = Router();
router.post("/promotion-events", requireAuth, requireActiveSession, requireRole(UserRole.CLIENT), analyticsIngestionLimiter, ingestPromotionEvents);
export default router;
