import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  BadgePill,
  FilterChipsRow,
  SkeletonBlock,
} from "../PromyUI";
import PromoImagePlaceholder from "../PromoImagePlaceholder";
import { DEFAULT_CITY_LABEL } from "../../../services/location";
import { theme } from "../../../styles/theme";
import type { ApiCommerce, FeedPromotion } from "../../../types/api";
import {
  formatDistance,
  getCategoryVisual,
  getCommerceHeadline,
  getCommerceImage,
  getDistanceFromDefault,
  getPromotionBadgeLabel,
  getPromotionHot,
  getPromotionImage,
  hasUsableRemoteImage,
} from "../../../utils/promy";

export type ExploreTab = "promotions" | "commerces";

export function ExploreHero({
  locationLabel,
  search,
  onSearchChange,
  recentSearches,
  onRecentSearchPress,
  onClearRecentSearches,
  tab,
  onTabChange,
  searching,
  categoryOptions,
  activeCategory,
  onCategoryChange,
  promotionsCount,
}: {
  locationLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  recentSearches: string[];
  onRecentSearchPress: (value: string) => void;
  onClearRecentSearches: () => void;
  tab: ExploreTab;
  onTabChange: (value: ExploreTab) => void;
  searching: boolean;
  categoryOptions: Array<{ id: string; label: string }>;
  activeCategory: string;
  onCategoryChange: (value: string) => void;
  promotionsCount: number;
}) {
  return (
    <>
      {/* Dark hero — ends cleanly after search bar */}
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.heroGlowRed} />
        <View style={styles.heroGlowYellow} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroMetaPill}>
            <Feather name="map-pin" size={11} color={theme.colors.primary} />
            <Text style={styles.heroMetaPillText}>{locationLabel}</Text>
          </View>

          <View style={styles.heroStatusPill}>
            <View style={styles.heroStatusDot} />
            <Text style={styles.heroStatusPillText}>{promotionsCount} promos activas</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>Explorar</Text>
        <Text style={styles.heroSubtitle}>
          Descubri promociones y locales cerca tuyo con una experiencia real de PROMY.
        </Text>

        <View style={styles.heroSearchRow}>
          <View style={styles.heroSearchBox}>
            <Feather name="search" size={17} color={theme.colors.text} />
            <TextInput
              value={search}
              onChangeText={onSearchChange}
              placeholder="Buscar promos, locales o rubros..."
              placeholderTextColor={theme.colors.textSoft}
              style={styles.heroSearchInput}
            />
            {searching ? <SkeletonBlock width={18} height={18} radius={999} /> : null}
          </View>

          <TouchableOpacity activeOpacity={0.9} style={styles.heroFilterButton}>
            <Feather name="sliders" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {!search.trim().length && recentSearches.length ? (
          <View style={styles.recentSearchesWrap}>
            <View style={styles.recentSearchesHeader}>
              <Text style={styles.recentSearchesTitle}>Busquedas recientes</Text>
              <TouchableOpacity activeOpacity={0.82} onPress={onClearRecentSearches}>
                <Text style={styles.recentSearchesAction}>Borrar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentSearchesScroll}
            >
              {recentSearches.map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.9}
                  style={styles.recentSearchChip}
                  onPress={() => onRecentSearchPress(item)}
                >
                  <Feather name="clock" size={12} color={theme.colors.primary} />
                  <Text style={styles.recentSearchChipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </SafeAreaView>

      {/* Tabs + chips — below dark header on cream background */}
      <View style={styles.subHeader}>
        <View style={styles.heroTabs}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.heroTab, tab === "promotions" && styles.heroTabActive]}
            onPress={() => onTabChange("promotions")}
          >
            <Text style={[styles.heroTabLabel, tab === "promotions" && styles.heroTabLabelActive]}>
              Promociones
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.heroTab, tab === "commerces" && styles.heroTabActive]}
            onPress={() => onTabChange("commerces")}
          >
            <Text style={[styles.heroTabLabel, tab === "commerces" && styles.heroTabLabelActive]}>
              Locales
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chipsScrollWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.heroFilterScroll}
          >
            <FilterChipsRow
              options={categoryOptions}
              active={activeCategory}
              onChange={onCategoryChange}
              paddingHorizontal={0}
            />
          </ScrollView>
          <View style={styles.chipsFade} pointerEvents="none" />
        </View>
      </View>
    </>
  );
}

