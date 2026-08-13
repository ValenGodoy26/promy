import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import MapView, { Callout, Marker, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { FilterChipsRow } from "../PromyUI";
import { DEFAULT_CITY_LABEL } from "../../../services/location";
import { theme } from "../../../styles/theme";
import type { ApiPromotion, FeedPromotion, MapMarker } from "../../../types/api";
import {
  formatDistance,
  getCommerceHeadline,
  getCommerceImage,
  getPromotionBadgeLabel,
  getPromotionHot,
  hasUsableRemoteImage,
} from "../../../utils/promy";

export const PROMY_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#fff7e7" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6a6256" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fff7e7" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#f0e1bc" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffe09b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d8eef4" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

export function MapHero({
  locationLabel,
  sourceLabel,
  search,
  onSearchChange,
  searching,
  onFocusUser,
  categoryOptions,
  activeCategory,
  onCategoryChange,
}: {
  locationLabel: string;
  sourceLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  searching: boolean;
  onFocusUser: () => void;
  categoryOptions: Array<{ id: string; label: string }>;
  activeCategory: string;
  onCategoryChange: (value: string) => void;
}) {
  return (
    <>
    <SafeAreaView edges={["top"]} style={styles.header}>
      <View style={styles.headerGlowRed} />
      <View style={styles.headerGlowYellow} />

      <View style={styles.headerTopRow}>
        <View style={styles.headerMetaPill}>
          <Feather name="map-pin" size={11} color={theme.colors.primary} />
          <Text style={styles.headerMetaPillText}>{locationLabel}</Text>
        </View>

        <View style={styles.headerMetaPillAlt}>
          <Text style={styles.headerMetaPillAltText}>{sourceLabel}</Text>
        </View>
      </View>

      <Text style={styles.headerTitle}>Mapa</Text>
      <Text style={styles.headerSubtitle}>
        Mira promociones y locales sobre un mapa real, con pines vivos y contexto cercano.
      </Text>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={theme.colors.text} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Buscar en PROMY..."
            placeholderTextColor={theme.colors.textSoft}
            style={styles.searchInput}
          />
          {searching ? <ActivityIndicator size="small" color={theme.colors.accentRed} /> : null}
        </View>

        <TouchableOpacity activeOpacity={0.9} style={styles.iconButton} onPress={onFocusUser}>
          <Feather name="crosshair" size={17} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

    </SafeAreaView>

    {/* Filter chips — below dark header, cream background */}
    <View style={styles.subHeader}>
      <View style={styles.chipsScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
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

export function MapStatsPanel({ markersCount }: { markersCount: number }) {
  return (
    <View style={styles.overlapStats}>
      <View style={styles.statCol}>
        <Text style={styles.statEyebrow}>Mapa activo</Text>
        <Text style={styles.statValue}>{markersCount}</Text>
        <Text style={styles.statLabel}>locales visibles</Text>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statSide}>
        <View style={styles.statPill}>
          <Feather name="navigation" size={12} color={theme.colors.accentRed} />
          <Text style={styles.statPillText}>Pines reales</Text>
        </View>
        <Text style={styles.statBody}>
          Search, nearby y detalle conectados sobre coordenadas reales.
        </Text>
      </View>
    </View>
  );
}

export function MapNotice({ message, fallbackReason }: { message: string; fallbackReason?: string | null }) {
  return (
    <View style={styles.noticeCard}>
      <Feather
        name={fallbackReason === "permission_denied" ? "map-pin" : "navigation"}
        size={15}
        color={theme.colors.text}
      />
      <Text style={styles.noticeCardText}>{message}</Text>
    </View>
  );
}

export function MapCanvas({
  mapRef,
  initialRegion,
  showUserLocation,
  markers,
  selectedCommerceId,
  onSelectCommerce,
  onOpenCommerce,
  fallbackLabel = DEFAULT_CITY_LABEL,
}: {
  mapRef: React.RefObject<MapView | null>;
  initialRegion: Region;
  showUserLocation: boolean;
  markers: Array<MapMarker & { latitude: number; longitude: number }>;
  selectedCommerceId: number | null;
  onSelectCommerce: (commerceId: number) => void;
  onOpenCommerce: (commerceId: number) => void;
  fallbackLabel?: string;
}) {
  return (
    <View style={styles.mapShell}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapPadding={{ top: 90, right: 18, bottom: 24, left: 18 }}
        customMapStyle={PROMY_MAP_STYLE}
      >
        {markers.map((commerce) => {
          const promo = commerce.promotions?.[0];
          const markerLabel = promo ? getPromotionBadgeLabel(promo) : "LOCAL";

          return (
            <Marker
              key={commerce.id}
              coordinate={{
                latitude: commerce.latitude,
                longitude: commerce.longitude,
              }}
              onPress={() => onSelectCommerce(commerce.id)}
            >
              <MapPin
                label={markerLabel}
                selected={selectedCommerceId === commerce.id}
                highlighted={!promo}
              />
              <Callout tooltip onPress={() => onOpenCommerce(commerce.id)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{commerce.name}</Text>
                  <Text style={styles.calloutSubtitle}>
                    {commerce.address || commerce.city?.name || fallbackLabel}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.mapOverlayTop}>
        <View style={styles.mapOverlayPill}>
          <Feather name="map" size={12} color={theme.colors.text} />
          <Text style={styles.mapOverlayPillText}>{fallbackLabel}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.9} style={styles.mapOverlayAction}>
          <Feather name="layers" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SelectedCommerceSheet({
  commerce,
  featuredPromotion,
  onOpenPromotion,
  onOpenCommerce,
}: {
  commerce: MapMarker;
  featuredPromotion?: ApiPromotion | null;
  onOpenPromotion: (promotionId: number) => void;
  onOpenCommerce: (commerceId: number) => void;
}) {
  const imageUrl = getCommerceImage(commerce);

  return (
    <View style={styles.sheetCard}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetRow}>
        <View style={styles.sheetImageWrap}>
          {imageUrl && hasUsableRemoteImage(imageUrl) ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.sheetImage}
              contentFit="cover"
              cachePolicy="disk"
              transition={160}
            />
          ) : (
            <View style={styles.sheetImageFallback}>
              <Text style={styles.sheetImageFallbackText}>{commerce.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.sheetBody}>
          <View style={styles.sheetTopRow}>
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {commerce.name}
            </Text>
            <View style={styles.sheetDistancePill}>
              <Feather name="navigation" size={11} color={theme.colors.textMuted} />
              <Text style={styles.sheetDistanceText}>
                {formatDistance(commerce.distanceKm)}
              </Text>
            </View>
          </View>

          <Text style={styles.sheetCategory} numberOfLines={1}>
            {commerce.category?.name ?? "Local adherido"}
          </Text>
          <Text style={styles.sheetHeadline} numberOfLines={2}>
            {getCommerceHeadline(commerce)}
          </Text>

          {featuredPromotion ? (
            <View style={styles.sheetPromoRow}>
              {getPromotionHot(featuredPromotion) ? (
                <View style={styles.sheetHotPill}>
                  <Feather name="zap" size={11} color="#FFFFFF" />
                  <Text style={styles.sheetHotPillText}>HOT</Text>
                </View>
              ) : null}
              <Text style={styles.sheetPromoText} numberOfLines={1}>
                {featuredPromotion.title}
              </Text>
            </View>
          ) : null}

          <View style={styles.sheetActions}>
            {featuredPromotion ? (
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.primaryCta}
                onPress={() => onOpenPromotion(featuredPromotion.id)}
              >
                <Text style={styles.primaryCtaText}>Ver promo</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.secondaryCta}
              onPress={() => onOpenCommerce(commerce.id)}
            >
              <Text style={styles.secondaryCtaText}>Ver local</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

export function PromotionMatchesSection({
  promotions,
  onOpenPromotion,
}: {
  promotions: FeedPromotion[];
  onOpenPromotion: (promotionId: number) => void;
}) {
  return (
    <View style={styles.matchesSection}>
      <View style={styles.matchesHeader}>
        <Text style={styles.matchesTitle}>Promos encontradas por busqueda</Text>
        <Text style={styles.matchesAction}>{promotions.length} resultados</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.matchesScroll}
      >
        {promotions.map((promotion) => (
          <TouchableOpacity
            key={promotion.id}
            activeOpacity={0.94}
            style={styles.matchCard}
            onPress={() => onOpenPromotion(promotion.id)}
          >
            <Text style={styles.matchMerchant}>{promotion.commerce.name}</Text>
            <Text style={styles.matchTitle} numberOfLines={2}>
              {promotion.title}
            </Text>
            <Text style={styles.matchMeta}>{getPromotionBadgeLabel(promotion)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function MapPin({
  label,
  selected,
  highlighted,
}: {
  label: string;
  selected: boolean;
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.pinWrap, selected && styles.pinWrapSelected]}>
      <View
        style={[
          styles.pinBody,
          highlighted ? styles.pinBodyYellow : styles.pinBodyRed,
          selected && styles.pinBodySelected,
        ]}
      >
        <Text style={[styles.pinText, highlighted && styles.pinTextDark]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View
        style={[
          styles.pinTip,
          highlighted ? styles.pinTipYellow : styles.pinTipRed,
          selected && styles.pinTipSelected,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  subHeader: {
    backgroundColor: theme.colors.background,
    paddingVertical: 10,
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
  headerGlowRed: {
    position: "absolute",
    top: -44,
    left: -40,
    width: 210,
    height: 210,
    borderRadius: 220,
    backgroundColor: "rgba(255,49,49,0.24)",
  },
  headerGlowYellow: {
    position: "absolute",
    top: 0,
    right: -55,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(255,191,0,0.22)",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  headerMetaPill: {
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
  headerMetaPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerMetaPillAlt: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,191,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,191,0,0.24)",
  },
  headerMetaPillAltText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1.3,
    marginTop: 18,
  },
  headerSubtitle: {
    color: theme.colors.mutedOnDark,
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "600",
    marginTop: 6,
    maxWidth: 320,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
  },
  searchBox: {
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
    shadowOpacity: 0.3,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.cardDarkAlt,
    borderWidth: 1.5,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#111111",
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
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
  filterScroll: {
    paddingTop: 14,
  },
  overlapStats: {
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
  statCol: {
    minWidth: 98,
  },
  statEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.accentRed,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -1.3,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  statSide: {
    flex: 1,
    gap: 8,
  },
  statPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.accentRedSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.accentRed,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statBody: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  noticeCard: {
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
  noticeCardText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
  },
  mapShell: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 28,
    overflow: "hidden",
    height: 430,
    backgroundColor: "#FFFBEF",
    ...theme.shadow.card,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapOverlayTop: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapOverlayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
  },
  mapOverlayPillText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mapOverlayAction: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.headerDark,
    alignItems: "center",
    justifyContent: "center",
  },
  pinWrap: {
    alignItems: "center",
  },
  pinWrapSelected: {
    transform: [{ scale: 1.06 }],
  },
  pinBody: {
    minWidth: 58,
    maxWidth: 86,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  pinBodyRed: {
    backgroundColor: theme.colors.accentRed,
  },
  pinBodyYellow: {
    backgroundColor: theme.colors.primary,
  },
  pinBodySelected: {
    shadowColor: "#111111",
    shadowOpacity: 0.28,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
  },
  pinText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: -0.1,
  },
  pinTextDark: {
    color: theme.colors.text,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -2,
  },
  pinTipRed: {
    borderTopColor: theme.colors.accentRed,
  },
  pinTipYellow: {
    borderTopColor: theme.colors.primary,
  },
  pinTipSelected: {
    transform: [{ scaleX: 1.04 }],
  },
  callout: {
    backgroundColor: theme.colors.headerDark,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 160,
  },
  calloutTitle: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
  calloutSubtitle: {
    color: theme.colors.mutedOnDark,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  sheetCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    ...theme.shadow.card,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
    marginBottom: 14,
  },
  sheetRow: {
    flexDirection: "row",
    gap: 14,
  },
  sheetImageWrap: {
    width: 108,
    height: 132,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceMuted,
  },
  sheetImage: {
    width: "100%",
    height: "100%",
  },
  sheetImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 10,
  },
  sheetImageFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  sheetBody: {
    flex: 1,
  },
  sheetTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sheetTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 20,
  },
  sheetDistancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sheetDistanceText: {
    color: theme.colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
  },
  sheetCategory: {
    marginTop: 5,
    fontSize: 11,
    color: theme.colors.accentRed,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sheetHeadline: {
    marginTop: 7,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  sheetPromoRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetHotPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.accentRed,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sheetHotPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  sheetPromoText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  sheetActions: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  primaryCta: {
    backgroundColor: theme.colors.accentRed,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  secondaryCta: {
    backgroundColor: theme.colors.headerDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  secondaryCtaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  matchesSection: {
    marginTop: 24,
  },
  matchesHeader: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  matchesTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  matchesAction: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  matchesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  matchCard: {
    width: 196,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 14,
    ...theme.shadow.soft,
  },
  matchMerchant: {
    color: theme.colors.accentRed,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  matchTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 6,
    letterSpacing: -0.4,
  },
  matchMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
});
