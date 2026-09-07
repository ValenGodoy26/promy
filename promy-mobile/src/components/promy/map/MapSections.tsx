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
import MapView, { Marker, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { FilterChipsRow } from "../PromyUI";
import PromoImagePlaceholder from "../PromoImagePlaceholder";
import { DEFAULT_CITY_LABEL } from "../../../services/location";
import { theme } from "../../../styles/theme";
import type { ApiPromotion, FeedPromotion, MapMarker } from "../../../types/api";
import {
  formatDistance,
  getCommerceHeadline,
  getCommerceImage,
  getPromotionBadgeLabel,
  getPromotionHot,
  getPromotionImage,
  hasUsableRemoteImage,
} from "../../../utils/promy";

export type ClusteredMapMarker =
  | {
      kind: "commerce";
      commerce: MapMarker & { latitude: number; longitude: number };
    }
  | {
      kind: "cluster";
      id: string;
      latitude: number;
      longitude: number;
      count: number;
    };

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

        <TouchableOpacity activeOpacity={0.9} style={styles.locationButton} onPress={onFocusUser}>
          <Feather name="crosshair" size={15} color="#FFFFFF" />
          <Text style={styles.locationButtonText}>Mi ubicación</Text>
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
          Búsqueda, cercanía y detalle conectados sobre coordenadas reales.
        </Text>
      </View>
    </View>
  );
}

