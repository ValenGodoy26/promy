import React from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import { theme } from "../../styles/theme";

type PromoLogoProps = {
  size?: "sm" | "md" | "lg";
};

const PROMY_LOGO: ImageSourcePropType = require("../../../assets/promy-logo.png");

export default function PromoLogo({ size = "md" }: PromoLogoProps) {
  const shellMap = {
    sm: 42,
    md: 54,
    lg: 84,
  };

  const imageMap = {
    sm: 26,
    md: 34,
    lg: 56,
  };

  const shellSize = shellMap[size];
  const imageSize = imageMap[size];

  return (
    <View
      style={[
        styles.shell,
        {
          width: shellSize,
          height: shellSize,
          borderRadius: shellSize / 2,
        },
      ]}
    >
      <Image
        source={PROMY_LOGO}
        resizeMode="contain"
        style={{ width: imageSize, height: imageSize }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.06)",
    ...theme.shadow.soft,
  },
});
