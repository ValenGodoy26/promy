import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { fetchCommerceById } from "../../api/catalog";
import PromoLogo from "../../components/promy/PromoLogo";
import {
  BadgePill,
  ErrorState,
  LoadingState,
  ScreenHeader,
  SectionHeader,
} from "../../components/promy/PromyUI";
import { useFavorites } from "../../context/FavoritesContext";
import type { MainStackParamList } from "../../navigation/types";
import { DEFAULT_CITY_LABEL } from "../../services/location";
import { theme } from "../../styles/theme";
import type { ApiPromotion, CommerceDetail } from "../../types/api";
import {
  buildPromotionTiming,
  formatAuthError,
  formatDistance,
  getCommerceDistance,
  getCommerceHeadline,
  getCommerceImage,
  getPromotionBadgeLabel,
  getPromotionHot,
  getPromotionImage,
} from "../../utils/promy";

type CommerceDetailRoute = NativeStackScreenProps<
  MainStackParamList,
  "CommerceDetail"
>["route"];
type CommerceDetailNavigation = NativeStackNavigationProp<MainStackParamList>;

export default function CommerceDetailScreen() {
  const navigation = useNavigation<CommerceDetailNavigation>();
  const route = useRoute<CommerceDetailRoute>();
  const { isCommerceFavorite, toggleCommerceFavorite } = useFavorites();

  const [commerce, setCommerce] = useState<CommerceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadCommerce = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const response = await fetchCommerceById(route.params.commerceId);
      setCommerce(response.commerce);
    } catch (loadError) {
      setError(formatAuthError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCommerce();
  }, [route.params.commerceId]);

  const handleToggleFavorite = async () => {
    if (!commerce) return;
    const added = await toggleCommerceFavorite(commerce);
    setFeedback(added ? "Guardado en favoritos" : "Quitado de favoritos");
  };

  const isFavorite = commerce ? isCommerceFavorite(commerce.id) : false;
  const sortedPromotions = useMemo(() => {
    if (!commerce?.promotions?.length) return [];
    return [...commerce.promotions].sort((a, b) => {
      const dA = typeof a.discountValue === "number" ? a.discountValue : 0;
      const dB = typeof b.discountValue === "number" ? b.discountValue : 0;
      if (dB !== dA) return dB - dA;
      return a.title.localeCompare(b.title);
    });
  }, [commerce?.promotions]);

  const featuredPromotion = sortedPromotions[0];
  const commerceImage = commerce ? getCommerceImage(commerce) : null;
  const distance = commerce ? formatDistance(getCommerceDistance(commerce)) : null;
  const cityLabel = commerce?.city
    ? `${commerce.city.name}, ${commerce.city.province}`
    : DEFAULT_CITY_LABEL;
  const hasMapCoords = commerce?.latitude != null && commerce?.longitude != null;

  const openPromotion = (promotionId: number) =>
    navigation.navigate("PromotionDetail", { promotionId });

  const openUrl = async (url: string, fallback: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        setFeedback(fallback);
        return;
      }
      await Linking.openURL(url);
    } catch {
      setFeedback(fallback);
    }
  };

  const handleOpenMap = async () => {
    if (!commerce) return;
    const query = hasMapCoords
      ? `${commerce.latitude},${commerce.longitude}`
      : commerce.address || commerce.name;
    await openUrl(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      "No pudimos abrir el mapa",
    );
  };

  const handleCall = async () => {
    const phone = commerce?.phone?.replace(/\s+/g, "");
    if (!phone) {
      setFeedback("Este local todavía no tiene teléfono");
      return;
    }
    await openUrl(`tel:${phone}`, "No pudimos abrir el teléfono");
  };

  const handleOpenInstagram = async () => {
    const instagram = commerce?.instagram?.trim();
    if (!instagram) {
      setFeedback("Este local todavía no tiene Instagram");
      return;
    }
    const url = instagram.startsWith("http")
      ? instagram
      : `https://instagram.com/${instagram.replace(/^@/, "")}`;
    await openUrl(url, "No pudimos abrir Instagram");
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />

      <ScreenHeader
        title="Detalle del local"
        onBack={() => navigation.goBack()}
        rightIcon="heart"
        onRightPress={() => void handleToggleFavorite()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadCommerce("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
      >
        {loading ? (
          <LoadingState label="Cargando local..." />
        ) : error || !commerce ? (
          <ErrorState
            title="No pudimos cargar este local"
            message={error || "Local no disponible"}
            onRetry={() => void loadCommerce()}
          />
        ) : (
          <>
            {/* Hero */}
            <View style={styles.heroWrap}>
              {commerceImage ? (
                <Image
                  source={{ uri: commerceImage }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.heroFallback}>
                  <PromoLogo size="lg" />
                </View>
              )}
              <View style={styles.heroScrim} />

              <View style={styles.heroOverlayTop}>
                <BadgePill
                  label={commerce.category?.name || "Local"}
                  variant="yellow"
                />
                {isFavorite ? (
                  <View style={styles.heroFavPill}>
                    <Feather name="heart" size={11} color={theme.colors.accentRed} />
                    <Text style={styles.heroFavText}>Guardado</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.heroOverlayBottom}>
                <Text style={styles.heroName}>{commerce.name}</Text>
                <Text style={styles.heroCity} numberOfLines={1}>
                  <Feather name="map-pin" size={11} color="#FFFFFF" />
                  {" "}
                  {cityLabel}
                </Text>
              </View>
            </View>

            {/* Body */}
            <View style={styles.body}>
              {/* Info pills row */}
              <View style={styles.pillsRow}>
                <View style={styles.infoPill}>
                  <Feather name="percent" size={13} color={theme.colors.accentRed} />
                  <Text style={styles.infoPillText}>
                    {commerce.promotions?.length || 0} promos
                  </Text>
                </View>
                <View style={styles.infoPill}>
                  <Feather name="navigation" size={13} color={theme.colors.accentRed} />
                  <Text style={styles.infoPillText}>{distance || "Cerca"}</Text>
                </View>
                <View style={styles.infoPill}>
                  <Feather name="tag" size={13} color={theme.colors.primary} />
                  <Text style={styles.infoPillText}>
                    {commerce.category?.name || "Comercio local"}
                  </Text>
                </View>
              </View>

              {/* Botones de acción grandes */}
              <View style={styles.actionsRow}>
                <ActionButton
                  icon="navigation"
                  label="Cómo llegar"
                  onPress={() => void handleOpenMap()}
                  highlighted
                />
                <ActionButton
                  icon="phone"
                  label="Llamar"
                  onPress={() => void handleCall()}
                />
                <ActionButton
                  icon="instagram"
                  label="Instagram"
                  onPress={() => void handleOpenInstagram()}
                />
              </View>

              {/* Promo destacada */}
              {featuredPromotion ? (
                <TouchableOpacity
                  activeOpacity={0.93}
                  style={styles.featuredCard}
                  onPress={() => openPromotion(featuredPromotion.id)}
                >
                  <View style={styles.featuredOrb} />

                  <View style={styles.featuredHeader}>
                    <View>
                      <Text style={styles.featuredEyebrow}>Promo destacada</Text>
                      <Text style={styles.featuredTitle} numberOfLines={2}>
                        {featuredPromotion.title}
                      </Text>
                    </View>
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>
                        {getPromotionBadgeLabel(featuredPromotion)}
                      </Text>
                    </View>
                  </View>

                  {featuredPromotion.description || featuredPromotion.conditions ? (
                    <Text style={styles.featuredDesc} numberOfLines={2}>
                      {featuredPromotion.description || featuredPromotion.conditions}
                    </Text>
                  ) : null}

                  <View style={styles.featuredFooter}>
                    <View style={styles.featuredTiming}>
                      <Feather name="clock" size={11} color={theme.colors.textMuted} />
                      <Text style={styles.featuredTimingText}>
                        {buildPromotionTiming(featuredPromotion) || "Disponible hoy"}
                      </Text>
                    </View>
                    <View style={styles.featuredCta}>
                      <Text style={styles.featuredCtaText}>Ver promo</Text>
                      <Feather
                        name="arrow-right"
                        size={13}
                        color={theme.colors.accentRed}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* Descripción del local */}
              {commerce.description || commerce.shortDescription ? (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Sobre el local</Text>
                  <Text style={styles.sectionCardText}>
                    {commerce.description || commerce.shortDescription}
                  </Text>
                </View>
              ) : null}

              {/* Contacto */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionCardTitle}>Contacto y ubicación</Text>
                <ContactRow
                  icon="map-pin"
                  value={commerce.address || "Dirección disponible pronto"}
                />
                <ContactRow
                  icon="phone"
                  value={commerce.phone || "Teléfono disponible pronto"}
                />
                <ContactRow
                  icon="instagram"
                  value={commerce.instagram || "Instagram disponible pronto"}
                  last
                />
              </View>

              {feedback ? (
                <View style={styles.feedbackRow}>
                  <Feather name="info" size={13} color={theme.colors.accentRed} />
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
              ) : null}

              {/* Promos activas */}
              {sortedPromotions.length > 0 ? (
                <>
                  <SectionHeader
                    title="Promos activas"
                    compact
                  />
                  <View style={styles.promoList}>
                    {sortedPromotions.map((promotion: ApiPromotion) => (
                      <CommercePromoCard
                        key={`cp-${promotion.id}`}
                        promotion={promotion}
                        commerceImage={getPromotionImage(promotion, commerce)}
                        onPress={() => openPromotion(promotion.id)}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Action button (cómo llegar / llamar / instagram) ─
function ActionButton({
  icon,
  label,
  onPress,
  highlighted,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  highlighted?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.actionBtn, highlighted && styles.actionBtnHighlighted]}
      onPress={onPress}
    >
      <View
        style={[
          styles.actionIconWrap,
          highlighted && { backgroundColor: "#FFFFFF" },
        ]}
      >
        <Feather
          name={icon}
          size={16}
          color={highlighted ? theme.colors.accentRed : theme.colors.accentRed}
        />
      </View>
      <Text
        style={[
          styles.actionLabel,
          highlighted && { color: "#FFFFFF" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Contact row ──────────────────────────────────────
function ContactRow({
  icon,
  value,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.contactRow,
        last && { borderBottomWidth: 0, paddingBottom: 0 },
      ]}
    >
      <View style={styles.contactIconWrap}>
        <Feather name={icon} size={13} color={theme.colors.accentRed} />
      </View>
      <Text style={styles.contactText} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

// ── Promo card dentro del comercio ───────────────────
function CommercePromoCard({
  promotion,
  commerceImage,
  onPress,
}: {
  promotion: ApiPromotion;
  commerceImage?: string | null;
  onPress: () => void;
}) {
  const timing = buildPromotionTiming(promotion);
  const isHot = getPromotionHot(promotion);

  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.promoCard} onPress={onPress}>
      <View style={styles.promoMedia}>
        {commerceImage ? (
          <Image
            source={{ uri: commerceImage }}
            style={styles.promoImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.promoFallback}>
            <PromoLogo size="sm" />
          </View>
        )}
        <View style={styles.promoBadge}>
          <Text style={styles.promoBadgeText}>
            {getPromotionBadgeLabel(promotion)}
          </Text>
        </View>
        {isHot ? (
          <View style={styles.promoHotBadge}>
            <Text style={styles.promoHotBadgeText}>🔥</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.promoBody}>
        <Text style={styles.promoTitle} numberOfLines={2}>
          {promotion.title}
        </Text>
        <Text style={styles.promoDesc} numberOfLines={2}>
          {promotion.description ||
            promotion.conditions ||
            "Promo activa en este local."}
        </Text>
        <View style={styles.promoFooter}>
          <Text style={styles.promoTiming}>{timing || "Hoy"}</Text>
          <View style={styles.promoLink}>
            <Text style={styles.promoLinkText}>Ver</Text>
            <Feather name="arrow-right" size={12} color={theme.colors.accentRed} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 40 },

  // ── Hero ──────────────────────────────────
  heroWrap: {
    height: 220,
    margin: 16,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt,
    position: "relative",
  },
  heroImage: { width: "100%", height: "100%" },
  heroFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
    backgroundColor: "rgba(17,17,17,0.45)",
  },
  heroOverlayTop: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroFavPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroFavText: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.accentRed,
  },
  heroOverlayBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  heroCity: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },

  body: {
    paddingHorizontal: 20,
  },

  // ── Pills row ────────────────────────────
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.text,
  },

  // ── Action buttons ───────────────────────
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  actionBtnHighlighted: {
    backgroundColor: theme.colors.accentRed,
    borderColor: theme.colors.accentRed,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: theme.colors.accentRedSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 11,
    color: theme.colors.text,
    fontWeight: "800",
  },

  // ── Featured promo ───────────────────────
  featuredCard: {
    backgroundColor: theme.colors.headerDark,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
    ...theme.shadow.card,
  },
  featuredOrb: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,191,0,0.12)",
  },
  featuredHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  featuredEyebrow: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    lineHeight: 22,
    maxWidth: 220,
  },
  featuredBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  featuredBadgeText: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  featuredDesc: {
    fontSize: 13,
    color: theme.colors.mutedOnDark,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 12,
  },
  featuredFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredTiming: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredTimingText: {
    fontSize: 11,
    color: theme.colors.softOnDark,
    fontWeight: "600",
  },
  featuredCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  featuredCtaText: {
    color: theme.colors.accentRed,
    fontWeight: "900",
    fontSize: 12,
  },

  // ── Sections ──────────────────────────────
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionCardTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sectionCardText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 20,
    fontWeight: "500",
  },

  // ── Contact rows ─────────────────────────
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  contactIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: theme.colors.accentRedSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  contactText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "600",
  },

  // ── Feedback ─────────────────────────────
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.accentRedSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 12,
    color: theme.colors.accentRedDark,
    fontWeight: "700",
    flex: 1,
  },

  // ── Promo list ───────────────────────────
  promoList: {
    gap: 10,
    marginTop: 8,
  },
  promoCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  promoMedia: {
    width: 92,
    height: 114,
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
  promoBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: theme.colors.accentRed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  promoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  promoHotBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: theme.colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  promoHotBadgeText: {
    fontSize: 10,
  },
  promoBody: { flex: 1, padding: 12, justifyContent: "center" },
  promoTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 3,
  },
  promoDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
    fontWeight: "500",
    marginBottom: 6,
  },
  promoFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  promoTiming: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  promoLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  promoLinkText: {
    fontSize: 11,
    color: theme.colors.accentRed,
    fontWeight: "900",
  },
});
