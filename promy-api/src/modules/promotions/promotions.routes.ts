import { Router } from "express";
import { publicCatalogLimiter } from "../../middlewares/rateLimiters";
import {
  getFeaturedPromotions,
  getNearbyPromotions,
  getPromotionById,
  getPromotions,
} from "./promotions.controller";

const router = Router();

router.get("/", publicCatalogLimiter, getPromotions);
router.get("/nearby", publicCatalogLimiter, getNearbyPromotions);
router.get("/featured", publicCatalogLimiter, getFeaturedPromotions);
router.get("/:id", publicCatalogLimiter, getPromotionById);

export default router;
