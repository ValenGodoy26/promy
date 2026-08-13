import { Router } from "express";
import { getMapMarkers } from "./map.controller";
import { publicCatalogLimiter } from "../../middlewares/rateLimiters";

const router = Router();

router.get("/markers", publicCatalogLimiter, getMapMarkers);

export default router;
