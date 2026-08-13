import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  fetchCategories,
  fetchNearbyCommerces,
  fetchNearbyPromotions,
  searchCatalog,
} from "../../api/catalog";
import {
  ErrorState,
  LoadingState,
} from "../../components/promy/PromyUI";
import {
  ExploreFeaturedPromotion,
  ExploreHero,
  ExploreNotice,
  ExploreResultsSection,
  ExploreStatsPanel,
  type ExploreTab,
} from "../../components/promy/explore/ExploreSections";
import type { MainStackParamList } from "../../navigation/types";
import {
  DEFAULT_CITY_LABEL,
  getPromyLocation,
  type LocationSnapshot,
} from "../../services/location";
import { theme } from "../../styles/theme";
import { ApiCategory, ApiCommerce, FeedPromotion } from "../../types/api";
import { formatAuthError } from "../../utils/promy";

export default function CommercesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [commerces, setCommerces] = useState<ApiCommerce[]>([]);
  const [promotions, setPromotions] = useState<FeedPromotion[]>([]);
  const [location, setLocation] = useState<LocationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tab, setTab] = useState<ExploreTab>("promotions");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchCommerces, setSearchCommerces] = useState<ApiCommerce[] | null>(null);
  const [searchPromotions, setSearchPromotions] = useState<FeedPromotion[] | null>(null);
  const searchRequestIdRef = useRef(0);

  const loadExplore = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setBootstrapError(null);

      const currentLocation = await getPromyLocation();
      const [categoriesResponse, commercesResponse, promotionsResponse] = await Promise.all([
        fetchCategories(),
        fetchNearbyCommerces({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          fallbackCitySlug: currentLocation.citySlug,
          radiusKm: 8,
          limit: 32,
        }),
        fetchNearbyPromotions({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          fallbackCitySlug: currentLocation.citySlug,
          radiusKm: 8,
          limit: 32,
        }),
      ]);

      setCategories(categoriesResponse.categories ?? []);
      setCommerces(commercesResponse.commerces ?? []);
      setPromotions(promotionsResponse.promotions ?? []);
      setLocation(currentLocation);
      setSearchCommerces(null);
      setSearchPromotions(null);
      setSearchError(null);
    } catch (loadError) {
      setBootstrapError(formatAuthError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadExplore();
  }, []);

  useEffect(() => {
    if (!location) return;

    const value = search.trim();

    if (value.length < 2) {
      searchRequestIdRef.current += 1;
      setSearchCommerces(null);
      setSearchPromotions(null);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(() => {
      void loadSearchResults(value);
    }, 350);

    return () => clearTimeout(timer);
  }, [activeCategory, location, search]);

  const loadSearchResults = async (value: string) => {
    if (!location) return;
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    try {
      setSearching(true);
      setSearchError(null);

      const response = await searchCatalog({
        value,
        latitude: location.latitude,
        longitude: location.longitude,
        citySlug: location.citySlug,
        limit: 24,
      });

      if (searchRequestIdRef.current !== requestId) return;

      const filteredCommerces =
        activeCategory === "all"
          ? response.commerces ?? []
          : (response.commerces ?? []).filter(
              (commerce) => commerce.category?.slug === activeCategory,
            );
      const filteredPromotions =
        activeCategory === "all"
          ? response.promotions ?? []
          : (response.promotions ?? []).filter(
              (promotion) => promotion.commerce.category?.slug === activeCategory,
            );

      setSearchCommerces(filteredCommerces);
      setSearchPromotions(filteredPromotions);
    } catch (loadError) {
      if (searchRequestIdRef.current !== requestId) return;
      setSearchError(formatAuthError(loadError));
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setSearching(false);
      }
    }
  };

  const categoryOptions = useMemo(
    () => [
      { id: "all", label: "Todas" },
      ...categories.map((category) => ({ id: category.slug, label: category.name })),
    ],
    [categories],
  );

  const visibleCommerces = useMemo(() => {
    const sourceCommerces =
      search.trim().length >= 2 && searchCommerces ? searchCommerces : commerces;
    const searchValue = search.trim().toLowerCase();

    return sourceCommerces.filter((commerce) => {
      const isVisible = !commerce.status || commerce.status === "APPROVED";
      const matchesCategory =
        activeCategory === "all" || commerce.category?.slug === activeCategory;
      const matchesSearch =
        !searchValue ||
        commerce.name.toLowerCase().includes(searchValue) ||
        commerce.category?.name.toLowerCase().includes(searchValue) ||
        commerce.address?.toLowerCase().includes(searchValue) ||
        commerce.city?.name.toLowerCase().includes(searchValue);

      return isVisible && matchesCategory && matchesSearch;
    });
  }, [activeCategory, commerces, search, searchCommerces]);

  const visiblePromotions = useMemo(() => {
    const sourcePromotions =
      search.trim().length >= 2 && searchPromotions ? searchPromotions : promotions;
    const searchValue = search.trim().toLowerCase();

    return sourcePromotions.filter((promotion) => {
      const matchesCategory =
        activeCategory === "all" || promotion.commerce.category?.slug === activeCategory;
      const matchesSearch =
        !searchValue ||
        promotion.title.toLowerCase().includes(searchValue) ||
        promotion.commerce.name.toLowerCase().includes(searchValue) ||
        promotion.commerce.category?.name.toLowerCase().includes(searchValue) ||
        promotion.commerce.address?.toLowerCase().includes(searchValue) ||
        promotion.commerce.city?.name.toLowerCase().includes(searchValue);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, promotions, search, searchPromotions]);

  const featuredPromotion = visiblePromotions[0];
  const resultCount = tab === "promotions" ? visiblePromotions.length : visibleCommerces.length;
  const locationMessage =
    location?.source === "city_fallback"
      ? location.fallbackReason === "permission_denied"
        ? "Sin permiso de ubicacion. Te mostramos resultados de la ciudad activa para que puedas seguir explorando."
        : "No pudimos leer tu ubicacion real. Estas viendo resultados cercanos a la ciudad activa."
      : null;

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
            onRefresh={() => void loadExplore("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
      >
        <ExploreHero
          locationLabel={location?.label ?? DEFAULT_CITY_LABEL}
          search={search}
          onSearchChange={setSearch}
          tab={tab}
          onTabChange={setTab}
          searching={searching}
          categoryOptions={categoryOptions}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          promotionsCount={visiblePromotions.length}
        />

        {loading ? (
          <LoadingState label="Cargando explorar..." />
        ) : bootstrapError ? (
          <ErrorState
            title="No pudimos cargar explorar"
            message={bootstrapError}
            onRetry={() => void loadExplore()}
          />
        ) : (
          <>
            <ExploreStatsPanel resultCount={resultCount} tab={tab} />

            {searchError ? <ExploreNotice tone="error" message={searchError} /> : null}
            {locationMessage ? <ExploreNotice tone="info" message={locationMessage} /> : null}

            {featuredPromotion && tab === "promotions" ? (
              <ExploreFeaturedPromotion
                promotion={featuredPromotion}
                onPress={(promotionId) =>
                  navigation.navigate("PromotionDetail", { promotionId })
                }
              />
            ) : null}

            <ExploreResultsSection
              tab={tab}
              resultCount={resultCount}
              promotions={visiblePromotions}
              commerces={visibleCommerces}
              onPromotionPress={(promotionId) =>
                navigation.navigate("PromotionDetail", { promotionId })
              }
              onCommercePress={(commerceId) =>
                navigation.navigate("CommerceDetail", { commerceId })
              }
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 110 },
});
