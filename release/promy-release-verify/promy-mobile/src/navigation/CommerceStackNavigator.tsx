import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { CommerceStackParamList } from "./types";
import CommerceDashboardScreen from "../screens/commerce/CommerceDashboardScreen";
import CommerceProfileScreen from "../screens/commerce/CommerceProfileScreen";
import CommercePromotionsScreen from "../screens/commerce/CommercePromotionsScreen";
import CommercePromotionEditorScreen from "../screens/commerce/CommercePromotionEditorScreen";
import CommerceRedemptionsScreen from "../screens/commerce/CommerceRedemptionsScreen";

const Stack = createNativeStackNavigator<CommerceStackParamList>();

export default function CommerceStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="CommerceDashboard"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="CommerceDashboard" component={CommerceDashboardScreen} />
      <Stack.Screen name="CommerceProfile" component={CommerceProfileScreen} />
      <Stack.Screen name="CommercePromotions" component={CommercePromotionsScreen} />
      <Stack.Screen
        name="CommercePromotionEditor"
        component={CommercePromotionEditorScreen}
      />
      <Stack.Screen name="CommerceRedemptions" component={CommerceRedemptionsScreen} />
    </Stack.Navigator>
  );
}