export function ExploreSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonStatsCard}>
        <View style={styles.skeletonStatsCol}>
          <SkeletonBlock width="42%" height={10} radius={999} />
          <SkeletonBlock width={74} height={34} radius={16} />
          <SkeletonBlock width="64%" height={12} radius={999} />
        </View>
        <View style={styles.skeletonStatsDivider} />
        <View style={styles.skeletonStatsColWide}>
          <SkeletonBlock width={92} height={24} radius={999} />
          <SkeletonBlock width="100%" height={14} radius={999} />
          <SkeletonBlock width="78%" height={14} radius={999} />
        </View>
      </View>

      <View style={styles.skeletonSectionHeader}>
        <SkeletonBlock width="46%" height={14} radius={999} />
        <SkeletonBlock width={76} height={12} radius={999} />
      </View>

      <SkeletonBlock height={310} radius={24} style={styles.skeletonCardSurface} />
      <SkeletonBlock height={240} radius={22} style={styles.skeletonCardSurface} />
      <SkeletonBlock height={240} radius={22} style={styles.skeletonCardSurface} />
    </View>
  );
}

export function ExploreListFooterSkeleton({ tab }: { tab: ExploreTab }) {
  const cardHeights = tab === "promotions" ? [240, 240] : [136, 136];

  return (
    <View style={styles.listFooterSkeleton}>
      {cardHeights.map((height, index) => (
        <SkeletonBlock
          key={`${tab}-footer-${index}`}
          height={height}
          radius={22}
          style={styles.skeletonCardSurface}
        />
      ))}
    </View>
  );
}

export function ExploreStatsPanel({
  resultCount,
  tab,
}: {
  resultCount: number;
  tab: ExploreTab;
}) {
  return (
    <View style={styles.overlapPanel}>
      <View style={styles.overlapStat}>
        <Text style={styles.overlapStatEyebrow}>Resultados</Text>
        <Text style={styles.overlapStatValue}>{resultCount}</Text>
        <Text style={styles.overlapStatLabel}>
          {tab === "promotions" ? "promos visibles" : "locales visibles"}
        </Text>
      </View>

      <View style={styles.overlapDivider} />

      <View style={styles.overlapMetricCol}>
        <View style={styles.overlapMetricPill}>
          <Feather name="zap" size={12} color={theme.colors.accentRed} />
          <Text style={styles.overlapMetricPillText}>Tiempo real</Text>
        </View>
        <Text style={styles.overlapMetricBody}>
          Nearby, search y categorias en una sola experiencia.
        </Text>
      </View>
    </View>
  );
}

export function ExploreNotice({
  tone,
  message,
}: {
  tone: "error" | "info";
  message: string;
}) {
  const isError = tone === "error";

  return (
    <View style={isError ? styles.noticeCardError : styles.noticeCardInfo}>
      <Feather
        name={isError ? "alert-circle" : "navigation"}
        size={15}
        color={isError ? theme.colors.accentRed : theme.colors.text}
      />
      <Text style={isError ? styles.noticeCardErrorText : styles.noticeCardInfoText}>
        {message}
      </Text>
    </View>
  );
}

