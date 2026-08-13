import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../styles/theme";

type PlaceholderVariant = "hero" | "card" | "thumb" | "wide";

type PromoImagePlaceholderProps = {
  commerceName?: string | null;
  categoryName?: string | null;
  title?: string | null;
  label?: string;
  variant?: PlaceholderVariant;
  style?: StyleProp<ViewStyle>;
};

type PlaceholderVisual = {
  background: string;
  accent: string;
  softAccent: string;
  icon: React.ReactNode;
  categoryLabel: string;
};

function normalize(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getPlaceholderVisual(categoryName?: string | null): PlaceholderVisual {
  const value = normalize(categoryName);

  if (value.includes("bar") || value.includes("cerve") || value.includes("trag")) {
    return {
      background: "#FFF0E7",
      accent: "#FF8A30",
      softAccent: "rgba(255,138,48,0.16)",
      icon: <MaterialCommunityIcons name="glass-cocktail" size={26} color="#FF8A30" />,
      categoryLabel: "Bares",
    };
  }

  if (value.includes("cafe") || value.includes("cafeter")) {
    return {
      background: "#FFF1DD",
      accent: "#B86A1B",
      softAccent: "rgba(184,106,27,0.15)",
      icon: <MaterialCommunityIcons name="coffee-outline" size={26} color="#B86A1B" />,
      categoryLabel: "Cafeterías",
    };
  }

  if (value.includes("gastro") || value.includes("resto") || value.includes("restaurant")) {
    return {
      background: "#FFE8E6",
      accent: theme.colors.accentRed,
      softAccent: "rgba(255,49,49,0.13)",
      icon: <MaterialCommunityIcons name="silverware-fork-knife" size={25} color={theme.colors.accentRed} />,
      categoryLabel: "Gastronomía",
    };
  }

  if (value.includes("gym") || value.includes("gim") || value.includes("fitness")) {
    return {
      background: "#E8F1FF",
      accent: "#2F80ED",
      softAccent: "rgba(47,128,237,0.15)",
      icon: <MaterialCommunityIcons name="dumbbell" size={25} color="#2F80ED" />,
      categoryLabel: "Gimnasios",
    };
  }

  if (value.includes("helad")) {
    return {
      background: "#FFF6D9",
      accent: "#E7A400",
      softAccent: "rgba(231,164,0,0.16)",
      icon: <MaterialCommunityIcons name="ice-cream" size={26} color="#E7A400" />,
      categoryLabel: "Heladerías",
    };
  }

  if (
    value.includes("estet") ||
    value.includes("belle") ||
    value.includes("pelu") ||
    value.includes("spa")
  ) {
    return {
      background: "#FFE8F5",
      accent: "#E252A0",
      softAccent: "rgba(226,82,160,0.14)",
      icon: <Feather name="star" size={24} color="#E252A0" />,
      categoryLabel: "Estética",
    };
  }

  if (value.includes("servicio") || value.includes("taller") || value.includes("lavadero")) {
    return {
      background: "#F4EFE4",
      accent: "#8A5A2A",
      softAccent: "rgba(138,90,42,0.13)",
      icon: <Feather name="tag" size={24} color="#8A5A2A" />,
      categoryLabel: "Servicios",
    };
  }

  return {
    background: "#FFF7E7",
    accent: theme.colors.primaryDark,
    softAccent: "rgba(255,191,0,0.16)",
    icon: <Feather name="zap" size={24} color={theme.colors.primaryDark} />,
    categoryLabel: "Promo local",
  };
}

export default function PromoImagePlaceholder({
  commerceName,
  categoryName,
  title,
  label,
  variant = "card",
  style,
}: PromoImagePlaceholderProps) {
  const visual = getPlaceholderVisual(categoryName);
  const isThumb = variant === "thumb";
  const isHero = variant === "hero";
  const isWide = variant === "wide";

  const titleText = commerceName || title || "PROMY";
  const subtitleText = label || categoryName || visual.categoryLabel;

  return (
    <View
      style={[
        styles.base,
        styles[variant],
        { backgroundColor: visual.background },
        style,
      ]}
    >
      <View style={[styles.orbLarge, { backgroundColor: visual.softAccent }]} />
      <View style={[styles.orbSmall, { backgroundColor: visual.softAccent }]} />
      <View style={[styles.iconShell, isThumb && styles.iconShellThumb, { backgroundColor: visual.softAccent }]}>
        {visual.icon}
      </View>

      {!isThumb ? (
        <View style={[styles.copy, isHero && styles.copyHero, isWide && styles.copyWide]}>
          <Text
            style={[
              styles.eyebrow,
              { color: visual.accent },
              isHero && styles.eyebrowHero,
            ]}
            numberOfLines={1}
          >
            {subtitleText}
          </Text>
          <Text
            style={[styles.title, isHero && styles.titleHero, isWide && styles.titleWide]}
            numberOfLines={isHero ? 2 : 1}
          >
            {titleText}
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            Promo activa · Validada
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  hero: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  thumb: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  wide: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  orbLarge: {
    position: "absolute",
    width: 142,
    height: 142,
    borderRadius: 80,
    right: -46,
    top: -42,
  },
  orbSmall: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 50,
    left: -24,
    bottom: -20,
  },
  iconShell: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconShellThumb: {
    width: 42,
    height: 42,
    borderRadius: 16,
    marginBottom: 0,
  },
  copy: {
    width: "86%",
    alignItems: "center",
  },
  copyHero: {
    width: "78%",
  },
  copyWide: {
    alignItems: "flex-start",
    width: "74%",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  eyebrowHero: {
    fontSize: 11,
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
    letterSpacing: -0.35,
    textAlign: "center",
  },
  titleHero: {
    fontSize: 20,
    lineHeight: 23,
  },
  titleWide: {
    textAlign: "left",
    fontSize: 18,
    lineHeight: 22,
  },
  caption: {
    marginTop: 5,
    color: theme.colors.textMuted,
    fontSize: 10.5,
    fontWeight: "700",
  },
});
