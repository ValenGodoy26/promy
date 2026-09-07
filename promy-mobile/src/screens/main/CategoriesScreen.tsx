import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { fetchCategories, fetchMapMarkers, searchCatalog } from "../../api/catalog";
import {
  BottomSafeSpacer,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/promy/PromyUI";
import {
  ClusteredMapMarker,
  MapCanvas,
  MapHero,
  MapNotice,
  MapPromosSheet,
  MapStatsPanel,
  PromotionMatchesSection,
} from "../../components/promy/map/MapSections";
import type { MainStackParamList } from "../../navigation/types";
import {
  DEFAULT_CITY_LABEL,
  getPromyLocation,
  type LocationSnapshot,
} from "../../services/location";
import { theme } from "../../styles/theme";
import { ApiCategory, FeedPromotion, MapMarker } from "../../types/api";
import {
  DEFAULT_LAT,
  DEFAULT_LNG,
  formatAuthError,
} from "../../utils/promy";

const DEFAULT_REGION: Region = {
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

function buildClusteredMarkers(
  markers: Array<MapMarker & { latitude: number; longitude: number }>,
  region: Region,
): ClusteredMapMarker[] {
  if (markers.length <= 1) {
    return markers.map((commerce) => ({ kind: "commerce", commerce }));
  }

  const latStep = Math.max(region.latitudeDelta / 6, 0.0025);
  const lngStep = Math.max(region.longitudeDelta / 6, 0.0025);
  const buckets = new Map<
    string,
    Array<MapMarker & { latitude: number; longitude: number }>
  >();

  markers.forEach((commerce) => {
    const latKey = Math.floor(commerce.latitude / latStep);
    const lngKey = Math.floor(commerce.longitude / lngStep);
    const key = `${latKey}:${lngKey}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(commerce);
    buckets.set(key, bucket);
  });

  return Array.from(buckets.entries()).map(([key, bucket]) => {
    if (bucket.length === 1) {
      return { kind: "commerce", commerce: bucket[0] } as const;
    }

    const latitude =
      bucket.reduce((sum, item) => sum + item.latitude, 0) / bucket.length;
    const longitude =
      bucket.reduce((sum, item) => sum + item.longitude, 0) / bucket.length;

    return {
      kind: "cluster",
      id: `cluster-${key}`,
      latitude,
      longitude,
      count: bucket.length,
    } as const;
  });
}

export default function CategoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const mapRef = useRef<MapView | null>(null);

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [promotionMatches, setPromotionMatches] = useState<FeedPromotion[]>([]);
  const [location, setLocation] = useState<LocationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedCommerceId, setSelectedCommerceId] = useState<number | null>(null);
  const [mapSheetExpanded, setMapSheetExpanded] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region>(DEFAULT_REGION);

  const loadBaseMap = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      const currentLocation = await getPromyLocation();
      const [categoriesResponse, mapResponse] = await Promise.all([
        fetchCategories(),
        fetchMapMarkers({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          fallbackCitySlug: currentLocation.citySlug,
          radiusKm: 8,
          limit: 40,
          categorySlug: activeCategory === "all" ? undefined : activeCategory,
        }),
      ]);

      setLocation(currentLocation);
      setCurrentRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: DEFAULT_REGION.latitudeDelta,
        longitudeDelta: DEFAULT_REGION.longitudeDelta,
      });
      setCategories(categoriesResponse.categories ?? []);
      setMarkers(mapResponse.markers ?? []);
      setPromotionMatches([]);
    } catch (loadError) {
      setError(formatAuthError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSearching(false);
    }
  };

  useEffect(() => {
    void loadBaseMap();
  }, []);

  useEffect(() => {
    if (!location) return;

    const searchValue = search.trim();
    const timer = setTimeout(() => {
      if (searchValue.length < 2) {
        void loadMarkersByFilters();
        return;
      }

      void loadSearchResults(searchValue);
    }, 350);

    return () => clearTimeout(timer);
  }, [activeCategory, location, search]);

  const loadMarkersByFilters = async () => {
    if (!location) return;

    try {
      setSearching(true);
      setError(null);
      const mapResponse = await fetchMapMarkers({
        latitude: location.latitude,
        longitude: location.longitude,
        fallbackCitySlug: location.citySlug,
        radiusKm: 8,
        limit: 40,
        categorySlug: activeCategory === "all" ? undefined : activeCategory,
      });

      setMarkers(mapResponse.markers ?? []);
      setPromotionMatches([]);
    } catch (loadError) {
      setError(formatAuthError(loadError));
    } finally {
      setSearching(false);
    }
  };

  const loadSearchResults = async (value: string) => {
    if (!location) return;

    try {
      setSearching(true);
      setError(null);

      const response = await searchCatalog({
        value,
        latitude: location.latitude,
        longitude: location.longitude,
        citySlug: location.citySlug,
        limit: 20,
      });

      const commerceMatches =
        activeCategory === "all"
          ? response.commerces ?? []
          : (response.commerces ?? []).filter(
              (commerce) => commerce.category?.slug === activeCategory,
            );
      const promoMatches =
        activeCategory === "all"
          ? response.promotions ?? []
          : (response.promotions ?? []).filter(
              (promotion) => promotion.commerce.category?.slug === activeCategory,
            );

      setMarkers(
        commerceMatches.map((commerce) => ({
          ...commerce,
          promotions: commerce.promotions ?? [],
        })),
      );
      setPromotionMatches(promoMatches);
    } catch (loadError) {
      setError(formatAuthError(loadError));
    } finally {
      setSearching(false);
    }
  };

  const categoryOptions = useMemo(
    () => [
      { id: "all", label: "Todas" },
      ...categories.map((category) => ({ id: category.slug, label: category.name })),
    ],
    [categories],
  );

  useEffect(() => {
    if (!markers.length) {
      setSelectedCommerceId(null);
      return;
    }

    const exists = markers.some((commerce) => commerce.id === selectedCommerceId);
    if (!exists) {
      setSelectedCommerceId(markers[0].id);
    }
  }, [markers, selectedCommerceId]);

  const selectedCommerce = useMemo(
    () => markers.find((commerce) => commerce.id === selectedCommerceId) || markers[0] || null,
    [markers, selectedCommerceId],
  );

  const locationMessage =
    location?.source === "city_fallback"
      ? location.fallbackReason === "permission_denied"
        ? "No activaste tu ubicacion. Te mostramos Concordia para que sigas explorando promos y locales reales."
        : "No pudimos leer tu ubicacion real. Por ahora estas viendo Concordia como zona activa."
      : null;
  const sourceLabel =
    location?.source === "device" ? "Ubicacion actual" : "Mostrando Concordia";

  const coordinateMarkers = useMemo(
    () =>
      markers.filter(
        (item): item is MapMarker & { latitude: number; longitude: number } =>
          typeof item.latitude === "number" &&
          typeof item.longitude === "number" &&
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude),
      ),
    [markers],
  );

  const clusteredMarkers = useMemo(
    () => buildClusteredMarkers(coordinateMarkers, currentRegion),
    [coordinateMarkers, currentRegion],
  );

  useEffect(() => {
    if (!mapRef.current) return;

    const coordinates = [
      ...(location
        ? [{ latitude: location.latitude, longitude: location.longitude }]
        : []),
      ...coordinateMarkers.map((item) => ({
        latitude: item.latitude,
        longitude: item.longitude,
      })),
    ];

    if (coordinates.length === 0) {
      mapRef.current.animateToRegion(DEFAULT_REGION, 300);
      return;
    }

    if (coordinates.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        300,
      );
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 110, right: 70, bottom: 260, left: 70 },
      animated: true,
    });
  }, [coordinateMarkers, location]);

  const focusUser = () => {
    if (!mapRef.current || !location) return;

    mapRef.current.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      },
      300,
    );
  };

  const handleSelectCluster = (latitude: number, longitude: number, count: number) => {
    if (!mapRef.current) return;

    mapRef.current.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: Math.max(currentRegion.latitudeDelta * 0.55, 0.01),
        longitudeDelta: Math.max(currentRegion.longitudeDelta * 0.55, 0.01),
      },
      240,
    );

    if (count >= 3) {
      setMapSheetExpanded(true);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadBaseMap("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
      >
        <MapHero
          locationLabel={location?.label ?? DEFAULT_CITY_LABEL}
          sourceLabel={sourceLabel}
          search={search}
          onSearchChange={setSearch}
          searching={searching}
          onFocusUser={focusUser}
          categoryOptions={categoryOptions}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {loading ? (
          <LoadingState label="Cargando mapa..." />
        ) : error ? (
          <ErrorState
            title="No pudimos cargar el mapa"
            message={error}
            onRetry={() => void loadBaseMap()}
          />
        ) : markers.length === 0 && search.trim().length < 2 ? (
          <>
            {locationMessage ? (
              <MapNotice
                message={locationMessage}
                fallbackReason={location?.fallbackReason ?? null}
                actionLabel={location?.fallbackReason === "permission_denied" ? "Intentar de nuevo" : undefined}
                onAction={location?.fallbackReason === "permission_denied" ? () => void loadBaseMap("refresh") : undefined}
              />
            ) : null}
            <EmptyState
              title="No encontramos promos cerca tuyo"
              message="Probá con otro rubro, limpiá la búsqueda o volvé a intentar en unos minutos."
              actionLabel="Reintentar"
              onAction={() => void loadBaseMap()}
            />
          </>
        ) : (
          <>
            {locationMessage ? (
              <MapNotice
                message={locationMessage}
                fallbackReason={location?.fallbackReason ?? null}
                actionLabel={location?.fallbackReason === "permission_denied" ? "Intentar de nuevo" : undefined}
                onAction={location?.fallbackReason === "permission_denied" ? () => void loadBaseMap("refresh") : undefined}
              />
            ) : null}

            <MapCanvas
              mapRef={mapRef}
              initialRegion={DEFAULT_REGION}
              showUserLocation={location?.source === "device"}
              markers={clusteredMarkers}
              selectedCommerceId={selectedCommerceId}
              onSelectCommerce={setSelectedCommerceId}
              onSelectCluster={handleSelectCluster}
              onRegionChangeComplete={setCurrentRegion}
              onOpenList={() => setMapSheetExpanded(true)}
              fallbackLabel={location?.label ?? DEFAULT_CITY_LABEL}
              onOpenCommerce={(commerceId) =>
                navigation.navigate("CommerceDetail", { commerceId })
              }
            />

            <MapStatsPanel markersCount={markers.length} />

            <MapPromosSheet
              markers={markers}
              selectedCommerce={selectedCommerce}
              expanded={mapSheetExpanded}
              onToggleExpanded={() => setMapSheetExpanded((value) => !value)}
              onSelectCommerce={setSelectedCommerceId}
              onOpenPromotion={(promotionId) =>
                navigation.navigate("PromotionDetail", { promotionId })
              }
              onOpenCommerce={(commerceId) =>
                navigation.navigate("CommerceDetail", { commerceId })
              }
            />

            {promotionMatches.length ? (
              <PromotionMatchesSection
                promotions={promotionMatches}
                onOpenPromotion={(promotionId) =>
                  navigation.navigate("PromotionDetail", { promotionId })
                }
              />
            ) : null}
          </>
        )}
        <BottomSafeSpacer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 24 },
});
