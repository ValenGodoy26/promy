import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme } from "../../styles/theme";

type AnyNav = { replace: (screen: string) => void };

const { width: SCREEN_W } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "map-pin" as const,
    iconBg: "#FFBF00",
    title: "Encontra promos\ncerca tuyo.",
    subtitle:
      "PROMY ordena beneficios reales de comercios locales segun tu zona o la ciudad activa.",
    accent: theme.colors.primary,
  },
  {
    icon: "tag" as const,
    iconBg: "#FF3131",
    title: "Elegi la que\nte sirve.",
    subtitle:
      "Filtra por rubro, distancia o busqueda. Vas a ver promos activas, claras y faciles de usar.",
    accent: theme.colors.accentRed,
  },
  {
    icon: "smartphone" as const,
    iconBg: "#111111",
    title: "Mostrala en\nel local.",
    subtitle:
      "Abris el beneficio, generas el codigo o QR y lo mostras antes de pagar.",
    accent: theme.colors.text,
  },
  {
    icon: "check-circle" as const,
    iconBg: "#24A865",
    title: "El comercio\nla valida.",
    subtitle:
      "Sin puntos raros ni vueltas: el local valida el canje y queda guardado en tu historial.",
    accent: theme.colors.success,
  },
];

const NUM_SLIDES = SLIDES.length;

export default function OnboardingScreen() {
  const navigation = useNavigation<AnyNav>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const finish = () => {
    void AsyncStorage.setItem("@promy_onboarding_done", "1").catch(() => null);
    navigation.replace("Login");
  };

  const goNext = () => {
    if (currentIndex < NUM_SLIDES - 1) {
      const next = currentIndex + 1;
      Animated.timing(slideAnim, {
        toValue: -next * SCREEN_W,
        duration: 320,
        useNativeDriver: true,
      }).start();
      setCurrentIndex(next);
    } else {
      finish();
    }
  };

  const slide = SLIDES[currentIndex];
  const isLast = currentIndex === NUM_SLIDES - 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.primary} />

      <SafeAreaView edges={["top"]} style={styles.topBar}>
        {!isLast ? (
          <TouchableOpacity onPress={finish} hitSlop={12}>
            <Text style={styles.skipText}>Omitir</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>
      </SafeAreaView>

      <Animated.View
        style={[styles.slidesTrack, { transform: [{ translateX: slideAnim }] }]}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={styles.slide}>
            <View style={[styles.iconCircle, { backgroundColor: s.iconBg }]}>
              <Feather name={s.icon} size={44} color="#FFFFFF" />
            </View>
            <Text style={styles.slideTitle}>{s.title}</Text>
            <Text style={styles.slideSubtitle}>{s.subtitle}</Text>
          </View>
        ))}
      </Animated.View>

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.cta, { backgroundColor: slide.accent }]}
          onPress={goNext}
        >
          <Text style={styles.ctaText}>{isLast ? "Empezar" : "Siguiente"}</Text>
          <Feather name={isLast ? "zap" : "arrow-right"} size={17} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(15,15,16,0.55)",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15,15,16,0.22)",
  },
  dotActive: {
    width: 18,
    backgroundColor: theme.colors.text,
  },
  slidesTrack: {
    flex: 1,
    flexDirection: "row",
    width: SCREEN_W * NUM_SLIDES,
  },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 20,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  slideTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -1,
    lineHeight: 40,
    textAlign: "center",
  },
  slideSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "rgba(15,15,16,0.62)",
    textAlign: "center",
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 999,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
});
