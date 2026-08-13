import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../styles/theme";

type CategoryCardProps = {
  label: string;
  icon: React.ReactNode;
  tint: string;
};

export default function CategoryCard({
  label,
  icon,
  tint,
}: CategoryCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: tint }]}>{icon}</View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "30.8%",
    minHeight: 136,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...theme.shadow.soft,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    color: theme.colors.text,
    textAlign: "center",
    fontWeight: "800",
    lineHeight: 17,
    minHeight: 34,
  },
});
