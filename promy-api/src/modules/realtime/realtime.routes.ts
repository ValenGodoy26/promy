import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  requireActiveSession,
  requireAuth,
  requireRole,
} from "../../middlewares/auth.middleware";
import { realtimeLimiter } from "../../middlewares/rateLimiters";
import {
  createRealtimeStreamToken,
  openRealtimeEventsStream,
} from "./realtime.controller";

const router = Router();

router.post(
  "/stream-token",
  realtimeLimiter,
  requireAuth,
  requireActiveSession,
  requireRole(UserRole.ADMIN, UserRole.COMMERCE),
  createRealtimeStreamToken,
);
router.get("/events", realtimeLimiter, openRealtimeEventsStream);

export default router;
