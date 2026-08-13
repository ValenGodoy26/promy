import { Router } from "express";
import { createBetaRequest } from "./beta.controller";
import { authLimiter } from "../../middlewares/rateLimiters";

const router = Router();

router.post("/access-requests", authLimiter, createBetaRequest);

export default router;