export function ExploreFeaturedPromotion({
  promotion,
  onPress,
}: {
  promotion: FeedPromotion;
  onPress: (promotionId: number) => void;
}) {
  const imageUrl = getPromotionImage(promotion);

  return (
    <View style={styles.featuredSection}>
      <SectionHeader title="Destacada cerca tuyo" actionLabel="Ver todo" />

      <TouchableOpacity
        activeOpacity={0.95}
        style={styles.featuredCard}
        onPress={() => onPress(promotion.id)}
      >
        <View style={styles.featuredImageWrap}>
          {imageUrl && hasUsableRemoteImage(imageUrl) ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.featuredImage}
              contentFit="cover"
              cachePolicy="disk"
              transition={160}
            />
          ) : (
            <View style={styles.featuredImageFallback}>
              <Text style={styles.featuredImageFallbackText}>{promotion.commerce.name}</Text>
            </View>
          )}
          <View style={styles.featuredDiscountBadge}>
            <Text style={styles.featuredDiscountText}>{getPromotionBadgeLabel(promotion)}</Text>
          </View>
        </View>

        <View style={styles.featuredBody}>
          <Text style={styles.featuredMerchant}>{promotion.commerce.name}</Text>
          <Text style={styles.featuredTitle} numberOfLines={2}>
            {promotion.title}
          </Text>
          <Text style={styles.featuredCaption} numberOfLines={2}>
            {promotion.description ||
              promotion.commerce.shortDescription ||
              "Promo disponible en PROMY."}
          </Text>

          <View style={styles.featuredFooter}>
            <View style={styles.featuredMetaPill}>
              <Feather name="map-pin" size={11} color={theme.colors.textMuted} />
              <Text style={styles.featuredMetaPillText}>
                {formatDistance(getDistanceFromDefault(promotion.distanceKm))}
              </Text>
            </View>
            <View style={styles.featuredMetaPill}>
              <Feather name="tag" size={11} color={theme.colors.textMuted} />
              <Text style={styles.featuredMetaPillText}>
                {promotion.commerce.category?.name ?? "Promo"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function ExploreResultsSection({
  tab,
  resultCount,
  promotions,
  commerces,
  onPromotionPress,
  onCommercePress,
}: {
  tab: ExploreTab;
  resultCount: number;
  promotions: FeedPromotion[];
  commerces: ApiCommerce[];
  onPromotionPress: (promotionId: number) => void;
  onCommercePress: (commerceId: number) => void;
}) {
  return (
    <View style={styles.resultsSection}>
      <SectionHeader
        title={tab === "promotions" ? "Promos para descubrir" : "Locales cercanos"}
        actionLabel={`${resultCount} items`}
      />

      {resultCount === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No encontramos resultados</Text>
          <Text style={styles.emptyMessage}>
            Proba cambiando el rubro o limpiando la busqueda para seguir explorando.
          </Text>
        </View>
      ) : tab === "promotions" ? (
        <View style={styles.grid}>
          {promotions.map((promotion) => (
            <ExplorePromoCard
              key={promotion.id}
              promotion={promotion}
              onPress={() => onPromotionPress(promotion.id)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {commerces.map((commerce) => (
            <ExploreCommerceCard
              key={commerce.id}
              commerce={commerce}
              onPress={() => onCommercePress(commerce.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function ExploreResultsHeader({
  title,
  actionLabel,
}: {
  title: string;
  actionLabel: string;
}) {
  return <SectionHeader title={title} actionLabel={actionLabel} />;
}

export function ExploreEmptyResults() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>No encontramos resultados</Text>
      <Text style={styles.emptyMessage}>
        Proba cambiando el rubro o limpiando la busqueda para seguir explorando.
      </Text>
    </View>
  );
}

function SectionHeader({
  title,
  actionLabel,
}: {
  title: string;
  actionLabel: string;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionAction}>{actionLabel}</Text>
    </View>
  );
}

export function ExplorePromoCard({
  promotion,
  onPress,
}: {
  promotion: FeedPromotion;
  onPress: () => void;
}) {
  const imageUrl = getPromotionImage(promotion);
  const badge = getPromotionBadgeLabel(promotion);

  return (
    <TouchableOpacity activeOpacity={0.94} style={styles.promoCard} onPress={onPress}>
      <View style={styles.promoImageWrap}>
        {imageUrl && hasUsableRemoteImage(imageUrl) ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.promoImage}
            contentFit="cover"
            cachePolicy="disk"
            transition={160}
          />
        ) : (
          <View style={styles.promoImageFallback}>
            <Text style={styles.promoImageFallbackText}>{promotion.commerce.name}</Text>
          </View>
        )}

        {getPromotionHot(promotion) ? (
          <View style={styles.hotBadge}>
            <Feather name="zap" size={11} color="#FFFFFF" />
            <Text style={styles.hotBadgeText}>HOT</Text>
          </View>
        ) : null}

        <View style={styles.promoMerchantPill}>
          <Text style={styles.promoMerchantPillText}>{promotion.commerce.name}</Text>
        </View>
      </View>

      <View style={styles.promoBody}>
        <View style={styles.promoTopRow}>
          <BadgePill label={badge} variant="red" size="sm" />
          <View style={styles.distancePill}>
            <Feather name="navigation" size={11} color={theme.colors.textMuted} />
            <Text style={styles.distancePillText}>
              {formatDistance(getDistanceFromDefault(promotion.distanceKm))}
            </Text>
          </View>
        </View>

        <Text style={styles.promoTitle} numberOfLines={2}>
          {promotion.title}
        </Text>
        <Text style={styles.promoMeta} numberOfLines={1}>
          {promotion.commerce.category?.name ?? "Promo disponible"}
        </Text>

        <View style={styles.promoFooter}>
          <Text style={styles.promoAddress} numberOfLines={1}>
            {promotion.commerce.address || promotion.commerce.city?.name || DEFAULT_CITY_LABEL}
          </Text>
          <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function ExploreCommerceCard({
  commerce,
  onPress,
}: {
  commerce: ApiCommerce;
  onPress: () => void;
}) {
  const imageUrl = getCommerceImage(commerce);
  const visual = getCategoryVisual(commerce.category?.name);

  return (
    <TouchableOpacity activeOpacity={0.94} style={styles.commerceCard} onPress={onPress}>
      <View style={styles.commerceImageWrap}>
        {imageUrl && hasUsableRemoteImage(imageUrl) ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.commerceImage}
            contentFit="cover"
            cachePolicy="disk"
            transition={160}
          />
        ) : (
          <View style={[styles.commerceImageFallback, { backgroundColor: visual.tint }]}>
            {visual.icon}
          </View>
        )}
      </View>

      <View style={styles.commerceBody}>
        <View style={styles.commerceTopRow}>
          <Text style={styles.commerceName} numberOfLines={1}>
            {commerce.name}
          </Text>
          <View style={styles.distancePill}>
            <Feather name="map-pin" size={11} color={theme.colors.textMuted} />
            <Text style={styles.distancePillText}>
              {formatDistance(getDistanceFromDefault(commerce.distanceKm))}
            </Text>
          </View>
        </View>

        <Text style={styles.commerceCategory} numberOfLines={1}>
          {commerce.category?.name ?? "Local adherido"}
        </Text>
        <Text style={styles.commerceHeadline} numberOfLines={2}>
          {getCommerceHeadline(commerce)}
        </Text>

        <View style={styles.commerceFooter}>
          <Text style={styles.commerceAddress} numberOfLines={1}>
            {commerce.address || commerce.city?.name || DEFAULT_CITY_LABEL}
          </Text>
          <Text style={styles.commerceFooterCta}>Ver local</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  subHeader: {
    backgroundColor: theme.colors.background,
    paddingTop: 16,
    paddingBottom: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  header: {
    backgroundColor: theme.colors.headerDark,
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroGlowRed: {
    position: "absolute",
    top: -50,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(255,49,49,0.26)",
    transform: [{ scale: 1.1 }],
  },
  heroGlowYellow: {
    position: "absolute",
    top: 12,
    right: -50,
    width: 210,
    height: 210,
    borderRadius: 220,
    backgroundColor: "rgba(255,191,0,0.22)",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  heroMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroMetaPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,191,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,191,0,0.25)",
  },
  heroStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
  },
  heroStatusPillText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 37,
    fontWeight: "900",
    letterSpacing: -1.4,
    marginTop: 18,
  },
  heroSubtitle: {
    color: theme.colors.mutedOnDark,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 300,
  },
  heroSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
  },
  heroSearchBox: {
    flex: 1,
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#111111",
    shadowOpacity: 0.32,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  heroSearchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  heroFilterButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.accentRed,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    shadowColor: "#111111",
    shadowOpacity: 0.24,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  heroTabs: {
    marginTop: 0,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 999,
    padding: 4,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroTab: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  heroTabActive: {
    backgroundColor: theme.colors.headerDark,
  },
  heroTabLabel: {
    fontSize: 13.5,
    fontWeight: "900",
    color: theme.colors.textMuted,
  },
  heroTabLabelActive: {
    color: "#FFFFFF",
  },
  heroFilterScroll: {
    paddingTop: 14,
  },
  overlapPanel: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#111111",
    shadowOpacity: 0.18,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  overlapStat: {
    minWidth: 102,
  },
  overlapStatEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.accentRed,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  overlapStatValue: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -1.4,
    marginTop: 4,
  },
  overlapStatLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  overlapDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  overlapMetricCol: {
    flex: 1,
    gap: 8,
  },
  overlapMetricPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.accentRedSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  overlapMetricPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.accentRed,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  overlapMetricBody: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  noticeCardError: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: theme.colors.accentRedSoft,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noticeCardErrorText: {
    flex: 1,
    color: theme.colors.accentRedDark,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
  },
  noticeCardInfo: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noticeCardInfoText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
  },
  featuredSection: {
    marginTop: 22,
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  featuredCard: {
    marginHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  featuredImageWrap: {
    height: 206,
    position: "relative",
    backgroundColor: theme.colors.surfaceMuted,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceMuted,
  },
  featuredImageFallbackText: {
    color: theme.colors.textMuted,
    fontWeight: "900",
    fontSize: 17,
  },
  featuredDiscountBadge: {
    position: "absolute",
    left: 14,
    top: 14,
    backgroundColor: theme.colors.accentRed,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  featuredDiscountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  featuredBody: {
    padding: 16,
  },
  featuredMerchant: {
    fontSize: 11,
    color: theme.colors.accentRed,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  featuredTitle: {
    fontSize: 22,
    lineHeight: 26,
    color: theme.colors.text,
    fontWeight: "900",
    letterSpacing: -0.8,
    marginTop: 6,
  },
  featuredCaption: {
    fontSize: 13.5,
    lineHeight: 20,
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginTop: 8,
  },
  featuredFooter: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  featuredMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  featuredMetaPillText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "800",
  },
  resultsSection: {
    marginTop: 24,
  },
  grid: {
    paddingHorizontal: 16,
    gap: 14,
  },
  list: {
    paddingHorizontal: 16,
    gap: 14,
  },
  promoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  promoImageWrap: {
    height: 174,
    backgroundColor: theme.colors.surfaceMuted,
    position: "relative",
  },
  promoImage: {
    width: "100%",
    height: "100%",
  },
  promoImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceMuted,
  },
  promoImageFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: "900",
  },
  hotBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: theme.colors.accentRed,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hotBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  promoMerchantPill: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(17,17,17,0.68)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  promoMerchantPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  promoBody: {
    padding: 14,
  },
  promoTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  distancePillText: {
    color: theme.colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
  },
  promoTitle: {
    fontSize: 18,
    lineHeight: 22,
    color: theme.colors.text,
    fontWeight: "900",
    letterSpacing: -0.4,
    marginTop: 10,
  },
  promoMeta: {
    fontSize: 12,
    color: theme.colors.accentRed,
    fontWeight: "800",
    marginTop: 6,
  },
  promoFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promoAddress: {
    flex: 1,
    marginRight: 12,
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  commerceCard: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 12,
    ...theme.shadow.soft,
  },
  commerceImageWrap: {
    width: 96,
    height: 112,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceMuted,
  },
  commerceImage: {
    width: "100%",
    height: "100%",
  },
  commerceImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recentSearchesWrap: {
    marginTop: 14,
    gap: 10,
  },
  recentSearchesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentSearchesTitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  recentSearchesAction: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  recentSearchesScroll: {
    gap: 8,
    paddingRight: 8,
  },
  recentSearchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  recentSearchChipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  commerceBody: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  commerceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  commerceName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  commerceCategory: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "900",
    color: theme.colors.accentRed,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  commerceHeadline: {
    marginTop: 6,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  commerceFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  commerceAddress: {
    flex: 1,
    color: theme.colors.textSoft,
    fontSize: 11.5,
    fontWeight: "700",
  },
  commerceFooterCta: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  emptyMessage: {
    marginTop: 8,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  chipsScrollWrap: {
    position: "relative",
  },
  chipsFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    pointerEvents: "none",
    shadowColor: "#0F0F10",
    shadowOpacity: 0.65,
    shadowRadius: 14,
    shadowOffset: { width: -6, height: 0 },
  },
  skeletonWrap: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 16,
  },
  skeletonStatsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    padding: 18,
    flexDirection: "row",
    alignItems: "stretch",
  },
  skeletonStatsCol: {
    minWidth: 108,
    gap: 8,
  },
  skeletonStatsColWide: {
    flex: 1,
    gap: 8,
  },
  skeletonStatsDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  skeletonSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  skeletonCardSurface: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#F3E8D7",
  },
  listFooterSkeleton: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 14,
  },
});
