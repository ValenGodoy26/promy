import { Router } from "express";
import { UserRole } from "@prisma/client";
import {
  requireAuth,
  requireRole,
  requireVerifiedEmail,
} from "../../middlewares/auth.middleware";
import { createRedemption, getMyRedemptions } from "./redemptions.controller";

const router = Router();

router.use(requireAuth, requireRole(UserRole.CLIENT));

router.post("/", requireVerifiedEmail, createRedemption);
router.get("/me", getMyRedemptions);

export default router;
