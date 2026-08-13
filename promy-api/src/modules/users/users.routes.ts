import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  changeMyPassword,
  confirmMyEmailChange,
  deleteMyAccount,
  getMe,
  getMySessions,
  requestMyEmailChange,
  registerPushToken,
  revokeMyOtherSessions,
  revokeMySession,
  unregisterPushToken,
  updateMe,
} from "./users.controller";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { changeEmailLimiter, changePasswordLimiter } from "../../middlewares/rateLimiters";

const router = Router();

router.post("/confirm-email-change", confirmMyEmailChange);
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.get("/me/sessions", requireAuth, getMySessions);
router.delete("/me/sessions/others", requireAuth, revokeMyOtherSessions);
router.delete("/me/sessions/:sessionId", requireAuth, revokeMySession);
router.post("/me/change-password", requireAuth, changePasswordLimiter, changeMyPassword);
router.post("/me/change-email", requireAuth, changeEmailLimiter, requestMyEmailChange);
router.delete("/me", requireAuth, requireRole(UserRole.CLIENT), deleteMyAccount);
router.post("/me/push-tokens", requireAuth, registerPushToken);
router.delete("/me/push-tokens", requireAuth, unregisterPushToken);

export default router;
