import { Router } from "express";
import { createBetaRequest } from "./beta.controller";
import { betaAccessLimiter } from "../../middlewares/rateLimiters";

const router = Router();

router.post("/access-requests", betaAccessLimiter, createBetaRequest);

export default router;
