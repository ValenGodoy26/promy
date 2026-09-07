import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FlatList,
  RefreshControl,
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
import { BottomSafeSpacer, ErrorState } from "../../components/promy/PromyUI";
import {
  ExploreCommerceCard,
  ExploreEmptyResults,
  ExploreFeaturedPromotion,
  ExploreHero,
  ExploreListFooterSkeleton,
  ExploreNotice,
  ExploreResultsHeader,
  ExploreSkeleton,
  ExploreStatsPanel,
  ExplorePromoCard,
  type ExploreTab,
} from "../../components/promy/explore/ExploreSections";
import { useAuth } from "../../context/AuthContext";
import type { MainStackParamList } from "../../navigation/types";
import {
  DEFAULT_CITY_LABEL,
  getPromyLocation,
  type LocationSnapshot,
} from "../../services/location";
import { theme } from "../../styles/theme";
import { ApiCategory, ApiCommerce, FeedPromotion } from "../../types/api";
import { formatAuthError } from "../../utils/promy";

const EXPLORE_PAGE_SIZE = 24;
const RECENT_SEARCHES_LIMIT = 6;

function getRecentSearchesStorageKey(userId?: number) {
  return userId ? `@promy_recent_searches_${userId}` : "@promy_recent_searches_guest";
}

function mergeById<T extends { id: number }>(current: T[], incoming: T[]) {
  const map = new Map<number, T>();

  for (const item of current) {
    map.set(item.id, item);
  }

  for (const item of incoming) {
    map.set(item.id, item);
  }

  return Array.from(map.values());
}

