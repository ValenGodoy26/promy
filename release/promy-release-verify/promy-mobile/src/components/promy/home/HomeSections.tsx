import React, { ReactNode } from "react";
import {
  ScrollView,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import PromoLogo from "../PromoLogo";
import { theme } from "../../../styles/theme";
import { ApiCategory, ApiCommerce, ApiRedemption, FeedPromotion } from "../../../types/api";
import { formatDistance, getPromotionBadgeLabel, getPromotionImage } from "../../../utils/promy";

type HomeCategoryOption = Omit<ApiCategory, "icon"> & {
  tint: string;
  icon: ReactNode;
};

export function HomeHeader({
  locationLabel,
  unreadCount,
  firstName,
  promotionsCount,
  onNotificationsPress,
  onSearchPress,
}: {
  locationLabel: string;
  unreadCount: number;
  firstName: string;
  promotionsCount: number;
  onNotificationsPress: () => void;
  onSearchPress: () => void;
}) {
  return (
    <SafeAreaView edges={["top"]} style={styles.header}>
      <View style={styles.headerGlowRed} />
      <View style={styles.headerGlowYellow} />

      <View style={styles.headerTopRow}>
        <View style={styles.locationRow}>
          <PromoLogo size="sm" />
          <View>
            <Text style={styles.locationLabel}>Tu ubicación</Text>
            <View style={styles.locationValueRow}>
              <Text style={styles.locationValue}>{locationLabel}</Text>
              <Feather name="chevron-down" size={13} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.bellButton}
          onPress={onNotificationsPress}
        >
          <Feather name="bell" size={17} color="#FFFFFF" />
          {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
        </TouchableOpacity>
      </View>

      <View style={styles.greetingBlock}>
        <Text style={styles.greetingEyebrow}>Hola, {firstName}</Text>
        <Text style={styles.greetingTitle}>
          Hoy hay <Text style={styles.greetingTitleAccent}>{promotionsCount} promos</Text> cerca tuyo
        </Text>
      </View>

      <TouchableOpacity activeOpacity={0.92} style={styles.searchShell} onPress={onSearchPress}>
        <Feather name="search" size={17} color={theme.colors.text} />
        <Text style={styles.searchText}>Que vas a aprovechar hoy?</Text>
        <View style={styles.searchBadge}>
          <Feather name="zap" size={13} color={theme.colors.text} />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export function HomeLocationNotice({
  fallbackReason,
  message,
}: {
  fallbackReason?: "permission_denied" | "device_error" | null;
  message: string;
}) {
  return (
    <View style={styles.locationNoticeCard}>
      <View style={styles.locationNoticeIcon}>
        <Feather
          name={fallbackReason === "permission_denied" ? "map-pin" : "navigation"}
          size={15}
          color={theme.colors.text}
        />
      </View>
      <View style={styles.locationNoticeBody}>
        <Text style={styles.locationNoticeTitle}>
          {fallbackReason === "permission_denied"
            ? "Ubicacion desactivada"
            : "Usando ciudad de respaldo"}
        </Text>
        <Text style={styles.locationNoticeText}>{message}</Text>
      </View>
    </View>
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonHero}>
        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        <View style={[styles.skeletonLine, styles.skeletonLineTitle]} />
        <View style={styles.skeletonPillRow}>
          <View style={styles.skeletonPill} />
          <View style={styles.skeletonPill} />
        </View>
      </View>

      <View style={styles.skeletonSectionHeader}>
        <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
        <View style={styles.skeletonAction} />
      </View>

      <View style={styles.skeletonCardRow}>
        <View style={styles.skeletonPromoCard} />
        <View style={styles.skeletonPromoCard} />
      </View>

      <View style={styles.skeletonSectionHeader}>
        <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
        <View style={styles.skeletonAction} />
      </View>

      <View style={styles.skeletonNearCard} />
      <View style={styles.skeletonNearCard} />
    </View>
  );
}

export function FeaturedPromotionCard({
  promotion,
  locationLabel,
  onPress,
}: {
  promotion: FeedPromotion;
  locationLabel: string;
  onPress: (promotionId: number) => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.94}
      style={styles.heroCard}
      onPress={() => onPress(promotion.id)}
    >
      <View style={styles.heroTopRow}>
        <View style={styles.heroTopBadge}>
          <Feather name="zap" size={10} color={theme.colors.text} />
          <Text style={styles.heroTopBadgeText}>PROMO PROTAGONISTA</Text>
        </View>
        <View style={styles.heroTimerRow}>
          <Feather name="clock" size={11} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroTimerText}>Termina pronto</Text>
        </View>
      </View>

      <View style={styles.heroBody}>
        <View style={styles.heroTextCol}>
          <Text style={styles.heroCommerceName} numberOfLines={1}>
            {promotion.commerce.name}
          </Text>
          <Text style={styles.heroPromoTitle} numberOfLines={3}>
            {promotion.title}
          </Text>

          <View style={styles.heroDiscountRow}>
            <View style={styles.heroDiscountPill}>
              <Text style={styles.heroDiscountPillText}>{getPromotionBadgeLabel(promotion)}</Text>
            </View>
            <Text style={styles.heroSavingsText}>Beneficio protagonista</Text>
          </View>

          <View style={styles.heroCta}>
            <Text style={styles.heroCtaText}>Quiero esta promo</Text>
            <Feather name="arrow-right" size={13} color="#FFFFFF" />
          </View>
        </View>

        <PromoPreview
          imageUrl={getPromotionImage(promotion, promotion.commerce)}
          compact={false}
        />
      </View>

      <View style={styles.heroFooter}>
        <View style={styles.heroFooterMeta}>
          <Feather name="navigation" size={11} color="rgba(255,255,255,0.92)" />
          <Text style={styles.heroFooterText}>
            {formatDistance(promotion.distanceKm) || "Cerca tuyo"}
          </Text>
        </View>
        <Text style={styles.heroFooterText}>
          {locationLabel === "Tu ubicación" ? "Resultados por cercania" : locationLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function HotPromotionsSection({
  promotions,
  onAction,
  onPromotionPress,
}: {
  promotions: FeedPromotion[];
  onAction: () => void;
  onPromotionPress: (promotionId: number) => void;
}) {
  return (
    <>
      <HomeSectionHeader title="Ofertas hot del dia" actionLabel="Ver todas" onAction={onAction} />
      <FlashList
        data={promotions}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContent}
        ItemSeparatorComponent={() => <View style={styles.hotCardSeparator} />}
        keyExtractor={(promotion) => `hot-${promotion.id}`}
        renderItem={({ item: promotion }) => (
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.hotCard}
            onPress={() => onPromotionPress(promotion.id)}
          >
            <View style={styles.hotImageArea}>
              <PromoPreview imageUrl={getPromotionImage(promotion, promotion.commerce)} compact />
              <View style={styles.hotDiscountBadge}>
                <Text style={styles.hotDiscountBadgeText}>{getPromotionBadgeLabel(promotion)}</Text>
              </View>
              <View style={styles.hotBadge}>
                <Feather name="zap" size={10} color={theme.colors.accentRed} />
                <Text style={styles.hotBadgeText}>HOT</Text>
              </View>
            </View>
            <View style={styles.hotCardBody}>
              <Text style={styles.hotCommerceName} numberOfLines={1}>
                {promotion.commerce.name}
              </Text>
              <Text style={styles.hotTitle} numberOfLines={2}>
                {promotion.title}
              </Text>
              <View style={styles.hotFooterRow}>
                <Text style={styles.hotPrice}>Beneficio real</Text>
                <View style={styles.hotDistanceRow}>
                  <Feather name="navigation" size={10} color={theme.colors.textMuted} />
                  <Text style={styles.hotDistance}>
                    {formatDistance(promotion.distanceKm) || "Cerca"}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </>
  );
}

export function CategoryGridSection({
  categories,
  onAction,
}: {
  categories: HomeCategoryOption[];
  onAction: () => void;
}) {
  return (
    <>
      <HomeSectionHeader title="Explora por rubro" actionLabel="Ver todo" onAction={onAction} />
      <View style={styles.categoryGrid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            activeOpacity={0.9}
            style={styles.categoryItem}
            onPress={onAction}
          >
            <View style={[styles.categoryIconShell, { backgroundColor: category.tint }]}>
              {category.icon}
            </View>
            <Text style={styles.categoryLabel} numberOfLines={2}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

export function NearbyPromotionsSection({
  promotions,
  onAction,
  onPromotionPress,
}: {
  promotions: FeedPromotion[];
  onAction: () => void;
  onPromotionPress: (promotionId: number) => void;
}) {
  const [sortBy, setSortBy] = React.useState<"distance" | "discount" | "recent">("distance");

  const sortedPromos = React.useMemo(() => {
    if (sortBy === "discount") {
      return [...promotions].sort((a, b) => {
        const getDiscount = (p: typeof a) => p.discountValue ?? 0;
        return getDiscount(b) - getDiscount(a);
      });
    }
    return promotions; // distance/recent: use server order
  }, [promotions, sortBy]);

  const sortOptions = [
    { id: "distance" as const, label: "Más cercanas" },
    { id: "discount" as const, label: "Mayor descuento" },
    { id: "recent" as const, label: "Recientes" },
  ];

  return (
    <>
      <HomeSectionHeader title="Cerca tuyo" actionLabel="Mapa" onAction={onAction} />
      {/* Sort chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortChipsRow}
      >
        {sortOptions.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            activeOpacity={0.85}
            style={[styles.sortChip, sortBy === opt.id && styles.sortChipActive]}
            onPress={() => setSortBy(opt.id)}
          >
            <Text style={[styles.sortChipText, sortBy === opt.id && styles.sortChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.nearList}>
        {sortedPromos.map((promotion) => (
          <TouchableOpacity
            key={`near-${promotion.id}`}
            activeOpacity={0.94}
            style={styles.nearCard}
            onPress={() => onPromotionPress(promotion.id)}
          >
            <PromoPreview
              imageUrl={getPromotionImage(promotion, promotion.commerce)}
              compact
              style={styles.nearPreview}
            />
            <View style={styles.nearBody}>
              <View style={styles.nearHeaderRow}>
                <Text style={styles.nearCommerce} numberOfLines={1}>
                  {promotion.commerce.name}
                </Text>
                <View style={styles.openDot} />
              </View>
              <Text style={styles.nearPromoTitle} numberOfLines={1}>
                {promotion.title}
              </Text>
              <View style={styles.nearMetaRow}>
                <View style={styles.nearCategoryPill}>
                  <Text style={styles.nearCategoryText}>{promotion.categoryName || "Promo"}</Text>
                </View>
                <View style={styles.nearDistanceWrap}>
                  <Feather name="navigation" size={10} color={theme.colors.text} />
                  <Text style={styles.nearDistanceText}>
                    {formatDistance(promotion.distanceKm) || "Cerca"}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

export function MerchantRegistrationCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.94} style={styles.merchantCard} onPress={onPress}>
      <View style={styles.merchantWatermark} />
      <View style={styles.merchantPill}>
        <Feather name="shopping-bag" size={10} color={theme.colors.primary} />
        <Text style={styles.merchantPillText}>Para comercios</Text>
      </View>
      <Text style={styles.merchantTitle}>Tenes un negocio para sumar a PROMY?</Text>
      <Text style={styles.merchantText}>
        El alta para comercios vive en el panel web. Desde ahi podes registrarte, completar tu perfil y empezar el proceso de aprobacion.
      </Text>
      <View style={styles.merchantCta}>
        <Text style={styles.merchantCtaText}>Sumar mi comercio</Text>
        <Feather name="arrow-right" size={13} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

export function RecentActivitySection({
  redemptions,
  onPromotionPress,
  onAction,
}: {
  redemptions: ApiRedemption[];
  onPromotionPress: (promotionId: number) => void;
  onAction: () => void;
}) {
  const hasActivity = redemptions.length > 0;

  return (
    <>
      <HomeSectionHeader
        title="Tu actividad reciente"
        actionLabel={hasActivity ? "Ver todo" : "Ir a perfil"}
        onAction={onAction}
      />

      {hasActivity ? (
        <View style={styles.activityList}>
          {redemptions.map((redemption) => (
            <TouchableOpacity
              key={`activity-${redemption.id}`}
              activeOpacity={0.92}
              style={styles.activityCard}
              onPress={() => onPromotionPress(redemption.promotion.id)}
            >
              <View style={styles.activityIcon}>
                <Feather name="check-circle" size={16} color={theme.colors.success} />
              </View>
              <View style={styles.activityTextWrap}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  {redemption.promotion.title}
                </Text>
                <Text style={styles.activityMeta} numberOfLines={1}>
                  {redemption.commerce?.name || "Local adherido"} -{" "}
                  {new Date(redemption.createdAt).toLocaleDateString("es-AR")}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={theme.colors.textSoft} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyActivity}>
          <Text style={styles.emptyActivityTitle}>Todavia no tenes actividad</Text>
          <Text style={styles.emptyActivityText}>
            Cuando uses una promo vas a verla reflejada aca.
          </Text>
        </View>
      )}
    </>
  );
}

function PromoPreview({
  imageUrl,
  compact,
  style,
}: {
  imageUrl?: string | null;
  compact?: boolean;
  style?: StyleProp<ImageStyle>;
}) {
  const sizeStyle = compact ? styles.previewCompact : styles.previewLarge;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        contentFit="cover"
        cachePolicy="disk"
        transition={160}
        style={[sizeStyle, style]}
      />
    );
  }

  return (
    <View style={[styles.previewFallback, sizeStyle, style as StyleProp<ViewStyle>]}>
      <View style={styles.previewStripeOne} />
      <View style={styles.previewStripeTwo} />
      <PromoLogo size={compact ? "sm" : "md"} />
    </View>
  );
}

function HomeSectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity activeOpacity={0.85} onPress={onAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.headerDark,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerGlowRed: {
    position: "absolute",
    left: -50,
    top: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,49,49,0.24)",
  },
  headerGlowYellow: {
    position: "absolute",
    right: -55,
    top: 55,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,191,0,0.22)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "rgba(255,255,255,0.58)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  locationValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentRed,
    borderWidth: 2,
    borderColor: theme.colors.headerDark,
  },
  greetingBlock: {
    marginTop: 18,
    marginBottom: 14,
  },
  greetingEyebrow: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
  },
  greetingTitle: {
    marginTop: 2,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.7,
  },
  greetingTitleAccent: {
    color: theme.colors.primary,
  },
  searchShell: {
    height: 50,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    paddingLeft: 18,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...theme.shadow.soft,
  },
  searchText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  searchBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  locationNoticeCard: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 2,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  locationNoticeIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  locationNoticeBody: {
    flex: 1,
  },
  locationNoticeTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  locationNoticeText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  heroCard: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: theme.colors.accentRed,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    overflow: "hidden",
    ...theme.shadow.strong,
  },
  heroTopRow: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTopBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
  },
  heroTopBadgeText: {
    color: theme.colors.text,
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  heroTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroTimerText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "rgba(255,255,255,0.92)",
  },
  heroBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
  },
  heroTextCol: {
    flex: 1,
  },
  heroCommerceName: {
    fontSize: 10,
    fontWeight: "900",
    color: "rgba(255,255,255,0.82)",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroPromoTitle: {
    fontSize: 24,
    lineHeight: 25,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.9,
  },
  heroDiscountRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  heroDiscountPill: {
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroDiscountPillText: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.4,
  },
  heroSavingsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.82)",
  },
  heroCta: {
    marginTop: 12,
    alignSelf: "flex-start",
    height: 36,
    borderRadius: 999,
    backgroundColor: theme.colors.text,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroCtaText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.26)",
    backgroundColor: "rgba(0,0,0,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroFooterMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroFooterText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "rgba(255,255,255,0.92)",
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.accentRed,
  },
  horizontalContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  hotCardSeparator: {
    width: 12,
  },
  hotCard: {
    width: 192,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  hotImageArea: {
    height: 118,
    backgroundColor: theme.colors.surfaceWarm,
  },
  hotDiscountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: theme.colors.accentRed,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  hotDiscountBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  hotBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  hotBadgeText: {
    color: theme.colors.text,
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  hotCardBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hotCommerceName: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  hotTitle: {
    fontSize: 13.5,
    lineHeight: 16,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 8,
  },
  hotFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hotPrice: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.accentRed,
  },
  hotDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  hotDistance: {
    fontSize: 10.5,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  categoryGrid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    rowGap: 16,
  },
  categoryItem: {
    width: "31%",
    alignItems: "center",
  },
  categoryIconShell: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(17,17,17,0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
  },
  categoryLabel: {
    textAlign: "center",
    fontSize: 10.5,
    lineHeight: 12,
    fontWeight: "800",
    color: theme.colors.text,
  },
  sortChipsRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15,15,16,0.06)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  sortChipActive: {
    backgroundColor: "rgba(255,49,49,0.1)",
    borderColor: "rgba(255,49,49,0.3)",
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  sortChipTextActive: {
    color: theme.colors.accentRedDark,
  },
  nearList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  nearCard: {
    flexDirection: "row",
    gap: 12,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  nearPreview: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  nearBody: {
    flex: 1,
    justifyContent: "center",
  },
  nearHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  nearCommerce: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
  },
  nearPromoTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  nearMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nearCategoryPill: {
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  nearCategoryText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#8A5A2A",
  },
  nearDistanceWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  nearDistanceText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: theme.colors.text,
  },
  merchantCard: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.primary,
    padding: 16,
    overflow: "hidden",
    ...theme.shadow.card,
  },
  merchantWatermark: {
    position: "absolute",
    right: -12,
    bottom: -18,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,49,49,0.26)",
  },
  merchantPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: theme.colors.text,
    marginBottom: 8,
  },
  merchantPillText: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  merchantTitle: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.5,
    maxWidth: "68%",
  },
  merchantText: {
    marginTop: 4,
    maxWidth: "70%",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: "rgba(17,17,17,0.75)",
  },
  merchantCta: {
    marginTop: 12,
    alignSelf: "flex-start",
    height: 36,
    borderRadius: 999,
    backgroundColor: theme.colors.accentRed,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  merchantCtaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  activityList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.accentRedSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  emptyActivity: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceWarm,
    padding: 16,
  },
  emptyActivityTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptyActivityText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  previewLarge: {
    width: 108,
    height: 128,
    borderRadius: 16,
  },
  previewCompact: {
    width: "100%",
    height: "100%",
  },
  previewFallback: {
    backgroundColor: "#2B1E14",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewStripeOne: {
    position: "absolute",
    width: 140,
    height: 24,
    backgroundColor: "rgba(255,191,0,0.14)",
    transform: [{ rotate: "35deg" }, { translateX: -30 }, { translateY: -30 }],
  },
  previewStripeTwo: {
    position: "absolute",
    width: 150,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    transform: [{ rotate: "35deg" }, { translateX: 20 }, { translateY: 30 }],
  },
  skeletonWrap: {
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 18,
  },
  skeletonHero: {
    minHeight: 220,
    borderRadius: 30,
    backgroundColor: "#F7EFE1",
    padding: 20,
    justifyContent: "flex-end",
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#E9DFCF",
  },
  skeletonLineShort: {
    width: "36%",
  },
  skeletonLineMedium: {
    width: "48%",
  },
  skeletonLineTitle: {
    width: "76%",
    height: 24,
  },
  skeletonPillRow: {
    flexDirection: "row",
    gap: 10,
  },
  skeletonPill: {
    width: 88,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#E9DFCF",
  },
  skeletonSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skeletonAction: {
    width: 64,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#E9DFCF",
  },
  skeletonCardRow: {
    flexDirection: "row",
    gap: 12,
  },
  skeletonPromoCard: {
    width: 220,
    height: 246,
    borderRadius: 28,
    backgroundColor: "#F3E8D7",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  skeletonNearCard: {
    height: 92,
    borderRadius: 24,
    backgroundColor: "#F3E8D7",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
