import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../../styles/theme";

type DiscountBadgeProps = {
  discount?: string | number | null;
  label?: string;
  size?: "sm" | "md";
};

export function DiscountBadge({
  discount,
  label,
  size = "md",
}: DiscountBadgeProps) {
  const content = label ?? (discount != null ? `-${discount}%` : "PROMO");

  return (
    <View
      style={[
        styles.badge,
        size === "sm" ? styles.badgeSm : styles.badgeMd,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          size === "sm" ? styles.textSm : styles.textMd,
        ]}
      >
        {content}
      </Text>
    </View>
  );
}

export function HotBadge() {
  return (
    <View style={styles.hotBadge}>
      <Text style={styles.hotText}>HOT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: theme.colors.accentRed,
    borderRadius: theme.radius.pill,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadow.soft,
  },
  badgeSm: {
    minHeight: 24,
  },
  badgeMd: {
    minHeight: 30,
  },
  badgeText: {
    color: theme.colors.white,
    fontWeight: "900",
  },
  textSm: {
    fontSize: theme.fontSize.xs,
  },
  textMd: {
    fontSize: theme.fontSize.sm,
  },
  hotBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    minHeight: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    ...theme.shadow.soft,
  },
  hotText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xs,
    fontWeight: "900",
  },
});
