import { useEffect } from "react";
import { Linking } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { extractNotificationData, resolveNotificationDeepLink } from "../services/deepLinks";
import {
  configurePushNotifications,
  subscribeToPushEvents,
  syncDevicePushToken,
} from "../services/push";

export default function PushNotificationsBridge() {
  const { session } = useAuth();
  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    void configurePushNotifications();
  }, []);

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") {
      return;
    }

    void syncDevicePushToken();
  }, [session]);

  useEffect(() => {
    if (!session || session.user.role !== "CLIENT") {
      return;
    }

    return subscribeToPushEvents({
      onReceive: () => {
        void refreshNotifications({ silent: true, force: true });
      },
      onResponse: (event) => {
        const deepLink = resolveNotificationDeepLink(extractNotificationData(event));
        if (deepLink) {
          void Linking.openURL(deepLink);
        }
      },
    });
  }, [refreshNotifications, session]);

  return null;
}
