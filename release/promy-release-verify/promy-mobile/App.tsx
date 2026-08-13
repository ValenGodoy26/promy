import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import { mobileLinking } from "./src/navigation/linking";
import PushNotificationsBridge from "./src/bridges/PushNotificationsBridge";
import { AuthProvider } from "./src/context/AuthContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import { theme } from "./src/styles/theme";

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <FavoritesProvider>
          <NavigationContainer linking={mobileLinking}>
            <StatusBar style="dark" backgroundColor={theme.colors.background} />
            <PushNotificationsBridge />
            <AppNavigator />
          </NavigationContainer>
        </FavoritesProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
