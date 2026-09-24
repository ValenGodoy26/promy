import { Router } from "express";
import { getMe } from "../users/users.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requirePublicRegistration } from "../../shared/privacy/publicRegistration";
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
import {
  forgotPasswordLimiter,
  loginLimiter,
  logoutLimiter,
  passwordResetLimiter,
  refreshLimiter,
  registrationLimiter,
  verificationLimiter,
} from "../../middlewares/rateLimiters";

const router = Router();

router.post("/register", requirePublicRegistration, registrationLimiter, register);
router.post("/register-commerce", requirePublicRegistration, registrationLimiter, registerCommerce);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logoutLimiter, logout);
router.post("/request-email-verification", verificationLimiter, resendEmailVerification);
router.post("/verify-email", verificationLimiter, verifyEmail);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);
router.get("/me", requireAuth, getMe);

export default router;
