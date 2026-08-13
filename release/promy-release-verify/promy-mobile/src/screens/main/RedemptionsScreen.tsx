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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";

import { fetchMyRedemptions } from "../../api/catalog";
import { ApiError } from "../../api/client";
import { EmptyState, ErrorState, LoadingState } from "../../components/promy/PromyUI";
import { useAuth } from "../../context/AuthContext";
import type { MainStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import type { ApiRedemption } from "../../types/api";
import { formatAuthError, getValidationMethodLabel } from "../../utils/promy";

type Filter = "all" | "pending" | "success" | "failed";

function isCurrentMonth(dateValue?: string | null) {
  if (!dateValue) return false;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function TopHeader({
  onBack,
  successfulThisMonth,
}: {
  onBack: () => void;
  successfulThisMonth: number;
}) {
  const hasSuccessfulRedemptions = successfulThisMonth > 0;

  return (
    <SafeAreaView edges={["top"]} style={styles.header}>
      <View style={styles.headerGlowYellow} />
      <View style={styles.headerGlowRed} />

      <View style={styles.headerNav}>
        <TouchableOpacity activeOpacity={0.88} style={styles.headerIcon} onPress={onBack}>
          <Feather name="arrow-left" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Canjes</Text>

        <View style={styles.headerIcon}>
          <Feather name="sliders" size={16} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.headerKickerRow}>
        <Feather name="star" size={12} color={theme.colors.primary} />
        <Text style={styles.headerKicker}>Tus beneficios, usos e historial</Text>
      </View>

      {hasSuccessfulRedemptions ? (
        <Text style={styles.headerLead}>
          Ya usaste{" "}
          <Text style={styles.headerLeadHighlight}>{successfulThisMonth}</Text> promo
          {successfulThisMonth === 1 ? "" : "s"} este mes
        </Text>
      ) : (
        <Text style={styles.headerLead}>Tus beneficios quedan guardados aca, sin vueltas.</Text>
      )}
    </SafeAreaView>
  );
}

function SegmentedFilters({
  filter,
  setFilter,
  redemptionsCount,
  pendingCount,
  successCount,
  failedCount,
}: {
  filter: Filter;
  setFilter: (value: Filter) => void;
  redemptionsCount: number;
  pendingCount: number;
  successCount: number;
  failedCount: number;
}) {
  const options: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: "Disponibles", count: redemptionsCount },
    { id: "pending", label: "Pendientes", count: pendingCount },
    { id: "success", label: "Usados", count: successCount },
    { id: "failed", label: "Fallidos", count: failedCount },
  ];

  return (
    <View style={styles.segmentedWrap}>
      {options.map((option) => {
        const active = option.id === filter;
        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.9}
            style={[styles.segmentedItem, active && styles.segmentedItemActive]}
            onPress={() => setFilter(option.id)}
          >
            <Text style={[styles.segmentedLabel, active && styles.segmentedLabelActive]}>
              {option.label}
            </Text>
            <Text style={[styles.segmentedCount, active && styles.segmentedCountActive]}>
              {option.count}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function RedemptionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { session, signOut } = useAuth();
  const [redemptions, setRedemptions] = useState<ApiRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const loadRedemptions = async (mode: "initial" | "refresh" = "initial") => {
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
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        await signOut({ reason: "Tu sesión venció. Volvé a ingresar para seguir usando PROMY." });
        return;
      }
      setError(formatAuthError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRedemptions();
  }, [session?.accessToken]);

  const successCount = useMemo(
    () => redemptions.filter((item) => item.status === "SUCCESS").length,
    [redemptions],
  );
  const pendingCount = useMemo(
    () => redemptions.filter((item) => item.status === "PENDING").length,
    [redemptions],
  );
  const failedCount = useMemo(
    () => redemptions.filter((item) => item.status === "FAILED").length,
    [redemptions],
  );
  const successfulThisMonth = useMemo(
    () =>
      redemptions.filter(
        (item) => item.status === "SUCCESS" && isCurrentMonth(item.redeemedAt || item.createdAt),
      ).length,
    [redemptions],
  );

  const filteredRedemptions = useMemo(() => {
    if (filter === "pending") return redemptions.filter((item) => item.status === "PENDING");
    if (filter === "success") return redemptions.filter((item) => item.status === "SUCCESS");
    if (filter === "failed") return redemptions.filter((item) => item.status === "FAILED");
    return redemptions;
  }, [filter, redemptions]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />

      <TopHeader
        onBack={() => navigation.goBack()}
        successfulThisMonth={successfulThisMonth}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadRedemptions("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
      >
        <View style={styles.statsCard}>
          <View style={styles.statsItem}>
            <View style={styles.statsPillRed}>
              <Feather name="zap" size={12} color={theme.colors.accentRed} />
              <Text style={styles.statsPillRedText}>Disponibles</Text>
            </View>
            <Text style={styles.statsValue}>{redemptions.length}</Text>
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsItem}>
            <View style={styles.statsPillGreen}>
              <Feather name="check" size={12} color={theme.colors.success} />
              <Text style={styles.statsPillGreenText}>Usados</Text>
            </View>
            <Text style={styles.statsValue}>{successCount}</Text>
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsItem}>
            <View style={styles.statsPillMuted}>
              <Feather name="clock" size={12} color={theme.colors.textMuted} />
              <Text style={styles.statsPillMutedText}>Vencido</Text>
            </View>
            <Text style={styles.statsValue}>{failedCount}</Text>
          </View>
        </View>

        <SegmentedFilters
          filter={filter}
          setFilter={setFilter}
          redemptionsCount={redemptions.length}
          pendingCount={pendingCount}
          successCount={successCount}
          failedCount={failedCount}
        />

        {loading ? (
          <LoadingState label="Cargando canjes..." />
        ) : error ? (
          <ErrorState
            title="No pudimos cargar tus canjes"
            message={error}
            onRetry={() => void loadRedemptions()}
          />
        ) : filteredRedemptions.length ? (
          <View style={styles.list}>
            {filteredRedemptions.map((item) => {
              const isPending = item.status === "PENDING";
              const isSuccess = item.status === "SUCCESS";
              const accent = isSuccess
                ? theme.colors.success
                : isPending
                ? theme.colors.primaryDark
                : theme.colors.accentRed;
              const bg = isSuccess
                ? theme.colors.successSoft
                : isPending
                ? theme.colors.surfaceWarm
                : theme.colors.accentRedSoft;
              const statusText = isSuccess ? "Usado" : isPending ? "Pendiente" : "Fallido";

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.94}
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate("PromotionDetail", {
                      promotionId: item.promotion.id,
                    })
                  }
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.cardStatusPill, { backgroundColor: bg }]}>
                      <View style={[styles.cardStatusDot, { backgroundColor: accent }]} />
                      <Text style={[styles.cardStatusPillText, { color: accent }]}>
                        {statusText}
                      </Text>
                    </View>

                    <View style={styles.cardMethodPill}>
                      <Feather name="grid" size={11} color={theme.colors.textMuted} />
                      <Text style={styles.cardMethodText}>
                        {getValidationMethodLabel(item.validationMethod)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.promotion.title}
                  </Text>
                  <Text style={styles.cardCommerce} numberOfLines={1}>
                    {item.commerce?.name || "Local adherido"}
                  </Text>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Feather name="calendar" size={11} color={theme.colors.textMuted} />
                      <Text style={styles.metaText}>
                        {new Date(item.createdAt).toLocaleDateString("es-AR")}
                      </Text>
                    </View>

                    {item.validationCode ? (
                      <View style={styles.codePill}>
                        <Feather name="copy" size={11} color={theme.colors.textMuted} />
                        <Text style={styles.codeText}>{item.validationCode}</Text>
                      </View>
                    ) : null}
                  </View>

                  {isPending && item.validationMethod === "QR" && item.validationCode ? (
                    <View style={styles.qrCard}>
                      <View style={styles.qrHeader}>
                        <Text style={styles.qrTitle}>Mostra este QR en caja</Text>
                        <Text style={styles.qrHint}>El comercio puede escanearlo o validar el codigo.</Text>
                      </View>

                      <View style={styles.qrBody}>
                        <View style={styles.qrCanvas}>
                          <QRCode value={item.validationCode} size={112} />
                        </View>

                        <View style={styles.qrInfo}>
                          <Text style={styles.qrCodeLabel}>Codigo de respaldo</Text>
                          <Text style={styles.qrCodeValue}>{item.validationCode}</Text>
                          <Text style={styles.qrCopyHint}>
                            Si el QR falla, el local puede ingresar este codigo manualmente.
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.cardBottomRow}>
                    <Text style={styles.cardHint}>
                      {isSuccess
                        ? "Validado correctamente en el comercio."
                        : isPending
                        ? "Todavia podes usar este canje."
                        : "Este canje ya no esta disponible."}
                    </Text>

                    <View style={styles.cardChevronWrap}>
                      <Feather name="chevron-right" size={15} color={theme.colors.textMuted} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <EmptyState
            title={
              filter === "pending"
                ? "No tenes canjes pendientes"
                : filter === "success"
                ? "No tenes canjes usados todavia"
                : filter === "failed"
                ? "No hay canjes fallidos"
                : "Todavia no tenes canjes"
            }
            message={
              filter === "all"
                ? "Cuando uses tu primera promo, va a aparecer aca con todo el detalle."
                : "Proba cambiando el filtro o descubri promos nuevas."
            }
            actionLabel={filter === "all" ? "Descubrir promos" : undefined}
            onAction={
              filter === "all"
                ? () => navigation.navigate("Tabs", { screen: "Explorar" })
                : undefined
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 40 },

  header: {
    backgroundColor: theme.colors.headerDark,
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerGlowYellow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(255,191,0,0.25)",
  },
  headerGlowRed: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(255,49,49,0.24)",
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  headerKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
  },
  headerKicker: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  headerLead: {
    color: "#FFFFFF",
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 7,
    maxWidth: 280,
  },
  headerLeadHighlight: {
    color: theme.colors.primary,
  },

  statsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    paddingVertical: 15,
    paddingHorizontal: 6,
    flexDirection: "row",
    shadowColor: "#111111",
    shadowOpacity: 0.18,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  statsItem: {
    flex: 1,
    paddingHorizontal: 10,
  },
  statsDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  statsPillRed: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.accentRedSoft,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  statsPillRedText: {
    color: theme.colors.accentRed,
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statsPillGreen: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.successSoft,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  statsPillGreenText: {
    color: theme.colors.success,
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statsPillMuted: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
  },
  statsPillMutedText: {
    color: theme.colors.textMuted,
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statsValue: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  segmentedWrap: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 4,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: 18,
    padding: 4,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  segmentedItem: {
    width: "50%",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  segmentedItemActive: {
    backgroundColor: theme.colors.surface,
  },
  segmentedLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textMuted,
  },
  segmentedLabelActive: {
    color: theme.colors.text,
  },
  segmentedCount: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.textSoft,
  },
  segmentedCountActive: {
    color: theme.colors.accentRed,
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 16,
    ...theme.shadow.card,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cardStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  cardStatusPillText: {
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  cardMethodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cardMethodText: {
    color: theme.colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 12,
  },
  cardCommerce: {
    color: theme.colors.accentRed,
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 6,
  },
  metaRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  codePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  codeText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  qrCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 12,
  },
  qrHeader: {
    gap: 4,
  },
  qrTitle: {
    color: theme.colors.text,
    fontSize: 13.5,
    fontWeight: "900",
  },
  qrHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  qrBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  qrCanvas: {
    width: 128,
    height: 128,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  qrInfo: {
    flex: 1,
    gap: 6,
  },
  qrCodeLabel: {
    color: theme.colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qrCodeValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  qrCopyHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  cardBottomRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardHint: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
  },
  cardChevronWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceWarm,
    alignItems: "center",
    justifyContent: "center",
  },
});
