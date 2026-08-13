import { Router } from "express";
import { getMapMarkers } from "./map.controller";

const router = Router();

router.get("/markers", getMapMarkers);

export default router;
