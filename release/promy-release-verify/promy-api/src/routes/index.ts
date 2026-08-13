import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "../modules/auth/auth.routes";
import usersRoutes from "../modules/users/users.routes";
import citiesRoutes from "../modules/cities/cities.routes";
import categoriesRoutes from "../modules/categories/categories.routes";
import commercesRoutes from "../modules/commerces/commerces.routes";
import promotionsRoutes from "../modules/promotions/promotions.routes";
import commerceRoutes from "../modules/commerce/commerce.routes";
import adminRoutes from "../modules/admin/admin.routes";
import redemptionsRoutes from "../modules/redemptions/redemptions.routes";
import uploadsRoutes from "../modules/uploads/uploads.routes";
import notificationsRoutes from "../modules/notifications/notifications.routes";
import mapRoutes from "../modules/map/map.routes";
import searchRoutes from "../modules/search/search.routes";
import realtimeRoutes from "../modules/realtime/realtime.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/cities", citiesRoutes);
router.use("/categories", categoriesRoutes);
router.use("/commerces", commercesRoutes);
router.use("/promotions", promotionsRoutes);
router.use("/commerce", commerceRoutes);
router.use("/admin", adminRoutes);
router.use("/redemptions", redemptionsRoutes);
router.use("/uploads", uploadsRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/map", mapRoutes);
router.use("/search", searchRoutes);
router.use("/realtime", realtimeRoutes);

export default router;
