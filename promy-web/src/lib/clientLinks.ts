const MOBILE_APP_SCHEME = "promy";

export function buildPromotionDeepLink(promotionId: number) {
  return `${MOBILE_APP_SCHEME}://promotion/${promotionId}`;
}

export function buildCommerceDeepLink(commerceId: number) {
  return `${MOBILE_APP_SCHEME}://commerce/${commerceId}`;
}

export function buildAppSectionDeepLink(section: "home" | "explore" | "map" | "profile") {
  return `${MOBILE_APP_SCHEME}://${section}`;
}

export function buildClientAppRoute(options?: {
  target?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  const params = new URLSearchParams();

  if (options?.target?.trim()) {
    params.set("target", options.target.trim());
  }

  if (options?.title?.trim()) {
    params.set("title", options.title.trim());
  }

  if (options?.description?.trim()) {
    params.set("description", options.description.trim());
  }

  const query = params.toString();
  return query ? `/client-app?${query}` : "/client-app";
}
