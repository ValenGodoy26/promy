import { Router } from "express";
import { publicCatalogLimiter } from "../../middlewares/rateLimiters";
import { getStatsPublic } from "./stats.controller";

const router = Router();

router.get("/public", publicCatalogLimiter, getStatsPublic);

export default router;
