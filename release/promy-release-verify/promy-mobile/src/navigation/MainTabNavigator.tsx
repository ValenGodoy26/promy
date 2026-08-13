import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import HomeScreen from "../screens/main/HomeScreen";
import CategoriesScreen from "../screens/main/CategoriesScreen";
import CommercesScreen from "../screens/main/CommercesScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import { theme } from "../styles/theme";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

// Color del tinte activo según pantalla — amarillo o rojo según la energía de la sección
const ACTIVE_TINT: Record<string, string> = {
  Inicio: theme.colors.primary,    // amarillo  ← home = energía cálida
  Mapa: theme.colors.primary,      // amarillo  ← exploración = mismo
  Explorar: theme.colors.accentRed, // rojo     ← acción = búsqueda activa
  Perfil: theme.colors.primary,    // amarillo  ← perfil = tranquilo
};

type IconName = keyof typeof Feather.glyphMap;

const TAB_ICONS: Record<string, IconName> = {
  Inicio: "home",
  Mapa: "map-pin",
  Explorar: "compass",
  Perfil: "user",
};

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomGap = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const activeTint = ACTIVE_TINT[route.name] ?? theme.colors.primary;
        const iconName = TAB_ICONS[route.name] ?? "circle";

        return {
          headerShown: false,
          // Íconos
          tabBarIcon: ({ focused, color, size }) => (
            <Feather name={iconName} size={size ?? 22} color={color} />
          ),
          // Colores del tinte activo/inactivo — React Nav los aplica al ícono Y al label
          tabBarActiveTintColor: activeTint,
          tabBarInactiveTintColor: "rgba(15,15,16,0.35)",
          // Labels debajo del ícono
          tabBarShowLabel: true,
          tabBarLabel: ({ focused, color }) => (
            <Text
              style={[
                styles.label,
                { color },
                focused && styles.labelActive,
              ]}
              numberOfLines={1}
            >
              {route.name}
            </Text>
          ),
          // Estilo de la barra
          tabBarStyle: [
            styles.tabBar,
            { bottom: bottomGap },
          ],
          // Quita el fondo blanco / línea separator de iOS
          tabBarBackground: () => (
            <View style={StyleSheet.absoluteFill} />
          ),
          tabBarItemStyle: styles.tabItem,
        };
      }}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Mapa" component={CategoriesScreen} />
      <Tab.Screen name="Explorar" component={CommercesScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 20,
    right: 20,
    // Fondo claro semitransparente — crema suave
    backgroundColor: "rgba(255, 253, 248, 0.96)",
    borderRadius: 28,
    borderTopWidth: 0,
    // Borde sutil oscuro
    borderWidth: 0.5,
    borderColor: "rgba(15,15,16,0.10)",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
    height: 72,
    // Sombra suave
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    ...Platform.select({
      android: { elevation: 16 },
      default: {},
    }),
  },
  tabItem: {
    // Cada ítem ocupa espacio parejo
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingBottom: 0,
    paddingTop: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.1,
    marginTop: 2,
  },
  labelActive: {
    fontWeight: "900",
  },
});
