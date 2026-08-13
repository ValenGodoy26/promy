import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../styles/theme";

type ButtonTone = "light" | "dark";
type InputTone = "light" | "warm";

type SearchBarProps = {
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  onPressFilters?: () => void;
  buttonTone?: ButtonTone;
  inputTone?: InputTone;
};

export default function SearchBar({
  value = "",
  placeholder = "Buscar promociones o locales...",
  onChangeText,
  onPressFilters,
  buttonTone = "light",
  inputTone = "light",
}: SearchBarProps) {
  const isDarkButton = buttonTone === "dark";
  const isWarmInput = inputTone === "warm";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchBox,
          isWarmInput ? styles.searchBoxWarm : styles.searchBoxLight,
        ]}
      >
        <Feather
          name="search"
          size={24}
          color={theme.colors.textMuted}
          style={styles.searchIcon}
        />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPressFilters}
        style={[
          styles.filterButton,
          isDarkButton ? styles.filterButtonDark : styles.filterButtonLight,
        ]}
      >
        <Feather
          name="sliders"
          size={22}
          color={isDarkButton ? theme.colors.white : theme.colors.blackSoft}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchBox: {
    flex: 1,
    minHeight: 72,
    borderRadius: 28,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  searchBoxLight: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
  },
  searchBoxWarm: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: theme.colors.blackSoft,
    paddingVertical: 0,
  },
  filterButton: {
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  filterButtonLight: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
  },
  filterButtonDark: {
    backgroundColor: theme.colors.blackSoft,
    borderColor: theme.colors.blackSoft,
  },
});