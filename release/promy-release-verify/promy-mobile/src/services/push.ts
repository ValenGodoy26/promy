import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "../api/users";

const PUSH_TOKEN_STORAGE_KEY = "@promy/push-token";

type ExpoNotificationsModule = {
  AndroidImportance?: {
    MAX?: number;
  };
  addNotificationReceivedListener?: (
    listener: (event: unknown) => void,
  ) => { remove: () => void };
  addNotificationResponseReceivedListener?: (
    listener: (event: unknown) => void,
  ) => { remove: () => void };
  setNotificationHandler?: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
    }>;
  }) => void;
  setNotificationChannelAsync?: (
    channelId: string,
    channel: {
      name: string;
      importance?: number;
      vibrationPattern?: number[];
      lightColor?: string;
    },
  ) => Promise<void>;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (options?: { projectId?: string }) => Promise<{ data: string }>;
};

type ExpoConstantsModule = {
  appOwnership?: string | null;
  executionEnvironment?: string | null;
  deviceName?: string | null;
  expoConfig?: {
    extra?: {
      expoProjectId?: string;
    };
  };
  easConfig?: {
    projectId?: string;
  };
};

let notificationsConfigured = false;

function getNotificationsModule(): ExpoNotificationsModule | null {
  try {
    // Carga dinámica para no romper compilación ni runtime si todavía no instalaron la librería.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-notifications") as ExpoNotificationsModule;
  } catch {
    return null;
  }
}

function getExpoConstants(): ExpoConstantsModule | null {
  try {
    // Carga dinamica para no depender del paquete en tiempo de tipos.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-constants").default as ExpoConstantsModule;
  } catch {
    return null;
  }
}

function resolveProjectId() {
  const constants = getExpoConstants();
  const fromEnv = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID?.trim();
  const fromEas = constants?.easConfig?.projectId;
  const fromExtra = constants?.expoConfig?.extra?.expoProjectId;

  return fromEnv || fromEas || fromExtra || null;
}

export async function configurePushNotifications() {
  if (notificationsConfigured) return;

  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  Notifications.setNotificationHandler?.({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android" && Notifications.setNotificationChannelAsync) {
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance?.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF3131",
    });
  }

  notificationsConfigured = true;
}

export function subscribeToPushEvents(handlers: {
  onReceive?: () => void;
  onResponse?: (event: unknown) => void;
}) {
  const Notifications = getNotificationsModule();

  if (!Notifications) {
    return () => undefined;
  }

  const receivedSubscription = Notifications.addNotificationReceivedListener?.(() => {
    handlers.onReceive?.();
  });
  const responseSubscription = Notifications.addNotificationResponseReceivedListener?.((event) => {
    handlers.onResponse?.(event);
    handlers.onReceive?.();
  });

  return () => {
    receivedSubscription?.remove();
    responseSubscription?.remove();
  };
}

export async function getStoredPushToken() {
  return AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
}

async function storePushToken(token: string) {
  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
}

export async function clearStoredPushToken() {
  await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
}

export async function registerDeviceForPush() {
  const Notifications = getNotificationsModule();
  const constants = getExpoConstants();

  if (!Notifications) {
    return null;
  }

  if (
    constants?.executionEnvironment === "storeClient" ||
    constants?.appOwnership === "expo"
  ) {
    console.warn(
      "PROMY: el push remoto real no funciona dentro de Expo Go. Usa un development build para probarlo.",
    );
    return null;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn("PROMY: falta EXPO_PUBLIC_EXPO_PROJECT_ID para registrar push.");
    return null;
  }

  await configurePushNotifications();

  const currentPermissions = await Notifications.getPermissionsAsync();
  const finalPermissions =
    currentPermissions.status === "granted"
      ? currentPermissions
      : await Notifications.requestPermissionsAsync();

  if (finalPermissions.status !== "granted") {
    return null;
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const pushToken = tokenResponse.data;

  if (!pushToken) {
    return null;
  }

  await registerPushToken(
    pushToken,
    Platform.OS === "ios" ? "ios" : "android",
    constants?.deviceName || undefined,
  );
  await storePushToken(pushToken);

  return pushToken;
}

export async function syncDevicePushToken() {
  const previousToken = await getStoredPushToken();
  const nextToken = await registerDeviceForPush();

  if (!nextToken) {
    return null;
  }

  if (previousToken && previousToken !== nextToken) {
    try {
      await unregisterPushToken(previousToken);
    } catch (error) {
      console.warn("PROMY: no pudimos desactivar el token push anterior.", error);
    }
  }

  return nextToken;
}

export async function unregisterStoredPushToken() {
  const storedToken = await getStoredPushToken();

  if (!storedToken) {
    return;
  }

  try {
    await unregisterPushToken(storedToken);
  } finally {
    await clearStoredPushToken();
  }
}
