import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import PromoLogo from "../../components/promy/PromoLogo";
import {
  BadgePill,
  EmptyState,
  LoadingState,
  ScreenHeader,
  Segmented,
} from "../../components/promy/PromyUI";
import {
  FavoriteCommerceItem,
  FavoritePromotionItem,
  useFavorites,
} from "../../context/FavoritesContext";
import type { MainStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import {
  getCommerceHeadline,
  getPromotionBadgeLabel,
  getPromotionImage,
} from "../../utils/promy";
import { DEFAULT_CITY_LABEL } from "../../services/location";

type Filter = "promotions" | "commerces";

// ── Card promo ──────────────────────────────────────
function FavoritePromotionCard({
  item,
  onOpen,
  onRemove,
}: {
  item: FavoritePromotionItem;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const image = getPromotionImage(item, item.commerce);
  const isExpired = item.endDate ? new Date(item.endDate) < new Date() : false;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[styles.promoCard, isExpired && styles.promoCardExpired]}
      onPress={onOpen}
    >
      {isExpired && (
        <View style={styles.expiredBanner}>
          <Feather name="clock" size={10} color="#fff" />
          <Text style={styles.expiredBannerText}>Expirada</Text>
        </View>
      )}
      <View style={styles.promoImageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.promoImage} resizeMode="cover" />
        ) : (
          <View style={styles.promoFallback}>
            <PromoLogo size="sm" />
          </View>
        )}
        <View style={styles.badgeOverlay}>
          <BadgePill label={getPromotionBadgeLabel(item)} variant="red" />
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.heartBtn}
          onPress={onRemove}
          hitSlop={8}
        >
          <Feather name="heart" size={13} color={theme.colors.accentRed} />
        </TouchableOpacity>
      </View>

      <View style={styles.promoBody}>
        <Text style={styles.promoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.promoCommerce} numberOfLines={1}>
          {item.commerce.name}
        </Text>
        <Text style={styles.savedAt}>
          Guardada {new Date(item.savedAt).toLocaleDateString("es-AR")}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Card local ──────────────────────────────────────
