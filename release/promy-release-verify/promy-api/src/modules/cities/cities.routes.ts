import { Router } from "express";
import { getCities } from "./cities.controller";

const router = Router();

router.get("/", getCities);

export default router;