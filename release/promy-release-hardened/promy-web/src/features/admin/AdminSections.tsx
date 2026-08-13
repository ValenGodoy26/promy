// Barrel de re-exports para el panel admin.
// Cada página vive en su propio archivo; este módulo los expone juntos
// para que AdminPanel.tsx pueda importarlos desde una sola ruta.

export { AdminDashboardPage } from "./AdminDashboardPage";
export { AdminCommercesPage } from "./AdminCommercesPage";
export { AdminPromotionsPage } from "./AdminPromotionsPage";
export { AdminCategoriesPage } from "./AdminCategoriesPage";
export { AdminAuditPage } from "./AdminAuditPage";
export { AdminBetaRequestsPage } from "./AdminBetaRequestsPage";

export type AdminTab = { to: string; label: string; end?: boolean };
