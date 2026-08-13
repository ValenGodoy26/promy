import React, { useMemo, useState } from "react";
import {
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { fetchCommercePromotions } from "../../api/commerce";
import {
  BadgePill,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  ScreenHeader,
  Segmented,
} from "../../components/promy/PromyUI";
import type { CommerceStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import type { CommerceManagedPromotion } from "../../types/api";
import {
  formatAuthError,
  getPromotionBadgeLabel,
  getPromotionCapSummary,
  getPromotionHot,
  getPromotionScheduleSummaryV3,
} from "../../utils/promy";

type PromotionFilter = "all" | "visible" | "review" | "draft" | "incidents";
const PROMOTIONS_STALE_MS = 30000;

export default function CommercePromotionsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<CommerceStackParamList>>();
  const [promotions, setPromotions] = useState<CommerceManagedPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PromotionFilter>("all");
  const lastLoadedAtRef = React.useRef(0);

  const loadPromotions = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const response = await fetchCommercePromotions();
      setPromotions(response.promotions ?? []);
      lastLoadedAtRef.current = Date.now();
    } catch (loadError) {
      setError(formatAuthError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const isStale = Date.now() - lastLoadedAtRef.current > PROMOTIONS_STALE_MS;
      if (loading || lastLoadedAtRef.current === 0) {
        void loadPromotions("initial");
        return undefined;
      }

      if (isStale) {
        void loadPromotions("refresh");
      }

      return undefined;
    }, [loading]),
  );

  const visibleCount = promotions.filter((item) => item.status === "APPROVED_VISIBLE").length;
  const reviewCount = promotions.filter((item) => item.status === "PENDING_REVIEW").length;
  const draftCount = promotions.filter((item) => item.status === "DRAFT").length;
  const incidentsCount = promotions.filter(
    (item) => item.status === "REJECTED" || item.status === "EXPIRED",
  ).length;
  const visiblePromotions = useMemo(() => {
    if (filter === "visible") return promotions.filter((item) => item.status === "APPROVED_VISIBLE");
    if (filter === "review") return promotions.filter((item) => item.status === "PENDING_REVIEW");
    if (filter === "draft") return promotions.filter((item) => item.status === "DRAFT");
    if (filter === "incidents") {
      return promotions.filter((item) => item.status === "REJECTED" || item.status === "EXPIRED");
    }
    return promotions;
  }, [filter, promotions]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />
      <ScreenHeader
        title="Promociones"
        onBack={() => navigation.goBack()}
        rightIcon="plus"
        onRightPress={() => navigation.navigate("CommercePromotionEditor", {})}
      />

      <FlashList
        data={loading || error ? [] : visiblePromotions}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyExtractor={(promotion) => String(promotion.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadPromotions("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryTitle}>{promotions.length}</Text>
                <Text style={styles.summaryText}>promociones del comercio</Text>
              </View>
              <PrimaryButton
                label="Nueva promo"
                onPress={() => navigation.navigate("CommercePromotionEditor", {})}
              />
            </View>

            <Segmented<PromotionFilter>
              active={filter}
              onChange={setFilter}
              options={[
                { id: "all", label: "Todas", count: promotions.length },
                { id: "visible", label: "Visibles", count: visibleCount },
                { id: "review", label: "Revision", count: reviewCount },
                { id: "draft", label: "Borrador", count: draftCount },
                { id: "incidents", label: "Observadas", count: incidentsCount },
              ]}
            />
          </>
        }
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Cargando promociones..." />
          ) : error ? (
            <ErrorState
              title="No pudimos cargar promociones"
              message={error}
              onRetry={() => void loadPromotions()}
            />
          ) : (
            <EmptyState
              title="No encontramos promociones"
              message="Crea tu primera promo para empezar a operar desde el panel del comercio."
              actionLabel="Crear promocion"
              onAction={() => navigation.navigate("CommercePromotionEditor", {})}
            />
          )
        }
        renderItem={({ item: promotion }) => (
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.card}
            onPress={() =>
              navigation.navigate("CommercePromotionEditor", {
                promotionId: promotion.id,
              })
            }
          >
            <View style={styles.cardTopRow}>
              <BadgePill label={getPromotionBadgeLabel(promotion)} variant="red" size="sm" />
              <View style={styles.cardTopRight}>
                {getPromotionHot(promotion) ? (
                  <BadgePill label="HOT" variant="yellow" size="sm" />
                ) : null}
                <BadgePill
                  label={promotion.status || "DRAFT"}
                  variant={promotion.status === "APPROVED_VISIBLE" ? "yellow" : "ghost"}
                  size="sm"
                />
              </View>
            </View>

            <Text style={styles.cardTitle}>{promotion.title}</Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {promotion.description}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaGroup}>
                <View style={styles.metaPill}>
                  <Feather name="clock" size={12} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{getPromotionScheduleSummaryV3(promotion)}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Feather name="hash" size={12} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{getPromotionCapSummary(promotion)}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 34 },
  summaryCard: {
    margin: 16,
    borderRadius: 22,
    backgroundColor: theme.colors.headerDark,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  card: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  cardTopRight: {
    flexDirection: "row",
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metaGroup: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
});
