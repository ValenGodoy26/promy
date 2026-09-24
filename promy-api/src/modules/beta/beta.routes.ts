import { Router } from "express";
import { createBetaRequest } from "./beta.controller";
import { betaAccessLimiter } from "../../middlewares/rateLimiters";
import { requirePublicRegistration } from "../../shared/privacy/publicRegistration";

const router = Router();

router.post("/access-requests", requirePublicRegistration, betaAccessLimiter, createBetaRequest);

export default router;
