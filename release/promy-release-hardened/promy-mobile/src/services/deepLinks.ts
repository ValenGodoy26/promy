import type { CommerceStackParamList } from "../navigation/types";

type DeepLinkEntity =
  | "promotion"
  | "commerce"
  | "validate"
  | "home"
  | "explore"
  | "map"
  | "profile"
  | "notifications"
  | "redemptions";

const APP_SCHEME = "promy";
const WEB_APP_HOSTS = ["https://promy.app", "https://www.promy.app"];

export function buildPromotionDeepLink(promotionId: number) {
  return `${APP_SCHEME}://promotion/${promotionId}`;
}

export function buildCommerceDeepLink(commerceId: number) {
  return `${APP_SCHEME}://commerce/${commerceId}`;
}

export function buildValidationDeepLink(validationCode: string) {
  const normalizedCode = normalizeValidationCode(validationCode);
  return `${APP_SCHEME}://validate?code=${encodeURIComponent(normalizedCode)}`;
}

export function buildAppSectionDeepLink(
  section: Exclude<DeepLinkEntity, "promotion" | "commerce" | "validate">,
) {
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

export function normalizeValidationCode(rawValue: string) {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return "";
  }

  const uppercased = trimmed.toUpperCase();
  const matchedFromRaw = uppercased.match(/PROMY-[A-Z0-9]+/);

  if (matchedFromRaw) {
    return matchedFromRaw[0];
  }

  try {
    const parsed = new URL(trimmed);
    const code = parsed.searchParams.get("code");

    if (code) {
      const normalizedFromQuery = code.trim().toUpperCase();
      const matchedFromQuery = normalizedFromQuery.match(/PROMY-[A-Z0-9]+/);
      return matchedFromQuery ? matchedFromQuery[0] : normalizedFromQuery;
    }
  } catch {
    // No era una URL valida; seguimos con el fallback de texto plano.
  }

  return uppercased;
}

export function extractValidationCodeFromUrl(url: string) {
  const normalized = normalizeValidationCode(url);
  return normalized.startsWith("PROMY-") ? normalized : null;
}

/**
 * Resuelve el deep link de una notificación para el rol CLIENT.
 * Prioridad: deepLink explícito → promotionId → commerceId → section.
 *
 * El resultado es una URL `promy://...` que React Navigation maneja
 * automáticamente via la config de linking del NavigationContainer.
 */
export function resolveNotificationDeepLink(
  data: Record<string, unknown> | null | undefined,
) {
  if (!data) return null;

  // 1. deepLink explícito del backend: máxima prioridad.
  const deepLink = typeof data.deepLink === "string" ? data.deepLink.trim() : "";
  if (deepLink) {
    return deepLink;
  }

  // 2. promotionId: navega al detalle de la promo.
  const promotionId = getNumber(data.promotionId);
  if (promotionId) {
    return buildPromotionDeepLink(promotionId);
  }

  // 3. commerceId: navega al detalle del comercio.
  const commerceId = getNumber(data.commerceId);
  if (commerceId) {
    return buildCommerceDeepLink(commerceId);
  }

  // 4. section: navega a una sección fija de la app.
  const section =
    typeof data.section === "string" ? data.section.trim().toLowerCase() : "";

  if (
    section === "home" ||
    section === "explore" ||
    section === "map" ||
    section === "profile" ||
    section === "notifications" || // ← REDEMPTION_VALIDATED usa este valor
    section === "redemptions"      // ← por si se usa en el futuro
  ) {
    return buildAppSectionDeepLink(
      section as Exclude<DeepLinkEntity, "promotion" | "commerce" | "validate">,
    );
  }

  return null;
}

/**
 * Resuelve la pantalla de destino para notificaciones del rol COMMERCE.
 * Como el CommerceStackNavigator es independiente del MainStackNavigator,
 * no podemos usar Linking.openURL para navegar dentro de él. En su lugar
 * usamos safeNavigate() con el nombre de pantalla que devuelve esta función.
 *
 * El backend siempre manda `webPath` en estas notificaciones:
 *   - REDEMPTION_CREATED     → webPath: "/commerce/redemptions"
 *   - COMMERCE_APPROVED      → webPath: "/commerce/profile"
 *   - COMMERCE_REJECTED      → webPath: "/commerce/profile"
 */
export function resolveCommerceNotificationScreen(
  data: Record<string, unknown> | null | undefined,
): keyof CommerceStackParamList {
  if (!data) return "CommerceDashboard";

  const webPath =
    typeof data.webPath === "string" ? data.webPath.trim().toLowerCase() : "";

  if (webPath.includes("/redemptions")) return "CommerceRedemptions";
  if (webPath.includes("/promotions")) return "CommercePromotions";
  if (webPath.includes("/profile")) return "CommerceProfile";

  // Fallback: dashboard del comercio.
  return "CommerceDashboard";
}

export function extractNotificationData(event: unknown) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const root = event as {
    notification?: { request?: { content?: { data?: Record<string, unknown> } } };
    request?: { content?: { data?: Record<string, unknown> } };
  };

  return (
    root.notification?.request?.content?.data ||
    root.request?.content?.data ||
    null
  );
}
