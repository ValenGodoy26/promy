import { Router } from "express";
import { getMe } from "../users/users.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import {
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  registerCommerce,
  resendEmailVerification,
  resetPassword,
  verifyEmail,
} from "./auth.controller";
import { authLimiter } from "../../middlewares/rateLimiters";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/register-commerce", authLimiter, registerCommerce);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", authLimiter, logout);
router.post("/request-email-verification", authLimiter, resendEmailVerification);
router.post("/verify-email", authLimiter, verifyEmail);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.get("/me", requireAuth, getMe);

export default router;