export function MapNotice({
  message,
  fallbackReason,
  actionLabel,
  onAction,
}: {
  message: string;
  fallbackReason?: string | null;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.noticeCard}>
      <View style={styles.noticeIconWrap}>
        <Feather
          name={fallbackReason === "permission_denied" ? "map-pin" : "navigation"}
          size={15}
          color={theme.colors.text}
        />
      </View>
      <View style={styles.noticeBody}>
        <Text style={styles.noticeTitle}>
          {fallbackReason === "permission_denied" ? "Ubicación desactivada" : "Usando Concordia"}
        </Text>
        <Text style={styles.noticeCardText}>{message}</Text>
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity activeOpacity={0.88} style={styles.noticeAction} onPress={onAction}>
          <Text style={styles.noticeActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
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
  onSelectCluster,
  onRegionChangeComplete,
  onOpenCommerce,
  onOpenList,
  fallbackLabel = DEFAULT_CITY_LABEL,
}: {
  mapRef: React.RefObject<MapView | null>;
  initialRegion: Region;
  showUserLocation: boolean;
  markers: ClusteredMapMarker[];
  selectedCommerceId: number | null;
  onSelectCommerce: (commerceId: number) => void;
  onSelectCluster: (latitude: number, longitude: number, count: number) => void;
  onRegionChangeComplete: (region: Region) => void;
  onOpenCommerce: (commerceId: number) => void;
  onOpenList: () => void;
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
        onRegionChangeComplete={onRegionChangeComplete}
        mapPadding={{ top: 82, right: 18, bottom: 120, left: 18 }}
      >
        {markers.map((markerItem) => {
          if (markerItem.kind === "cluster") {
            return (
              <Marker
                key={markerItem.id}
                coordinate={{
                  latitude: markerItem.latitude,
                  longitude: markerItem.longitude,
                }}
                tracksViewChanges={false}
                onPress={() =>
                  onSelectCluster(
                    markerItem.latitude,
                    markerItem.longitude,
                    markerItem.count,
                  )
                }
              >
                <ClusterPin count={markerItem.count} />
              </Marker>
            );
          }

          const commerce = markerItem.commerce;
          const promo = commerce.promotions?.[0];
          const markerLabel = promo ? getPromotionBadgeLabel(promo) : "LOCAL";
          const markerMeta = promo
            ? getPromotionHot(promo)
              ? "HOT"
              : commerce.category?.name?.slice(0, 4).toUpperCase() || "PROMO"
            : commerce.category?.name?.slice(0, 4).toUpperCase() || "LOCAL";

          return (
            <Marker
              key={commerce.id}
              coordinate={{
                latitude: commerce.latitude,
                longitude: commerce.longitude,
              }}
              tracksViewChanges={false}
              onPress={() => onSelectCommerce(commerce.id)}
            >
              <MapPin
                label={markerLabel}
                meta={markerMeta}
                selected={selectedCommerceId === commerce.id}
                highlighted={!promo}
              />
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.mapOverlayTop}>
        <View style={styles.mapOverlayPill}>
          <Feather name="map" size={12} color={theme.colors.text} />
          <Text style={styles.mapOverlayPillText}>{fallbackLabel}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.9} style={styles.mapOverlayAction} onPress={onOpenList}>
          <Feather name="list" size={15} color="#FFFFFF" />
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
            <PromoImagePlaceholder
              variant="thumb"
              commerceName={commerce.name}
              categoryName={commerce.category?.name}
              label="Local cercano"
              style={styles.sheetImageFallback}
            />
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
              <View style={styles.sheetValidatedPill}>
                <Feather name="check-circle" size={10} color={theme.colors.success} />
                <Text style={styles.sheetValidatedText}>Validada</Text>
              </View>
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


type MapPromotionItem = ApiPromotion & {
  commerce: MapMarker;
  categoryName?: string;
  distanceKm?: number | null;
};

export function MapPromosSheet({
  markers,
  selectedCommerce,
  expanded,
  onToggleExpanded,
  onSelectCommerce,
  onOpenPromotion,
  onOpenCommerce,
}: {
  markers: MapMarker[];
  selectedCommerce: MapMarker | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelectCommerce: (commerceId: number) => void;
  onOpenPromotion: (promotionId: number) => void;
  onOpenCommerce: (commerceId: number) => void;
}) {
  const promotions = React.useMemo<MapPromotionItem[]>(() => {
    const items: MapPromotionItem[] = [];

    markers.forEach((commerce) => {
      (commerce.promotions ?? []).forEach((promotion) => {
        items.push({
          ...promotion,
          commerce,
          categoryName: commerce.category?.name,
          distanceKm: commerce.distanceKm,
        });
      });
    });

    return items;
  }, [markers]);

  const selectedPromotion = selectedCommerce?.promotions?.[0] ?? null;
  const visiblePromotions = promotions.slice(0, expanded ? 8 : 3);

  return (
    <View style={styles.mapSheetCard}>
      <TouchableOpacity activeOpacity={0.86} style={styles.mapSheetHandleArea} onPress={onToggleExpanded}>
        <View style={styles.mapSheetHandle} />
      </TouchableOpacity>

      <View style={styles.mapSheetHeader}>
        <View>
          <Text style={styles.mapSheetEyebrow}>{expanded ? "Explorando en mapa" : "Promos cerca tuyo"}</Text>
          <Text style={styles.mapSheetTitle}>
            {expanded ? `${promotions.length} promos disponibles` : selectedCommerce?.name || "Elegí un pin"}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.88} style={styles.mapSheetToggle} onPress={onToggleExpanded}>
          <Text style={styles.mapSheetToggleText}>{expanded ? "Compactar" : "Ver lista"}</Text>
          <Feather name={expanded ? "chevron-down" : "chevron-up"} size={13} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {!expanded && selectedCommerce ? (
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.mapSheetSelected}
          onPress={() =>
            selectedPromotion
              ? onOpenPromotion(selectedPromotion.id)
              : onOpenCommerce(selectedCommerce.id)
          }
        >
          <PromoImagePlaceholder
            variant="thumb"
            commerceName={selectedCommerce.name}
            categoryName={selectedCommerce.category?.name}
            title={selectedPromotion?.title || "Local adherido"}
            label={selectedPromotion ? getPromotionBadgeLabel(selectedPromotion) : "LOCAL"}
            style={styles.mapSheetSelectedImage}
          />
          <View style={styles.mapSheetSelectedBody}>
            <View style={styles.mapSheetSelectedTop}>
              <Text style={styles.mapSheetCommerce} numberOfLines={1}>
                {selectedCommerce.name}
              </Text>
              <Text style={styles.mapSheetDistance}>{formatDistance(selectedCommerce.distanceKm) || "Cerca"}</Text>
            </View>
            <Text style={styles.mapSheetPromoTitle} numberOfLines={1}>
              {selectedPromotion?.title || getCommerceHeadline(selectedCommerce)}
            </Text>
            <View style={styles.mapSheetPills}>
              {selectedPromotion ? (
                <View style={styles.mapSheetRedPill}>
                  <Text style={styles.mapSheetRedPillText}>{getPromotionBadgeLabel(selectedPromotion)}</Text>
                </View>
              ) : null}
              <View style={styles.mapSheetSoftPill}>
                <Feather name="check-circle" size={10} color={theme.colors.success} />
                <Text style={styles.mapSheetSoftPillText}>
                  {selectedPromotion ? "Validada" : "Local activo"}
                </Text>
              </View>
            </View>
          </View>
          <Feather name="arrow-right" size={18} color={theme.colors.text} />
        </TouchableOpacity>
      ) : null}

      {expanded ? (
        <View style={styles.mapSheetList}>
          {visiblePromotions.map((promotion) => (
            <TouchableOpacity
              key={`map-sheet-${promotion.commerce.id}-${promotion.id}`}
              activeOpacity={0.9}
              style={styles.mapSheetRow}
              onPress={() => {
                onSelectCommerce(promotion.commerce.id);
                onOpenPromotion(promotion.id);
              }}
            >
              <PromoImagePlaceholder
                variant="thumb"
                commerceName={promotion.commerce.name}
                categoryName={promotion.categoryName}
                title={promotion.title}
                label={getPromotionBadgeLabel(promotion)}
                style={styles.mapSheetRowImage}
              />
              <View style={styles.mapSheetRowBody}>
                <View style={styles.mapSheetRowTop}>
                  <Text style={styles.mapSheetCommerce} numberOfLines={1}>
                    {promotion.commerce.name}
                  </Text>
                  <Text style={styles.mapSheetDistance}>{formatDistance(promotion.distanceKm) || "Cerca"}</Text>
                </View>
                <Text style={styles.mapSheetPromoTitle} numberOfLines={1}>{promotion.title}</Text>
                <Text style={styles.mapSheetMeta} numberOfLines={1}>
                  {promotion.categoryName || "Promo activa"} · {getPromotionHot(promotion) ? "HOT" : "Disponible hoy"}
                </Text>
              </View>
              <View style={styles.mapSheetDiscount}>
                <Text style={styles.mapSheetDiscountText}>{getPromotionBadgeLabel(promotion)}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {!visiblePromotions.length ? (
            <View style={styles.mapSheetEmpty}>
              <Feather name="map-pin" size={18} color={theme.colors.accentRed} />
              <Text style={styles.mapSheetEmptyText}>
                Seleccioná un rubro o buscá para ver promos cercanas.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
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
  meta,
  selected,
  highlighted,
}: {
  label: string;
  meta?: string;
  selected: boolean;
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.pinWrap, selected && styles.pinWrapSelected]}>
      {meta ? (
        <View style={[styles.pinMeta, highlighted && styles.pinMetaYellow]}>
          <Text style={[styles.pinMetaText, highlighted && styles.pinMetaTextDark]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      ) : null}
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

function ClusterPin({ count }: { count: number }) {
  return (
    <View style={styles.clusterWrap}>
      <View style={styles.clusterOuter}>
        <View style={styles.clusterInner}>
          <Text style={styles.clusterCount}>{count}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subHeader: {
    backgroundColor: theme.colors.background,
    paddingVertical: 8,
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
  locationButton: {
    minWidth: 96,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.cardDarkAlt,
    borderWidth: 1.5,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    shadowColor: "#111111",
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  locationButtonText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  chipsScrollWrap: {
    position: "relative",
  },
  chipsFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 30,
    pointerEvents: "none",
    shadowColor: "#0F0F10",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: -4, height: 0 },
  },
  filterScroll: {
    paddingTop: 9,
    paddingBottom: 1,
    paddingRight: 18,
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
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noticeIconWrap: {
    width: 34,
    height: 36,
    borderRadius: 13,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeBody: {
    flex: 1,
  },
  noticeTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 2,
  },
  noticeCardText: {
    color: theme.colors.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "700",
  },
  noticeAction: {
    backgroundColor: theme.colors.accentRed,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  noticeActionText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  mapShell: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 28,
    overflow: "hidden",
    height: 520,
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
    transform: [{ scale: 1.08 }],
  },
  pinMeta: {
    marginBottom: -5,
    zIndex: 2,
    backgroundColor: theme.colors.headerDark,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1.4,
    borderColor: theme.colors.text,
  },
  pinMetaYellow: {
    backgroundColor: theme.colors.surface,
  },
  pinMetaText: {
    color: theme.colors.primary,
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  pinMetaTextDark: {
    color: theme.colors.text,
  },
  pinBody: {
    minWidth: 62,
    maxWidth: 86,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 18,
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
  clusterWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  clusterOuter: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,191,0,0.26)",
    borderWidth: 1,
    borderColor: "rgba(255,191,0,0.48)",
  },
  clusterInner: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.headerDark,
  },
  clusterCount: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
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
    marginTop: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    ...theme.shadow.soft,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 54,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
    marginBottom: 10,
  },
  sheetRow: {
    flexDirection: "row",
    gap: 14,
  },
  sheetImageWrap: {
    width: 88,
    height: 96,
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
    fontSize: 15.5,
    fontWeight: "900",
    letterSpacing: -0.35,
    lineHeight: 19,
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
    marginTop: 5,
    color: theme.colors.textMuted,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
  },
  sheetPromoRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
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
  sheetValidatedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.successSoft,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  sheetValidatedText: {
    color: theme.colors.success,
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
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  primaryCta: {
    backgroundColor: theme.colors.accentRed,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  secondaryCta: {
    backgroundColor: theme.colors.headerDark,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
  },
  secondaryCtaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  mapSheetCard: {
    marginHorizontal: 16,
    marginTop: -26,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    zIndex: 5,
    ...theme.shadow.card,
  },
  mapSheetHandleArea: {
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 5,
    marginTop: -2,
    marginBottom: 2,
  },
  mapSheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D9CCB4",
  },
  mapSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  mapSheetEyebrow: {
    color: theme.colors.accentRed,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  mapSheetTitle: {
    marginTop: 2,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  mapSheetToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mapSheetToggleText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "900",
  },
  mapSheetSelected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },
  mapSheetSelectedImage: {
    width: 76,
    height: 76,
    borderRadius: 18,
  },
  mapSheetSelectedBody: {
    flex: 1,
  },
  mapSheetSelectedTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  mapSheetCommerce: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: -0.25,
  },
  mapSheetDistance: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
  },
  mapSheetPromoTitle: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  mapSheetPills: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  mapSheetRedPill: {
    backgroundColor: theme.colors.accentRed,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mapSheetRedPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  mapSheetSoftPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.successSoft,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  mapSheetSoftPillText: {
    color: theme.colors.success,
    fontSize: 10,
    fontWeight: "900",
  },
  mapSheetList: {
    gap: 9,
  },
  mapSheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 9,
  },
  mapSheetRowImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },
  mapSheetRowBody: {
    flex: 1,
  },
  mapSheetRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapSheetMeta: {
    marginTop: 3,
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  mapSheetDiscount: {
    backgroundColor: theme.colors.headerDark,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  mapSheetDiscountText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
  },
  mapSheetEmpty: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  mapSheetEmptyText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
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
