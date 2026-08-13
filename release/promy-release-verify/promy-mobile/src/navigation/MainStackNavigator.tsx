import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "./MainTabNavigator";
import type { MainStackParamList } from "./types";
import PromotionDetailScreen from "../screens/main/PromotionDetailScreen";
import CommerceDetailScreen from "../screens/main/CommerceDetailScreen";
import RedemptionsScreen from "../screens/main/RedemptionsScreen";
import FavoritesScreen from "../screens/main/FavoritesScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import LegalScreen from "../screens/legal/LegalScreen";

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Tabs"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Tabs" component={MainTabNavigator} />
      <Stack.Screen name="PromotionDetail" component={PromotionDetailScreen} />
      <Stack.Screen name="CommerceDetail" component={CommerceDetailScreen} />
      <Stack.Screen name="Redemptions" component={RedemptionsScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
    </Stack.Navigator>
  );
}
