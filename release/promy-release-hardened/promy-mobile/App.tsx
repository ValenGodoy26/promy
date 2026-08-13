import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import { mobileLinking } from "./src/navigation/linking";
import { navigationRef } from "./src/navigation/navigationRef";
import DeepLinkBridge from "./src/bridges/DeepLinkBridge";
import PushNotificationsBridge from "./src/bridges/PushNotificationsBridge";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import { initMobileSentry, setMobileSentryRouteContext, setMobileSentryUserContext, Sentry } from "./src/lib/sentry";
import { theme } from "./src/styles/theme";

initMobileSentry();

function ObservabilityBridge() {
  const { session } = useAuth();

  React.useEffect(() => {
    setMobileSentryUserContext(session?.user ?? null);
  }, [session]);

  return null;
}

function App() {
  const handleNavigationStateChange = React.useCallback(() => {
    if (!navigationRef.isReady()) {
      return;
    }

    const currentRoute = navigationRef.getCurrentRoute();
    setMobileSentryRouteContext(currentRoute?.name, currentRoute?.params);
  }, []);

  return (
    <AuthProvider>
      <NotificationsProvider>
        <FavoritesProvider>
          {/*
           * ref={navigationRef} permite a PushNotificationsBridge navegar
           * programaticamente para el rol COMMERCE, que vive en un navigator
           * separado al que los deep links por URL no tienen acceso.
           */}
          <NavigationContainer
            ref={navigationRef}
            linking={mobileLinking}
            onReady={handleNavigationStateChange}
            onStateChange={handleNavigationStateChange}
          >
            <StatusBar style="dark" backgroundColor={theme.colors.background} />
            <ObservabilityBridge />
            <DeepLinkBridge />
            <PushNotificationsBridge />
            <AppNavigator />
          </NavigationContainer>
        </FavoritesProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}

export default Sentry.wrap(App);
