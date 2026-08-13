const APP_SCHEME = "promy";

export function buildPromotionDeepLink(promotionId: number) {
  return `${APP_SCHEME}://promotion/${promotionId}`;
}

export function buildCommerceDeepLink(commerceId: number) {
  return `${APP_SCHEME}://commerce/${commerceId}`;
}

export function buildWebPanelPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}
