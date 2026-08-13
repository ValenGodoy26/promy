import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchCommerceDashboard } from "../../api/commerce";
import {
  BadgePill,
  ErrorState,
  LoadingState,
  SectionHeader,
} from "../../components/promy/PromyUI";
import PromoLogo from "../../components/promy/PromoLogo";
import { useAuth } from "../../context/AuthContext";
import type { CommerceStackParamList } from "../../navigation/types";
import { DEFAULT_CITY_LABEL } from "../../services/location";
import { theme } from "../../styles/theme";
import type {
  CommerceDashboard,
  CommerceDashboardPromotion,
  CommerceDashboardRedemption,
} from "../../types/api";
import { formatAuthError, getPromotionBadgeLabel } from "../../utils/promy";

export default function CommerceDashboardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<CommerceStackParamList>>();
  const { session, signOut } = useAuth();
  const [dashboard, setDashboard] = useState<CommerceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const response = await fetchCommerceDashboard();
      setDashboard(response.dashboard);
    } catch (loadError) {
      setError(formatAuthError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const primaryCommerce = dashboard?.commerces?.[0] ?? null;
  const totalPromotions = dashboard?.metrics.promotions.total ?? 0;
  const totalRedemptions = dashboard?.metrics.redemptions.total ?? 0;
  const totalVisiblePromotions = dashboard?.metrics.promotions.approvedVisible ?? 0;
  const conversionRate = useMemo(() => {
    if (!dashboard) return 0;
    const total = dashboard.metrics.redemptions.total;
    if (!total) return 0;
    return Math.round((dashboard.metrics.redemptions.success / total) * 100);
  }, [dashboard]);

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
            onRefresh={() => void loadDashboard("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
      >
        <SafeAreaView edges={["top"]} style={styles.hero}>
          <View style={styles.heroGlowYellow} />
          <View style={styles.heroGlowRed} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroBrand}>
              <PromoLogo size="sm" />
              <Text style={styles.heroRole}>Panel comercio</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.heroIconButton}
              onPress={() => void signOut()}
            >
              <Feather name="log-out" size={17} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>
            {primaryCommerce?.name || session?.user.fullName || "Tu comercio"}
          </Text>
          <Text style={styles.heroSubtitle}>
            {primaryCommerce?.city?.name || DEFAULT_CITY_LABEL},{" "}
            {primaryCommerce?.category?.name || "Negocio"} con datos reales
          </Text>

          <View style={styles.heroMetricsRow}>
            <HeroMetric label="Promos" value={totalPromotions} />
            <HeroMetric label="Visibles" value={totalVisiblePromotions} />
            <HeroMetric label="Canjes" value={totalRedemptions} />
          </View>
        </SafeAreaView>

        {loading ? (
          <LoadingState label="Cargando panel del comercio..." />
        ) : error ? (
          <ErrorState
            title="No pudimos cargar el panel"
            message={error}
            onRetry={() => void loadDashboard()}
          />
        ) : dashboard ? (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTopRow}>
                <BadgePill label="Resumen del negocio" variant="yellow" />
                <Text style={styles.summaryTopText}>Actualizado ahora</Text>
              </View>

              <Text style={styles.summaryValue}>{conversionRate}%</Text>
              <Text style={styles.summaryLabel}>tasa de canjes exitosos</Text>

              <View style={styles.summaryFooter}>
                <SummaryStat
                  label="Aprobados"
                  value={dashboard.metrics.commerces.approved}
                />
                <SummaryStat
                  label="Pendientes"
                  value={dashboard.metrics.commerces.pending}
                />
                <SummaryStat
                  label="Fallidos"
                  value={dashboard.metrics.redemptions.failed}
                />
              </View>
            </View>

            <SectionHeader title="Acciones rapidas" />
            <View style={styles.quickGrid}>
              <QuickActionCard
                title="Mi comercio"
                subtitle="Edita datos y estado visible"
                icon="briefcase"
                onPress={() => navigation.navigate("CommerceProfile")}
              />
              <QuickActionCard
                title="Promociones"
                subtitle="Administra tus promos"
                icon="tag"
                highlight
                onPress={() => navigation.navigate("CommercePromotions")}
              />
              <QuickActionCard
                title="Nueva promo"
                subtitle="Crear beneficio ahora"
                icon="plus-circle"
                onPress={() =>
                  navigation.navigate("CommercePromotionEditor", {})
                }
              />
              <QuickActionCard
                title="Canjes"
                subtitle="Ver actividad reciente"
                icon="check-square"
                onPress={() => navigation.navigate("CommerceRedemptions")}
              />
            </View>

            <SectionHeader
              title="Promociones recientes"
              actionLabel="Ver todas"
              onAction={() => navigation.navigate("CommercePromotions")}
            />
            <View style={styles.sectionList}>
              {dashboard.recentPromotions.length ? (
                dashboard.recentPromotions.map((promotion) => (
                  <RecentPromotionCard
                    key={promotion.id}
                    item={promotion}
                    onPress={() =>
                      navigation.navigate("CommercePromotionEditor", {
                        promotionId: promotion.id,
                      })
                    }
                  />
                ))
              ) : (
                <EmptyMiniCard text="Todavia no tenes promociones creadas." />
              )}
            </View>

            <SectionHeader
              title="Canjes recientes"
              actionLabel="Ver todos"
              onAction={() => navigation.navigate("CommerceRedemptions")}
            />
            <View style={styles.sectionList}>
              {dashboard.recentRedemptions.length ? (
                dashboard.recentRedemptions.map((redemption) => (
                  <RecentRedemptionCard key={redemption.id} item={redemption} />
                ))
              ) : (
                <EmptyMiniCard text="Todavia no hay actividad de canjes para este comercio." />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.heroMetricCard}>
      <Text style={styles.heroMetricValue}>{value}</Text>
      <Text style={styles.heroMetricLabel}>{label}</Text>
    </View>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryStatValue}>{value}</Text>
      <Text style={styles.summaryStatLabel}>{label}</Text>
    </View>
  );
}

function QuickActionCard({
  title,
  subtitle,
  icon,
  onPress,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.quickCard, highlight && styles.quickCardHighlight]}
      onPress={onPress}
    >
      <View style={styles.quickIconWrap}>
        <Feather
          name={icon}
          size={18}
          color={highlight ? theme.colors.accentRed : theme.colors.text}
        />
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function RecentPromotionCard({
  item,
  onPress,
}: {
  item: CommerceDashboardPromotion;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.listCard} onPress={onPress}>
      <View style={styles.listCardTopRow}>
        <BadgePill label={getPromotionBadgeLabel(item)} variant="red" size="sm" />
        <BadgePill
          label={item.status}
          variant={item.status === "APPROVED_VISIBLE" ? "yellow" : "ghost"}
          size="sm"
        />
      </View>
      <Text style={styles.listCardTitle}>{item.title}</Text>
      <Text style={styles.listCardMeta}>{item.commerce.name}</Text>
    </TouchableOpacity>
  );
}

