import { Router } from "express";
import { searchCatalog } from "./search.controller";

const router = Router();

router.get("/", searchCatalog);

export default router;
