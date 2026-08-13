import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import PromoLogo from "../../components/promy/PromoLogo";
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../types/api";
import { theme } from "../../styles/theme";

type RoleGuardScreenProps = {
  role: UserRole;
};

const roleCopy: Record<UserRole, { title: string; description: string; hint: string }> = {
  CLIENT: {
    title: "Modo cliente",
    description: "Este rol ya está operativo en PROMY.",
    hint: "Si llegaste acá por error, cerrá sesión e ingresá con la cuenta correcta.",
  },
  COMMERCE: {
    title: "Comercio · Panel web",
    description:
      "Tu cuenta está configurada como comercio. En el MVP, la operación del negocio vive en el panel web y la app mobile queda enfocada en clientes.",
    hint: "Abrí PROMY Web desde tu navegador para gestionar promociones, validar canjes y editar tu comercio.",
  },
  ADMIN: {
    title: "Admin · Panel web",
    description:
      "El módulo de administración opera exclusivamente desde el panel web. La app mobile es solo para usuarios clientes.",
    hint: "Accedé al panel admin desde tu navegador en la PC donde corre promy-web.",
  },
};

export default function RoleGuardScreen({ role }: RoleGuardScreenProps) {
  const { signOut } = useAuth();
  const copy = roleCopy[role] ?? {
    title: "Rol no reconocido",
    description: "Este rol no tiene interfaz mobile asignada.",
    hint: "Contactá al administrador del sistema.",
  };

  const isAdmin = role === "ADMIN";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.glowYellow} />
      <View style={styles.glowRed} />

      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <PromoLogo size="lg" />
        </View>

        <View style={[styles.badge, isAdmin && styles.badgeAdmin]}>
          <Feather
            name={isAdmin ? "monitor" : "shield"}
            size={14}
            color={isAdmin ? theme.colors.primary : theme.colors.primary}
          />
          <Text style={styles.badgeText}>
            Rol detectado: {role}
          </Text>
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.description}>{copy.description}</Text>

        <View style={styles.infoBox}>
          <Feather
            name="info"
            size={14}
            color={theme.colors.textMuted}
            style={{ marginBottom: 6 }}
          />
          <Text style={styles.infoText}>{copy.hint}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.logoutButton}
          onPress={() => void signOut()}
        >
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  glowYellow: {
    position: "absolute",
    top: 80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,191,0,0.18)",
  },
  glowRed: {
    position: "absolute",
    bottom: 90,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,49,49,0.08)",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 22,
    ...theme.shadow.card,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 18,
  },
  badge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.headerDark,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  badgeAdmin: {
    backgroundColor: theme.colors.primaryBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    textAlign: "center",
    color: theme.colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: theme.colors.textMuted,
    fontWeight: "500",
    marginBottom: 20,
  },
  infoBox: {
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 18,
    alignItems: "center",
  },
  infoText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: theme.colors.textMuted,
    fontWeight: "500",
    textAlign: "center",
  },
  logoutButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.accentRed,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
