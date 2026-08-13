import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import PromoLogo from "./PromoLogo";
import { DiscountBadge, HotBadge } from "./DiscountBadge";
import { hasUsableRemoteImage } from "../../utils/promy";

type PromoCardProps = {
  image?: string | null;
  title: string;
  business: string;
  discount?: number | null;
  badgeLabel?: string;
  originalPrice?: string;
  newPrice?: string;
  description?: string;
  rating?: string;
  distance?: string;
  hot?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
};

export default function PromoCard({
  image,
  title,
  business,
  discount,
  badgeLabel,
  originalPrice,
  newPrice,
  description,
  rating,
  distance,
  hot = false,
  compact = false,
  fullWidth = false,
}: PromoCardProps) {
  const initialHasImage = useMemo(() => hasUsableRemoteImage(image), [image]);
  const [showImage, setShowImage] = useState(initialHasImage);

  const imageBlock = showImage && image ? (
    <Image
      source={{ uri: image }}
      style={compact ? styles.compactImage : styles.image}
      contentFit="cover"
      cachePolicy="disk"
      transition={160}
      onError={() => setShowImage(false)}
    />
  ) : (
    <View style={compact ? styles.compactPlaceholder : styles.placeholder}>
      <View style={styles.placeholderGlow} />
      <PromoLogo size={compact ? "sm" : "md"} />
      <Text style={compact ? styles.compactPlaceholderTitle : styles.placeholderTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.placeholderBusiness} numberOfLines={1}>{business}</Text>
    </View>
  );

  if (compact) {
    return (
      <TouchableOpacity activeOpacity={0.92} style={styles.compactCard}>
        <View style={styles.compactImageWrap}>
          {imageBlock}
          <View style={styles.compactBadge}>
            <DiscountBadge discount={discount} label={badgeLabel} size="sm" />
          </View>
        </View>

        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.compactBusiness} numberOfLines={1}>
            {business}
          </Text>
          <Text style={styles.compactMeta} numberOfLines={2}>
            {newPrice || description || "Promo activa"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.94}
      style={[styles.card, fullWidth && styles.cardFullWidth]}
    >
      <View style={[styles.imageWrap, fullWidth && styles.imageWrapFullWidth]}>
        {imageBlock}
        <View style={styles.topLeft}>
          <DiscountBadge discount={discount} label={badgeLabel} />
        </View>
        {hot ? (
          <View style={styles.topRight}>
            <HotBadge />
          </View>
        ) : null}
      </View>

      <View style={[styles.content, fullWidth && styles.contentFullWidth]}>
        <Text style={styles.business} numberOfLines={1}>
          {business}
        </Text>

        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {newPrice ? (
          <View style={styles.priceRow}>
            <Text style={styles.newPrice}>{newPrice}</Text>
            {originalPrice ? <Text style={styles.oldPrice}>{originalPrice}</Text> : null}
          </View>
        ) : description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {distance ? (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={13} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{distance}</Text>
            </View>
          ) : <View />}

          {rating ? (
            <View style={styles.metaItem}>
              <Feather name="star" size={13} color={theme.colors.primaryDark} />
              <Text style={styles.metaTextStrong}>{rating}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 248,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 28,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  cardFullWidth: {
    width: "100%",
  },
  imageWrap: {
    height: 168,
    position: "relative",
    backgroundColor: theme.colors.surfaceAlt,
  },
  imageWrapFullWidth: {
    height: 200,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    backgroundColor: "#F4EFE2",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    padding: 18,
    gap: 10,
  },
  compactPlaceholder: {
    flex: 1,
    backgroundColor: "#F4EFE2",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    padding: 12,
    gap: 6,
  },
  placeholderGlow: {
    position: "absolute",
    right: -20,
    top: -18,
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: "rgba(255,191,0,0.16)",
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
    lineHeight: 22,
  },
  compactPlaceholderTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
  },
  placeholderBusiness: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  topLeft: {
    position: "absolute",
    left: 12,
    top: 12,
  },
  topRight: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  content: {
    padding: 16,
  },
  contentFullWidth: {
    paddingTop: 18,
    paddingBottom: 18,
  },
  business: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginBottom: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
    marginBottom: 10,
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 12,
  },
  newPrice: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  oldPrice: {
    color: theme.colors.textSoft,
    fontSize: 12,
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  metaTextStrong: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    fontWeight: "800",
  },
  compactCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  compactImageWrap: {
    width: 136,
    height: 104,
    position: "relative",
    backgroundColor: theme.colors.surfaceAlt,
  },
  compactImage: {
    width: "100%",
    height: "100%",
  },
  compactBadge: {
    position: "absolute",
    left: 10,
    top: 10,
  },
  compactContent: {
    flex: 1,
    padding: 14,
    justifyContent: "center",
    gap: 4,
  },
  compactTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.text,
  },
  compactBusiness: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  compactMeta: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "800",
  },
});
