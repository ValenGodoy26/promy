import React from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import OnboardingScreen from "../screens/auth/OnboardingScreen";
import LegalScreen from "../screens/legal/LegalScreen";
import type { AuthStackParamList } from "./types";

// Re-export so existing screens that import AuthStackParamList from here keep working
export type { AuthStackParamList };

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const [initialRoute, setInitialRoute] = React.useState<
    "Onboarding" | "Login" | null
  >(null);

  React.useEffect(() => {
    AsyncStorage.getItem("@promy_onboarding_done")
      .then((val) => setInitialRoute(val ? "Login" : "Onboarding"))
      .catch(() => setInitialRoute("Login"));
  }, []);

  // Show blank yellow screen while we check AsyncStorage (matches onboarding bg)
  if (!initialRoute) {
    return <View style={{ flex: 1, backgroundColor: "#FFBF00" }} />;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: "fade" }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
    </Stack.Navigator>
  );
}
