import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PromoLogo from "../../components/promy/PromoLogo";
import { theme } from "../../styles/theme";

export default function SplashScreen() {
  const brandTranslate = useRef(new Animated.Value(8)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(0.96)).current;
  const loaderOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(brandTranslate, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.02,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(loaderOpacity, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 0.97,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(loaderOpacity, {
            toValue: 0.45,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, [brandOpacity, brandTranslate, loaderOpacity, pulseScale]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.glowYellow} />
      <View style={styles.glowRed} />

      <Animated.View
        style={[
          styles.logoBlock,
          {
            opacity: brandOpacity,
            transform: [{ translateY: brandTranslate }, { scale: pulseScale }],
          },
        ]}
      >
        <PromoLogo size="lg" />
        <Text style={styles.brand}>PROMY</Text>
      </Animated.View>

      <Animated.Text style={[styles.subtitle, { opacity: brandOpacity }]}>
        Promociones reales, locales cerca tuyo
      </Animated.Text>

      <Animated.View style={[styles.loaderRow, { opacity: loaderOpacity }]}>
        <View style={[styles.loaderDot, styles.loaderDotPrimary]} />
        <View style={[styles.loaderDot, styles.loaderDotAccent]} />
        <View style={styles.loaderDash} />
      </Animated.View>
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
  loaderRow: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loaderDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  loaderDotPrimary: {
    backgroundColor: theme.colors.primary,
  },
  loaderDotAccent: {
    backgroundColor: theme.colors.accentRed,
  },
  loaderDash: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(17,17,17,0.14)",
  },
});
