import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PromoLogo from "../../components/promy/PromoLogo";
import { theme } from "../../styles/theme";

export default function SplashScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.glowYellow} />
      <View style={styles.glowRed} />

      <View style={styles.logoBlock}>
        <PromoLogo size="lg" />
        <Text style={styles.brand}>PROMY</Text>
      </View>

      <Text style={styles.subtitle}>Promociones reales, locales cerca tuyo</Text>

      <ActivityIndicator
        size="small"
        color={theme.colors.accentRed}
        style={styles.loader}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  glowYellow: {
    position: "absolute",
    top: 120,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(255,191,0,0.18)",
  },
  glowRed: {
    position: "absolute",
    bottom: 120,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: "rgba(255,49,49,0.09)",
  },
  logoBlock: {
    alignItems: "center",
    gap: 18,
    marginBottom: 16,
  },
  brand: {
    fontSize: 36,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    lineHeight: 22,
    textAlign: "center",
    color: theme.colors.textMuted,
    maxWidth: 280,
    fontWeight: "500",
  },
  loader: {
    marginTop: 28,
  },
});
