import { Router } from "express";
import { getCommerceById, getCommerces, getNearbyCommerces } from "./commerces.controller";

const router = Router();

router.get("/", getCommerces);
router.get("/nearby", getNearbyCommerces);
router.get("/:id", getCommerceById);

export default router;
