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
    minHeight: 122,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 26,
    paddingVertical: 12,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    ...theme.shadow.soft,
  },
  iconWrap: {
    width: 74,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    color: theme.colors.text,
    textAlign: "center",
    fontWeight: "900",
    lineHeight: 15,
    minHeight: 30,
  },
});
