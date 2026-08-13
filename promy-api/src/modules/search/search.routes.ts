import { Router } from "express";
import { searchCatalog } from "./search.controller";
import { searchLimiter } from "../../middlewares/rateLimiters";

const router = Router();

router.get("/", searchLimiter, searchCatalog);

export default router;
