import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { fetchMyRedemptions } from "../../api/catalog";
import { ApiError } from "../../api/client";
import { EmptyState, ErrorState, LoadingState } from "../../components/promy/PromyUI";
import {
  ProfileActivitySummary,
  ProfileFooter,
  ProfileHeader,
  ProfileLogoutButton,
  ProfileMiniStats,
  ProfileQuickActions,
  ProfileRecentActivity,
  ProfileSectionHeader,
  ProfileSettingsCard,
} from "../../components/promy/profile/ProfileSections";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import type { MainStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import { ApiRedemption } from "../../types/api";
import { formatAuthError } from "../../utils/promy";

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { session, signOut } = useAuth();
  const { favoritePromotions, favoriteCommerces } = useFavorites();

  const [redemptions, setRedemptions] = useState<ApiRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async (mode: "initial" | "refresh" = "initial") => {
    if (!session?.accessToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);

      const response = await fetchMyRedemptions(session.accessToken);
      setRedemptions(response.redemptions ?? []);
    } catch (profileError) {
      if (profileError instanceof ApiError && profileError.status === 401) {
        await signOut({ reason: "Tu sesión venció. Volvé a ingresar para seguir usando PROMY." });
        return;
      }
      setError(formatAuthError(profileError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [session?.accessToken]);

  const successRedemptions = useMemo(
    () => redemptions.filter((redemption) => redemption.status === "SUCCESS"),
    [redemptions],
  );
  const favoritesCount = favoritePromotions.length + favoriteCommerces.length;
  const monthlyCount = useMemo(() => {
    const now = new Date();
    return successRedemptions.filter((redemption) => {
      const date = new Date(redemption.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
  }, [successRedemptions]);

  const user = session?.user;
  const currentPeriodLabel = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date());
  const lastRedemptionDate =
    successRedemptions.length > 0
      ? new Date(successRedemptions[0].createdAt).toLocaleDateString("es-AR")
      : null;

  const openFavorites = () => navigation.navigate("Favorites");
  const openRedemptions = () => navigation.navigate("Redemptions");
  const openExplore = () => navigation.navigate("Tabs", { screen: "Explorar" });
  const openMap = () => navigation.navigate("Tabs", { screen: "Mapa" });
  const openPromotion = (promotionId: number) =>
    navigation.navigate("PromotionDetail", { promotionId });
  const openTerms = () => navigation.navigate("Legal", { kind: "terms" });
  const openPrivacy = () => navigation.navigate("Legal", { kind: "privacy" });

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
            onRefresh={() => void loadProfile("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
      >
        <ProfileHeader
          user={user}
          onFavoritesPress={openFavorites}
          onRedemptionsPress={openRedemptions}
        />

        <ProfileActivitySummary
          successCount={successRedemptions.length}
          currentPeriodLabel={currentPeriodLabel}
          monthlyCount={monthlyCount}
          favoritesCount={favoritesCount}
          lastRedemptionDate={lastRedemptionDate}
          onViewDetail={openRedemptions}
        />

        <ProfileMiniStats
          monthlyCount={monthlyCount}
          favoritesCount={favoritesCount}
          successCount={successRedemptions.length}
        />

        {loading ? (
          <LoadingState label="Cargando tu perfil..." />
        ) : error ? (
          <ErrorState
            title="No pudimos cargar tu perfil"
            message={error}
            onRetry={() => void loadProfile()}
          />
        ) : (
          <>
            <ProfileSectionHeader title="Accesos rápidos" />
            <ProfileQuickActions
              monthlyCount={monthlyCount}
              favoritesCount={favoritesCount}
              successCount={successRedemptions.length}
              onRedemptionsPress={openRedemptions}
              onFavoritesPress={openFavorites}
              onExplorePress={openExplore}
              onMapPress={openMap}
            />

            <ProfileSectionHeader
              title="Actividad reciente"
              actionLabel="Ver todo"
              onAction={openRedemptions}
            />

            {successRedemptions.length > 0 ? (
              <ProfileRecentActivity
                redemptions={successRedemptions}
                onPromotionPress={openPromotion}
              />
            ) : (
              <EmptyState
                title="Todavia no tenes canjes"
                message="Cuando uses tu primera promo, la vas a ver reflejada aca junto a tu actividad reciente."
                actionLabel="Descubrir promos"
                onAction={openExplore}
                icon={
                  <MaterialCommunityIcons
                    name="ticket-percent-outline"
                    size={22}
                    color={theme.colors.accentRed}
                  />
                }
              />
            )}

            <ProfileSectionHeader title="Configuración" />
            <ProfileSettingsCard onTermsPress={openTerms} onPrivacyPress={openPrivacy} />

            <ProfileLogoutButton onPress={() => void signOut()} />
            <ProfileFooter />
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