function FavoriteCommerceCard({
  item,
  onOpen,
  onRemove,
}: {
  item: FavoriteCommerceItem;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const image = item.coverUrl || item.logoUrl;

  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.commerceCard} onPress={onOpen}>
      <View style={styles.commerceImageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.commerceImage} resizeMode="cover" />
        ) : (
          <View style={styles.commerceFallback}>
            <PromoLogo size="sm" />
          </View>
        )}
      </View>

      <View style={styles.commerceBody}>
        <View style={styles.commerceHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.commerceName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.commerceCategory} numberOfLines={1}>
              {item.category?.name || "Comercio adherido"}
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} onPress={onRemove} hitSlop={8}>
            <Feather name="heart" size={16} color={theme.colors.accentRed} />
          </TouchableOpacity>
        </View>

        <Text style={styles.commerceDesc} numberOfLines={2}>
          {item.address || getCommerceHeadline(item)}
        </Text>

        <View style={styles.commerceMetaRow}>
          <View style={styles.metaPill}>
            <Feather name="percent" size={10} color={theme.colors.accentRed} />
            <Text style={styles.metaPillText}>{item.promotionsCount} promos</Text>
          </View>
          <View style={styles.metaPill}>
            <Feather name="map-pin" size={10} color={theme.colors.textMuted} />
            <Text style={styles.metaPillText}>{item.city?.name || DEFAULT_CITY_LABEL}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FavoritesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {
    favoritePromotions,
    favoriteCommerces,
    isLoadingFavorites,
    removePromotionFavorite,
    removeCommerceFavorite,
  } = useFavorites();
  const [filter, setFilter] = useState<Filter>("promotions");
  const [sortOrder, setSortOrder] = useState<"recent" | "name">("recent");

  const favoriteCount = favoritePromotions.length + favoriteCommerces.length;
  const activeList = useMemo(() => {
    const base = filter === "promotions" ? favoritePromotions : favoriteCommerces;
    if (sortOrder === "name") {
      return [...base].sort((a, b) => {
        const labelA = "title" in a ? a.title : a.name;
        const labelB = "title" in b ? b.title : b.name;
        return labelA.localeCompare(labelB);
      });
    }
    return [...base].sort((a, b) => {
      const dateA = "savedAt" in a ? new Date(a.savedAt).getTime() : 0;
      const dateB = "savedAt" in b ? new Date(b.savedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [favoriteCommerces, favoritePromotions, filter, sortOrder]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />

      <ScreenHeader
        title="Favoritos"
        onBack={() => navigation.goBack()}
        rightIcon="sliders"
        onRightPress={() => {
          // Alternar orden: recientes vs. guardadas primero
          setSortOrder((prev) => (prev === "recent" ? "name" : "recent"));
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero compacto con heart + total */}
        <View style={styles.heroBlock}>
          <View style={styles.heartCircle}>
            <Feather name="heart" size={22} color={theme.colors.accentRed} />
          </View>
          <View>
            <Text style={styles.heroValue}>{favoriteCount}</Text>
            <Text style={styles.heroLabel}>
              {favoriteCount === 1 ? "ítem guardado" : "ítems guardados"}
            </Text>
          </View>
        </View>

        {/* Tabs + sort indicator */}
        <View style={{ marginTop: 8 }}>
          <Segmented<Filter>
            active={filter}
            onChange={setFilter}
            options={[
              { id: "promotions", label: "Promos", count: favoritePromotions.length },
              { id: "commerces", label: "Locales", count: favoriteCommerces.length },
            ]}
          />
        </View>
        {activeList.length > 0 && (
          <View style={styles.sortRow}>
            <Feather name="sliders" size={11} color={theme.colors.textMuted} />
            <Text style={styles.sortLabel}>
              {sortOrder === "recent" ? "Más recientes primero" : "Orden alfabético"}
            </Text>
          </View>
        )}

        {isLoadingFavorites ? (
          <LoadingState label="Cargando favoritos..." />
        ) : activeList.length ? (
          filter === "promotions" ? (
            <View style={styles.promoGrid}>
              {favoritePromotions.map((item) => (
                <FavoritePromotionCard
                  key={`fav-promo-${item.id}`}
                  item={item}
                  onOpen={() =>
                    navigation.navigate("PromotionDetail", { promotionId: item.id })
                  }
                  onRemove={() => void removePromotionFavorite(item.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.commerceList}>
              {favoriteCommerces.map((item) => (
                <FavoriteCommerceCard
                  key={`fav-commerce-${item.id}`}
                  item={item}
                  onOpen={() =>
                    navigation.navigate("CommerceDetail", { commerceId: item.id })
                  }
                  onRemove={() => void removeCommerceFavorite(item.id)}
                />
              ))}
            </View>
          )
        ) : (
          <EmptyState
            title={
              filter === "promotions"
                ? "No guardaste promos todavía"
                : "No guardaste locales todavía"
            }
            message={
              filter === "promotions"
                ? "Tocá el corazón en cualquier promo para tenerla siempre a mano."
                : "Guardá tus locales favoritos y accedé rápido a sus promos."
            }
            actionLabel={filter === "promotions" ? "Explorar promos" : "Ver mapa"}
            onAction={() =>
              navigation.navigate("Tabs", {
                screen: filter === "promotions" ? "Explorar" : "Mapa",
              })
            }
            icon={<Feather name="heart" size={22} color={theme.colors.accentRed} />}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 40 },

  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 2,
  },
  sortLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  heroBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  heartCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accentRedSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroValue: {
    fontSize: 32,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -1,
    lineHeight: 36,
  },
  heroLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },

  promoCardExpired: {
    opacity: 0.6,
    borderColor: theme.colors.border,
  },
  expiredBanner: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15,15,16,0.72)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  expiredBannerText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  // ── Promo grid (2 cols) ──────────────────
  promoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  promoCard: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  promoImageWrap: {
    height: 118,
    backgroundColor: theme.colors.surfaceAlt,
    position: "relative",
  },
  promoImage: { width: "100%", height: "100%" },
  promoFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.soft,
  },
  promoBody: { padding: 10 },
  promoTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.text,
    lineHeight: 16,
    marginBottom: 3,
  },
  promoCommerce: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginBottom: 5,
  },
  savedAt: {
    fontSize: 10,
    color: theme.colors.textSoft,
    fontWeight: "600",
  },

  // ── Commerce list ────────────────────────
  commerceList: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 10,
  },
  commerceCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  commerceImageWrap: {
    width: 92,
    height: 118,
    backgroundColor: theme.colors.surfaceAlt,
  },
  commerceImage: { width: "100%", height: "100%" },
  commerceFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  commerceBody: { flex: 1, padding: 12, justifyContent: "center" },
  commerceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  commerceName: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 1,
  },
  commerceCategory: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  commerceDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginBottom: 8,
  },
  commerceMetaRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },
});
