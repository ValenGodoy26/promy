import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  registerMyPushToken,
  unregisterMyPushToken,
} from "./notifications.controller";

const router = Router();

router.use(requireAuth);

router.get("/me", getMyNotifications);
router.post("/read-all", markAllNotificationsAsRead);
router.post("/:id/read", markNotificationAsRead);
router.post("/push-token", registerMyPushToken);
router.delete("/push-token", unregisterMyPushToken);

export default router;
