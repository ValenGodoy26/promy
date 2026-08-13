import { Router } from "express";
import { getMe, registerPushToken, unregisterPushToken } from "./users.controller";
import { requireAuth } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/me", requireAuth, getMe);
router.post("/me/push-tokens", requireAuth, registerPushToken);
router.delete("/me/push-tokens", requireAuth, unregisterPushToken);

export default router;