export default function CommercesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { session } = useAuth();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [commerces, setCommerces] = useState<ApiCommerce[]>([]);
  const [promotions, setPromotions] = useState<FeedPromotion[]>([]);
  const [location, setLocation] = useState<LocationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tab, setTab] = useState<ExploreTab>("promotions");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchCommerces, setSearchCommerces] = useState<ApiCommerce[] | null>(null);
  const [searchPromotions, setSearchPromotions] = useState<FeedPromotion[] | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [promotionsPage, setPromotionsPage] = useState(1);
  const [commercesPage, setCommercesPage] = useState(1);
  const [hasMorePromotions, setHasMorePromotions] = useState(true);
  const [hasMoreCommerces, setHasMoreCommerces] = useState(true);
  const searchRequestIdRef = useRef(0);
  const endReachedLockedRef = useRef(true);

  const loadBrowsePage = async (page = 1) => {
    if (!location) return;

    const [commercesResponse, promotionsResponse] = await Promise.all([
      fetchNearbyCommerces({
        latitude: location.latitude,
        longitude: location.longitude,
        fallbackCitySlug: location.citySlug,
        radiusKm: 8,
        limit: EXPLORE_PAGE_SIZE,
        page,
        categorySlug: activeCategory === "all" ? undefined : activeCategory,
      }),
      fetchNearbyPromotions({
        latitude: location.latitude,
        longitude: location.longitude,
        fallbackCitySlug: location.citySlug,
        radiusKm: 8,
        limit: EXPLORE_PAGE_SIZE,
        page,
        categorySlug: activeCategory === "all" ? undefined : activeCategory,
      }),
    ]);

    if (page === 1) {
      setCommerces(commercesResponse.commerces ?? []);
      setPromotions(promotionsResponse.promotions ?? []);
    } else {
      setCommerces((current) => mergeById(current, commercesResponse.commerces ?? []));
      setPromotions((current) => mergeById(current, promotionsResponse.promotions ?? []));
    }

    setCommercesPage(page);
    setPromotionsPage(page);
    setHasMoreCommerces(commercesResponse.hasMore);
    setHasMorePromotions(promotionsResponse.hasMore);
  };

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
          limit: EXPLORE_PAGE_SIZE,
          page: 1,
        }),
        fetchNearbyPromotions({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          fallbackCitySlug: currentLocation.citySlug,
          radiusKm: 8,
          limit: EXPLORE_PAGE_SIZE,
          page: 1,
        }),
      ]);

      setCategories(categoriesResponse.categories ?? []);
      setCommerces(commercesResponse.commerces ?? []);
      setPromotions(promotionsResponse.promotions ?? []);
      setLocation(currentLocation);
      setSearchCommerces(null);
      setSearchPromotions(null);
      setSearchError(null);
      setPromotionsPage(1);
      setCommercesPage(1);
      setHasMorePromotions(promotionsResponse.hasMore);
      setHasMoreCommerces(commercesResponse.hasMore);
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
    const storageKey = getRecentSearchesStorageKey(session?.user.id);

    void AsyncStorage.getItem(storageKey)
      .then((rawValue) => {
        if (!rawValue) {
          setRecentSearches([]);
          return;
        }

        const parsed = JSON.parse(rawValue) as unknown;
        if (!Array.isArray(parsed)) {
          setRecentSearches([]);
          return;
        }

        setRecentSearches(
          parsed
            .filter((item): item is string => typeof item === "string" && item.trim().length >= 2)
            .slice(0, RECENT_SEARCHES_LIMIT),
        );
      })
      .catch(() => setRecentSearches([]));
  }, [session?.user.id]);

  useEffect(() => {
    if (!location || loading || search.trim().length >= 2) return;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          setLoadingMore(true);
          await loadBrowsePage(1);
        } finally {
          setLoadingMore(false);
        }
      })();
    }, 100);

    return () => clearTimeout(timer);
  }, [activeCategory, location, loading, search]);

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
      void persistRecentSearch(value);
    } catch (loadError) {
      if (searchRequestIdRef.current !== requestId) return;
      setSearchError(formatAuthError(loadError));
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setSearching(false);
      }
    }
  };

  const persistRecentSearch = async (value: string) => {
    const normalized = value.trim();

    if (normalized.length < 2) {
      return;
    }

    const next = [
      normalized,
      ...recentSearches.filter(
        (item) => item.toLowerCase() !== normalized.toLowerCase(),
      ),
    ].slice(0, RECENT_SEARCHES_LIMIT);

    setRecentSearches(next);
    await AsyncStorage.setItem(
      getRecentSearchesStorageKey(session?.user.id),
      JSON.stringify(next),
    ).catch(() => undefined);
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(getRecentSearchesStorageKey(session?.user.id)).catch(
      () => undefined,
    );
  };

  const loadMoreBrowseResults = async () => {
    if (
      loading ||
      refreshing ||
      loadingMore ||
      endReachedLockedRef.current ||
      !location ||
      search.trim().length >= 2 ||
      listData.length < EXPLORE_PAGE_SIZE
    ) {
      return;
    }

    const shouldLoadPromotions = tab === "promotions" && hasMorePromotions;
    const shouldLoadCommerces = tab === "commerces" && hasMoreCommerces;

    if (!shouldLoadPromotions && !shouldLoadCommerces) {
      return;
    }

    try {
      setLoadingMore(true);

      if (shouldLoadPromotions) {
        await loadBrowsePage(promotionsPage + 1);
        return;
      }

      await loadBrowsePage(commercesPage + 1);
    } catch {
      // No rompemos explorar por un fallo puntual de pagina siguiente.
    } finally {
      endReachedLockedRef.current = true;
      setLoadingMore(false);
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
        ? "No activaste tu ubicacion. Te mostramos Concordia para que sigas explorando locales y promos reales."
        : "No pudimos leer tu ubicacion real. Por ahora estas viendo Concordia como zona activa."
      : null;

  const listData = (tab === "promotions" ? visiblePromotions : visibleCommerces) as Array<
    FeedPromotion | ApiCommerce
  >;
  const hasMoreActive = search.trim().length >= 2 ? false : tab === "promotions" ? hasMorePromotions : hasMoreCommerces;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />

      <FlatList<FeedPromotion | ApiCommerce>
        style={styles.container}
        data={listData}
        keyExtractor={(item) => `${tab}-${item.id}`}
        renderItem={({ item }) =>
          tab === "promotions" ? (
            <ExplorePromoCard
              promotion={item as unknown as FeedPromotion}
              onPress={() =>
                navigation.navigate("PromotionDetail", {
                  promotionId: (item as unknown as FeedPromotion).id,
                })
              }
            />
          ) : (
            <ExploreCommerceCard
              commerce={item as unknown as ApiCommerce}
              onPress={() =>
                navigation.navigate("CommerceDetail", {
                  commerceId: (item as unknown as ApiCommerce).id,
                })
              }
            />
          )
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={() => void loadMoreBrowseResults()}
        onMomentumScrollBegin={() => {
          endReachedLockedRef.current = false;
        }}
        ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadExplore("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
        ListHeaderComponent={
          <>
            <ExploreHero
              locationLabel={location?.label ?? DEFAULT_CITY_LABEL}
              search={search}
              onSearchChange={setSearch}
              recentSearches={recentSearches}
              onRecentSearchPress={setSearch}
              onClearRecentSearches={() => void clearRecentSearches()}
              tab={tab}
              onTabChange={setTab}
              searching={searching}
              categoryOptions={categoryOptions}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              promotionsCount={visiblePromotions.length}
            />

            {loading ? (
              <ExploreSkeleton />
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
                <ExploreResultsHeader
                  title={tab === "promotions" ? "Promos para descubrir" : "Locales cercanos"}
                  actionLabel={`${resultCount} items`}
                />
              </>
            )}
          </>
        }
        ListEmptyComponent={
          !loading && !bootstrapError ? (
            <>
              <ExploreEmptyResults />
              <BottomSafeSpacer />
            </>
          ) : null
        }
        ListFooterComponent={
          loading || bootstrapError ? null : (
            <>
              {loadingMore && hasMoreActive ? <ExploreListFooterSkeleton tab={tab} /> : null}
              <BottomSafeSpacer />
            </>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 8 },
  listSeparator: { height: 14 },
});
