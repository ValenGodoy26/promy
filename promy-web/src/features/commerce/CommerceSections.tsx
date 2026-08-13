// Barrel de re-exports para el panel comercio.
// Cada página vive en su propio archivo; este módulo los expone juntos
// para que CommercePanel.tsx pueda importarlos desde una sola ruta.

export { CommerceDashboardPage } from "./CommerceDashboardPage";
export { CommerceProfilePage } from "./CommerceProfilePage";
export { CommercePromotionsPage } from "./CommercePromotionsPage";
export { CommercePromotionEditorPage } from "./CommercePromotionEditorPage";
export { CommerceRedemptionsPage } from "./CommerceRedemptionsPage";

export type CommerceTab = { to: string; label: string; end?: boolean };
