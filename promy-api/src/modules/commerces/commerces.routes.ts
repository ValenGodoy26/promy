import { Router } from "express";
import { publicCatalogLimiter } from "../../middlewares/rateLimiters";
import { getCommerceById, getCommerces, getNearbyCommerces } from "./commerces.controller";

const router = Router();

router.get("/", publicCatalogLimiter, getCommerces);
router.get("/nearby", publicCatalogLimiter, getNearbyCommerces);
router.get("/:id", publicCatalogLimiter, getCommerceById);

export default router;
