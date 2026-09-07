import React, { useCallback, useMemo, useState } from "react";
import {
  AppState,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import {
  fetchCategories,
  fetchMyRedemptions,
  fetchNearbyCommerces,
  fetchNearbyPromotions,
} from "../../api/catalog";
import { ApiError } from "../../api/client";
import {
  CategoryGridSection,
  FeaturedPromotionCard,
  HomeFeedFooterSkeleton,
  HomeHeader,
  HomeLocationNotice,
  HomeSkeleton,
  HotPromotionsSection,
  MerchantRegistrationCard,
  NearbyPromotionsSection,
  PromoRailSection,
  RecentActivitySection,
} from "../../components/promy/home/HomeSections";
import { EmptyState, ErrorState } from "../../components/promy/PromyUI";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import type { MainStackParamList } from "../../navigation/types";
import {
  DEFAULT_CITY_LABEL,
  getLocationPermissionSnapshot,
  getPromyLocation,
} from "../../services/location";
import { theme } from "../../styles/theme";
import { ApiCategory, ApiCommerce, ApiRedemption, FeedPromotion } from "../../types/api";
import {
  buildCategoryOptions,
  flattenCommercesToPromotions,
  formatAuthError,
  getPromotionHot,
  getUserFirstName,
  pickFeaturedPromotion,
  sortPromotionsByRelevance,
} from "../../utils/promy";

type HomeState = {
  categories: ApiCategory[];
  commerces: ApiCommerce[];
  promotions: FeedPromotion[];
  redemptions: ApiRedemption[];
  locationLabel: string;
  locationSource: "device" | "city_fallback";
  locationFallbackReason?: "permission_denied" | "device_error" | null;
};

const HOME_STALE_MS = 30000;
const HOME_PAGE_SIZE = 24;

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

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { session, signOut } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();

  const [state, setState] = useState<HomeState>({
    categories: [],
    commerces: [],
    promotions: [],
    redemptions: [],
    locationLabel: DEFAULT_CITY_LABEL,
    locationSource: "city_fallback",
    locationFallbackReason: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [hasMorePromotions, setHasMorePromotions] = useState(true);
  const [hasMoreCommerces, setHasMoreCommerces] = useState(true);
  const lastLoadedAtRef = React.useRef(0);
  const locationPromptShownRef = React.useRef(false);
  const endReachedLockedRef = React.useRef(true);
  const locationSnapshotRef = React.useRef<Awaited<ReturnType<typeof getPromyLocation>> | null>(
    null,
  );

  const maybeExplainLocationPermission = async () => {
    if (locationPromptShownRef.current) return;

    const permission = await getLocationPermissionSnapshot().catch(() => null);
    if (!permission || permission.status === "granted" || permission.canAskAgain === false) {
      return;
    }

    locationPromptShownRef.current = true;
    await new Promise<void>((resolve) => {
      Alert.alert(
        "Activa tu ubicacion si quieres ver lo mas cercano",
        "PROMY puede funcionar igual con la ciudad activa, pero con tu ubicacion el orden de promos y comercios queda mucho mejor.",
        [
          { text: "Ahora no", style: "cancel", onPress: () => resolve() },
          { text: "Continuar", onPress: () => resolve() },
        ],
        { cancelable: true, onDismiss: () => resolve() },
      );
    });
  };

  const loadHome = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      if (mode === "initial") {
        await maybeExplainLocationPermission();
      }

      const location = await getPromyLocation();
      const [categoriesResponse, commercesResponse, promotionsResponse] = await Promise.all([
        fetchCategories(),
        fetchNearbyCommerces({
          latitude: location.latitude,
          longitude: location.longitude,
          fallbackCitySlug: location.citySlug,
          radiusKm: 8,
          limit: HOME_PAGE_SIZE,
          page: 1,
        }),
        fetchNearbyPromotions({
          latitude: location.latitude,
          longitude: location.longitude,
          fallbackCitySlug: location.citySlug,
          radiusKm: 8,
          limit: HOME_PAGE_SIZE,
          page: 1,
        }),
      ]);

      let redemptionsResponse = { ok: true, redemptions: [] as ApiRedemption[] };
      if (session?.accessToken) {
        try {
          const [nextRedemptionsResponse] = await Promise.all([
            fetchMyRedemptions(session.accessToken),
            refreshNotifications({ silent: true }),
          ]);
          redemptionsResponse = nextRedemptionsResponse;
        } catch (loadError) {
          if (loadError instanceof ApiError && loadError.status === 401) {
            await signOut({ reason: "Tu sesion vencio. Volve a ingresar para seguir usando PROMY." });
            return;
          }
          throw loadError;
        }
      }

      setState({
        categories: categoriesResponse.categories ?? [],
        commerces: commercesResponse.commerces ?? [],
        promotions: promotionsResponse.promotions ?? [],
        redemptions: redemptionsResponse.redemptions ?? [],
        locationLabel: location.label,
        locationSource: location.source,
        locationFallbackReason: location.fallbackReason ?? null,
      });
      locationSnapshotRef.current = location;
      setCatalogPage(1);
      setHasMoreCommerces(commercesResponse.hasMore);
      setHasMorePromotions(promotionsResponse.hasMore);
      lastLoadedAtRef.current = Date.now();
    } catch (loadError) {
      setError(formatAuthError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreHome = async () => {
    if (
      loading ||
      refreshing ||
      loadingMore ||
      endReachedLockedRef.current ||
      promotions.length < HOME_PAGE_SIZE ||
      (!hasMorePromotions && !hasMoreCommerces) ||
      !locationSnapshotRef.current
    ) {
      return;
    }

    try {
      setLoadingMore(true);
      const nextPage = catalogPage + 1;
      const location = locationSnapshotRef.current;

      const [commercesResponse, promotionsResponse] = await Promise.all([
        hasMoreCommerces
          ? fetchNearbyCommerces({
              latitude: location.latitude,
              longitude: location.longitude,
              fallbackCitySlug: location.citySlug,
              radiusKm: 8,
              limit: HOME_PAGE_SIZE,
              page: nextPage,
            })
          : Promise.resolve(null),
        hasMorePromotions
          ? fetchNearbyPromotions({
              latitude: location.latitude,
              longitude: location.longitude,
              fallbackCitySlug: location.citySlug,
              radiusKm: 8,
              limit: HOME_PAGE_SIZE,
              page: nextPage,
            })
          : Promise.resolve(null),
      ]);

      setState((current) => ({
        ...current,
        commerces: commercesResponse
          ? mergeById(current.commerces, commercesResponse.commerces ?? [])
          : current.commerces,
        promotions: promotionsResponse
          ? mergeById(current.promotions, promotionsResponse.promotions ?? [])
          : current.promotions,
      }));

      setCatalogPage(nextPage);
      setHasMoreCommerces(commercesResponse?.hasMore ?? false);
      setHasMorePromotions(promotionsResponse?.hasMore ?? false);
    } catch {
      // No bloqueamos el home por un fallo puntual de paginacion incremental.
    } finally {
      endReachedLockedRef.current = true;
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const isStale = Date.now() - lastLoadedAtRef.current > HOME_STALE_MS;
      if (loading || lastLoadedAtRef.current === 0) {
        void loadHome("initial");
        return;
      }

      if (isStale) {
        void loadHome("refresh");
      }
    }, [loading, refreshNotifications, session?.accessToken]),
  );

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      if (Date.now() - lastLoadedAtRef.current <= HOME_STALE_MS) return;
      void loadHome("refresh");
    });

    return () => subscription.remove();
  }, [refreshNotifications, session?.accessToken]);

  const promotions = useMemo(
    () =>
      sortPromotionsByRelevance(
        state.promotions.length ? state.promotions : flattenCommercesToPromotions(state.commerces),
      ),
    [state.commerces, state.promotions],
  );

  const featuredPromotion = useMemo(() => pickFeaturedPromotion(promotions), [promotions]);

  const hotPromotions = useMemo(() => {
    const hot = promotions.filter((promotion) => getPromotionHot(promotion));
    if (hot.length >= 4) return hot.slice(0, 6);
    const rest = promotions.filter((promotion) => !hot.includes(promotion));
    return [...hot, ...rest].slice(0, 6);
  }, [promotions]);

  const nearPromotions = useMemo(
    () => promotions.filter((promotion) => promotion.distanceKm != null).slice(0, 3),
    [promotions],
  );

  const expiringPromotions = useMemo(() => {
    const withExpiration = promotions.filter((promotion) => promotion.endDate || promotion.endTime);
    return (withExpiration.length ? withExpiration : promotions).slice(0, 6);
  }, [promotions]);

  const newPromotions = useMemo(() => promotions.slice(0, 6), [promotions]);
  const categories = useMemo(() => buildCategoryOptions(state.categories).slice(0, 8), [state.categories]);
  const recentRedemptions = state.redemptions.slice(0, 3);
  const firstName = getUserFirstName(session?.user.fullName);

  const locationMessage =
    state.locationSource === "city_fallback"
      ? state.locationFallbackReason === "permission_denied"
        ? "No activaste tu ubicacion. Por ahora te mostramos Concordia para que puedas seguir explorando promos reales."
        : "No pudimos leer tu ubicacion en este momento. Mientras tanto te mostramos Concordia como zona activa."
      : null;
  const locationCaption =
    state.locationSource === "device" ? "Tu ubicacion" : "Mostrando";

  const openExplore = () => navigation.navigate("Tabs", { screen: "Explorar" });
  const openMap = () => navigation.navigate("Tabs", { screen: "Mapa" });
  const openProfile = () => navigation.navigate("Tabs", { screen: "Perfil" });
  const openRedemptions = () => navigation.navigate("Redemptions");
  const openNotifications = () => navigation.navigate("Notifications");
  const openPromotion = (promotionId: number) =>
    navigation.navigate("PromotionDetail", { promotionId });

  const openCommerceRegistrationNotice = () => {
    Alert.alert(
      "Registro de comercios",
      "El alta de comercios se hace desde el panel web de PROMY. Para sumarte, entra al panel desde una computadora y usa la opcion de registro.",
    );
  };

  const handleActivityAction = recentRedemptions.length > 0 ? openRedemptions : openProfile;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />

      <FlatList
        style={styles.container}
        data={["home-feed"]}
        keyExtractor={(item) => item}
        renderItem={() => null}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.45}
        onEndReached={() => void loadMoreHome()}
        onMomentumScrollBegin={() => {
          endReachedLockedRef.current = false;
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadHome("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
        ListHeaderComponent={
          <>
            <HomeHeader
              locationCaption={locationCaption}
              locationLabel={state.locationLabel}
              unreadCount={unreadCount}
              firstName={firstName}
              promotionsCount={promotions.length}
              onNotificationsPress={openNotifications}
              onSearchPress={openExplore}
            />

            {loading ? (
              <HomeSkeleton />
            ) : error ? (
              <ErrorState
                title="No pudimos cargar el inicio"
                message={error}
                onRetry={() => void loadHome()}
              />
            ) : promotions.length === 0 && state.commerces.length === 0 ? (
              <EmptyState
                title="Todavia no encontramos promos activas"
                message="Abri el mapa de Concordia, cambia de rubro o volve a intentar despues de actualizar el catalogo."
                actionLabel="Ir al mapa"
                onAction={openMap}
                icon={<Feather name="map-pin" size={22} color={theme.colors.accentRed} />}
              />
            ) : (
              <>
                {locationMessage ? (
                  <HomeLocationNotice
                    fallbackReason={state.locationFallbackReason}
                    message={locationMessage}
                  />
                ) : null}

                {featuredPromotion ? (
                  <FeaturedPromotionCard
                    promotion={featuredPromotion}
                    locationLabel={state.locationLabel}
                    onPress={openPromotion}
                  />
                ) : null}

                {nearPromotions.length > 0 ? (
                  <NearbyPromotionsSection
                    promotions={nearPromotions}
                    onAction={openMap}
                    onPromotionPress={openPromotion}
                  />
                ) : null}

                {categories.length > 0 ? (
                  <CategoryGridSection categories={categories} onAction={openExplore} />
                ) : null}

                {hotPromotions.length > 0 ? (
                  <HotPromotionsSection
                    promotions={hotPromotions}
                    onAction={openExplore}
                    onPromotionPress={openPromotion}
                  />
                ) : null}

                <PromoRailSection
                  title="Terminan pronto"
                  badgeLabel="Hoy"
                  badgeIcon="clock"
                  promotions={expiringPromotions}
                  onAction={openExplore}
                  onPromotionPress={openPromotion}
                />

                <PromoRailSection
                  title="Nuevas en PROMY"
                  badgeLabel="Nueva"
                  badgeIcon="star"
                  promotions={newPromotions}
                  onAction={openExplore}
                  onPromotionPress={openPromotion}
                />

                <RecentActivitySection
                  redemptions={recentRedemptions}
                  onPromotionPress={openPromotion}
                  onAction={handleActivityAction}
                />

                <MerchantRegistrationCard onPress={openCommerceRegistrationNotice} />
              </>
            )}
          </>
        }
        ListFooterComponent={
          <View style={styles.footerWrap}>
            {!loading && !error && loadingMore ? <HomeFeedFooterSkeleton /> : null}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 110 },
  footerWrap: {
    minHeight: 24,
  },
});
