type DeepLinkEntity = "promotion" | "commerce" | "home" | "explore" | "map" | "profile";

const APP_SCHEME = "promy";
const WEB_APP_HOSTS = ["https://promy.app", "https://www.promy.app"];

export function buildPromotionDeepLink(promotionId: number) {
  return `${APP_SCHEME}://promotion/${promotionId}`;
}

export function buildCommerceDeepLink(commerceId: number) {
  return `${APP_SCHEME}://commerce/${commerceId}`;
}

export function buildAppSectionDeepLink(section: Exclude<DeepLinkEntity, "promotion" | "commerce">) {
  return `${APP_SCHEME}://${section}`;
}

export function getMobileDeepLinkPrefixes() {
  return [`${APP_SCHEME}://`, ...WEB_APP_HOSTS];
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function resolveNotificationDeepLink(data: Record<string, unknown> | null | undefined) {
  if (!data) return null;

  const deepLink = typeof data.deepLink === "string" ? data.deepLink.trim() : "";
  if (deepLink) {
    return deepLink;
  }

  const promotionId = getNumber(data.promotionId);
  if (promotionId) {
    return buildPromotionDeepLink(promotionId);
  }

  const commerceId = getNumber(data.commerceId);
  if (commerceId) {
    return buildCommerceDeepLink(commerceId);
  }

  const section = typeof data.section === "string" ? data.section.trim().toLowerCase() : "";
  if (section === "home" || section === "explore" || section === "map" || section === "profile") {
    return buildAppSectionDeepLink(section);
  }

  return null;
}

export function extractNotificationData(event: unknown) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const root = event as {
    notification?: { request?: { content?: { data?: Record<string, unknown> } } };
    request?: { content?: { data?: Record<string, unknown> } };
  };

  return root.notification?.request?.content?.data || root.request?.content?.data || null;
}
