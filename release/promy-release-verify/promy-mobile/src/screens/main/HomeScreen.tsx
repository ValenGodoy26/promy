import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
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
  HomeSkeleton,
  HomeHeader,
  HomeLocationNotice,
  HotPromotionsSection,
  MerchantRegistrationCard,
  NearbyPromotionsSection,
  RecentActivitySection,
} from "../../components/promy/home/HomeSections";
import { EmptyState, ErrorState } from "../../components/promy/PromyUI";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import type { MainStackParamList } from "../../navigation/types";
import { DEFAULT_CITY_LABEL, getPromyLocation } from "../../services/location";
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
  const [error, setError] = useState<string | null>(null);

  const loadHome = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      const location = await getPromyLocation();
      const [categoriesResponse, commercesResponse, promotionsResponse] = await Promise.all([
        fetchCategories(),
        fetchNearbyCommerces({
          latitude: location.latitude,
          longitude: location.longitude,
          fallbackCitySlug: location.citySlug,
          radiusKm: 8,
          limit: 24,
        }),
        fetchNearbyPromotions({
          latitude: location.latitude,
          longitude: location.longitude,
          fallbackCitySlug: location.citySlug,
          radiusKm: 8,
          limit: 24,
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
            await signOut({ reason: "Tu sesión venció. Volvé a ingresar para seguir usando PROMY." });
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
    } catch (loadError) {
      setError(formatAuthError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [refreshNotifications, session?.accessToken]),
  );

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

  const categories = useMemo(() => buildCategoryOptions(state.categories).slice(0, 8), [state.categories]);
  const recentRedemptions = state.redemptions.slice(0, 3);
  const firstName = getUserFirstName(session?.user.fullName);

  const locationMessage =
    state.locationSource === "city_fallback"
      ? state.locationFallbackReason === "permission_denied"
        ? "No nos diste permiso para usar tu ubicacion. Te mostramos resultados de la ciudad activa para que la app siga funcionando."
        : "No pudimos leer tu ubicacion real ahora. Te mostramos resultados de la ciudad activa como respaldo."
      : null;

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

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadHome("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
      >
        <HomeHeader
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
            title="Todavia no hay promos para mostrar"
            message="Cuando PROMY tenga beneficios activos cerca tuyo, van a aparecer aca. Mientras tanto podes explorar el mapa o volver a intentar en unos minutos."
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

            {hotPromotions.length > 0 ? (
              <HotPromotionsSection
                promotions={hotPromotions}
                onAction={openExplore}
                onPromotionPress={openPromotion}
              />
            ) : null}

            {categories.length > 0 ? (
              <CategoryGridSection categories={categories} onAction={openExplore} />
            ) : null}

            {nearPromotions.length > 0 ? (
              <NearbyPromotionsSection
                promotions={nearPromotions}
                onAction={openMap}
                onPromotionPress={openPromotion}
              />
            ) : null}

            <MerchantRegistrationCard onPress={openCommerceRegistrationNotice} />

            <RecentActivitySection
              redemptions={recentRedemptions}
              onPromotionPress={openPromotion}
              onAction={handleActivityAction}
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
