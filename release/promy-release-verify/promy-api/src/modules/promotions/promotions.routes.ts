import { Router } from "express";
import {
  getFeaturedPromotions,
  getNearbyPromotions,
  getPromotionById,
  getPromotions,
} from "./promotions.controller";

const router = Router();

router.get("/", getPromotions);
router.get("/nearby", getNearbyPromotions);
router.get("/featured", getFeaturedPromotions);
router.get("/:id", getPromotionById);

export default router;
