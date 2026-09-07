import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../styles/theme";

type FilterChipProps = {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
};

export default function FilterChip({
  label,
  icon,
  active = false,
}: FilterChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    >
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  chipInactive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.accentRedSoft,
    borderColor: "rgba(232,55,42,0.35)",
    shadowColor: theme.colors.accentRedDark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 12.2,
    fontWeight: "800",
  },
  textInactive: {
    color: theme.colors.textMuted,
  },
  textActive: {
    color: theme.colors.accentRedDark,
  },
});
