import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import PromoLogo from "./PromoLogo";
import { hasUsableRemoteImage } from "../../utils/promy";

type CommerceCardProps = {
  image?: string | null;
  name: string;
  category?: string;
  address?: string;
  promotionsCount?: number;
  distance?: string;
};

export default function CommerceCard({
  image,
  name,
  category,
  address,
  promotionsCount,
  distance,
}: CommerceCardProps) {
  const initialHasImage = useMemo(() => hasUsableRemoteImage(image), [image]);
  const [showImage, setShowImage] = useState(initialHasImage);

  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.card}>
      {showImage && image ? (
        <Image
          source={{ uri: image }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="disk"
          transition={160}
          onError={() => setShowImage(false)}
        />
      ) : (
        <View style={styles.placeholder}>
          <View style={styles.placeholderGlow} />
          <PromoLogo size="sm" />
          <Text style={styles.placeholderName} numberOfLines={2}>{name}</Text>
          {category ? <Text style={styles.placeholderCategory} numberOfLines={1}>{category}</Text> : null}
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        {category ? <Text style={styles.category}>{category}</Text> : null}
        {address ? (
          <Text style={styles.address} numberOfLines={2}>
            {address}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {typeof promotionsCount === "number" ? (
            <View style={styles.metaItem}>
              <Feather name="tag" size={13} color={theme.colors.accentRedDark} />
              <Text style={styles.metaText}>{promotionsCount} promos</Text>
            </View>
          ) : null}

          {distance ? (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={13} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{distance}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  image: {
    width: 108,
    height: 120,
    backgroundColor: theme.colors.surfaceAlt,
  },
  placeholder: {
    width: 108,
    height: 120,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 10,
  },
  placeholderGlow: {
    position: "absolute",
    right: -16,
    top: -14,
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: "rgba(255,191,0,0.18)",
  },
  placeholderName: {
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.text,
    fontWeight: "800",
    textAlign: "center",
  },
  placeholderCategory: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "700",
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  category: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accentRedDark,
    fontWeight: "800",
    marginBottom: 4,
  },
  address: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
});
