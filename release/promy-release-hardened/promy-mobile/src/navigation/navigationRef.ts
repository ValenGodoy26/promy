import { createNavigationContainerRef } from "@react-navigation/native";

/**
 * Referencia global al NavigationContainer.
 * Permite navegar programáticamente desde fuera de un componente React
 * (por ejemplo, desde PushNotificationsBridge al manejar un tap en una
 * notificación para el rol COMMERCE, que vive en un navigator separado
 * al que `Linking.openURL` no puede acceder directamente).
 *
 * Uso:
 *   import { navigationRef, safeNavigate } from "../navigation/navigationRef";
 *   safeNavigate("CommerceRedemptions");
 *
 * Siempre verificar con `navigationRef.isReady()` antes de navegar.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const navigationRef = createNavigationContainerRef<any>();

/**
 * Navega a una pantalla de forma segura.
 * Si el navigator todavía no está listo (app en cold start), ignora la llamada
 * sin tirar error — en ese caso el usuario ya está viendo la pantalla correcta
 * por el flujo normal de arranque.
 */
export function safeNavigate(screenName: string, params?: Record<string, unknown>) {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.navigate(screenName, params);
}