function RecentRedemptionCard({ item }: { item: CommerceDashboardRedemption }) {
  const isSuccess = item.status === "SUCCESS";
  return (
    <View style={styles.listCard}>
      <View style={styles.redemptionTopRow}>
        <Text style={styles.listCardTitle}>{item.promotion.title}</Text>
        <Text
          style={[
            styles.redemptionStatus,
            { color: isSuccess ? theme.colors.success : theme.colors.accentRed },
          ]}
        >
          {item.status}
        </Text>
      </View>
      <Text style={styles.listCardMeta}>{item.user.fullName}</Text>
      <Text style={styles.redemptionMethod}>{item.validationMethod}</Text>
    </View>
  );
}

function EmptyMiniCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyMiniCard}>
      <Text style={styles.emptyMiniText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 34 },
  hero: {
    backgroundColor: theme.colors.headerDark,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroGlowYellow: {
    position: "absolute",
    right: -54,
    top: 0,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(255,191,0,0.18)",
  },
  heroGlowRed: {
    position: "absolute",
    left: -36,
    bottom: -44,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(255,49,49,0.18)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroRole: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  heroIconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    marginTop: 18,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "rgba(255,255,255,0.74)",
    fontWeight: "600",
  },
  heroMetricsRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  heroMetricCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  heroMetricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroMetricLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.66)",
  },
  summaryCard: {
    marginTop: 18,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadow.card,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryTopText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },
  summaryValue: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -1.3,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  summaryFooter: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  summaryStat: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
  },
  summaryStatLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  quickGrid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  quickCard: {
    width: "48.5%",
    minHeight: 130,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadow.soft,
  },
  quickCardHighlight: {
    backgroundColor: theme.colors.surfaceWarm,
  },
  quickIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  quickSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  sectionList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  listCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  listCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  listCardMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  redemptionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  redemptionStatus: {
    fontSize: 11,
    fontWeight: "900",
  },
  redemptionMethod: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },
  emptyMiniCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  emptyMiniText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
});
