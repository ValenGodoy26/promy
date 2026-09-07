import { useEffect, useRef } from "react";
import { Alert, Linking } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import {
  extractNotificationData,
  resolveCommerceNotificationScreen,
  resolveNotificationDeepLink,
} from "../services/deepLinks";
import {
  configurePushNotifications,
  PushSyncResult,
  subscribeToPushEvents,
  syncDevicePushToken,
} from "../services/push";
import { safeNavigate } from "../navigation/navigationRef";

function getClientPushFailureMessage(result: PushSyncResult) {
  if (result.ok) return null;

  switch (result.reason) {
    case "expo_go":
      return "Las notificaciones push reales no funcionan dentro de Expo Go. Para probarlas necesitas un development build instalado en el dispositivo.";
    case "missing_project_id":
      return "Falta la configuracion de Expo para registrar notificaciones push en este entorno.";
    case "permission_denied":
      return "PROMY no tiene permiso para enviarte notificaciones. Activalas desde los ajustes del dispositivo y vuelve a intentarlo.";
    case "module_unavailable":
      return "Este build no tiene disponible el modulo de notificaciones.";
    default:
      return "No pudimos activar las notificaciones en este momento.";
  }
}

export default function PushNotificationsBridge() {
  const { session } = useAuth();
  const { refreshNotifications } = useNotifications();
  const pushPromptShownRef = useRef(false);

  // Configuración base de push (canal Android, handler de foreground).
  // Siempre se configura, independientemente del rol.
  useEffect(() => {
    void configurePushNotifications();
  }, []);

  // ── Registro de token para CLIENT ──────────────────────────────────────
  // Mostramos un dialog pidiendo permiso antes de registrar el token.
  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") {
      return;
    }

    if (pushPromptShownRef.current) {
      return;
    }

    pushPromptShownRef.current = true;

    Alert.alert(
      "Quieres enterarte cuando validen tus canjes?",
      "Si activas las notificaciones, PROMY puede avisarte cuando una promo se valida o cuando haya novedades importantes en tu cuenta.",
      [
        { text: "Ahora no", style: "cancel" },
        {
          text: "Activar",
          onPress: () =>
            void (async () => {
              const result = await syncDevicePushToken();
              const message = getClientPushFailureMessage(result);
              if (message) {
                Alert.alert("No pudimos activar las notificaciones", message);
              }
            })(),
        },
      ],
      { cancelable: true },
    );
  }, [session]);

  // ── Registro de token para COMMERCE ────────────────────────────────────
  // El comercio necesita push para recibir "nuevo canje pendiente".
  // Lo registramos silenciosamente la primera vez que inician sesión,
  // sin dialog — el comercio ya sabe que el sistema les manda avisos.
  useEffect(() => {
    if (!session || session.user.role !== "COMMERCE") {
      return;
    }

    if (pushPromptShownRef.current) {
      return;
    }

    pushPromptShownRef.current = true;

    // Silent registration: si falla (sin permiso, Expo Go, etc.) se ignora.
    void syncDevicePushToken().catch(() => undefined);
  }, [session]);

  // ── Suscripción a eventos de push ──────────────────────────────────────
  // Activa para CLIENT y COMMERCE. ADMIN no usa la app mobile.
  useEffect(() => {
    if (!session) {
      return;
    }

    const role = session.user.role;

    if (role !== "CLIENT" && role !== "COMMERCE") {
      return;
    }

    return subscribeToPushEvents({
      // La notificación llegó mientras la app está en primer plano:
      // refrescamos el contador de no leídas para que el badge se actualice.
      onReceive: () => {
        void refreshNotifications({ silent: true, force: true });
      },

      // El usuario tocó la notificación (app en background o cerrada):
      // navegamos a la pantalla correspondiente según el rol.
      onResponse: (event) => {
        const data = extractNotificationData(event);

        if (role === "CLIENT") {
          // CLIENT: usamos deep links por URL. React Navigation los resuelve
          // automáticamente gracias a la config de linking en App.tsx.
          const deepLink = resolveNotificationDeepLink(data);
          if (deepLink) {
            void Linking.openURL(deepLink);
          }
          return;
        }

        if (role === "COMMERCE") {
          // COMMERCE: el CommerceStackNavigator es independiente del
          // MainStackNavigator, por lo que los deep links por URL no funcionan.
          // Usamos navegación programática via navigationRef.
          const screen = resolveCommerceNotificationScreen(data);
          safeNavigate(screen);
        }
      },
    });
  }, [refreshNotifications, session]);

  return null;
}
