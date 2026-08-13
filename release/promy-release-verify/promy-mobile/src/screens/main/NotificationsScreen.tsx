import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ApiError } from "../../api/client";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenHeader,
} from "../../components/promy/PromyUI";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import type { MainStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import { formatAuthError } from "../../utils/promy";

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { signOut } = useAuth();
  const {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAllAsRead,
    markOneAsRead,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      await refreshNotifications({ silent: mode !== "initial", force: true });
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        await signOut({ reason: "Tu sesión venció. Volvé a ingresar para seguir usando PROMY." });
        return;
      }
      setError(formatAuthError(loadError));
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      void loadNotifications("initial");
    }, []),
  );

  const handleOpenNotification = async (notificationId: number, promotionId?: number | null) => {
    try {
      await markOneAsRead(notificationId);
    } catch (actionError) {
      if (actionError instanceof ApiError && actionError.status === 401) {
        await signOut({ reason: "Tu sesión venció. Volvé a ingresar para seguir usando PROMY." });
        return;
      }
    }

    const normalizedPromotionId =
      typeof promotionId === "number" && Number.isInteger(promotionId) && promotionId > 0
        ? promotionId
        : null;

    if (normalizedPromotionId) {
      navigation.navigate("PromotionDetail", { promotionId: normalizedPromotionId });
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    try {
      setMarkingAll(true);
      await markAllAsRead();
    } catch (actionError) {
      if (actionError instanceof ApiError && actionError.status === 401) {
        await signOut({ reason: "Tu sesión venció. Volvé a ingresar para seguir usando PROMY." });
        return;
      }
      setError(formatAuthError(actionError));
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />

      <ScreenHeader
        title="Notificaciones"
        onBack={() => navigation.goBack()}
        rightIcon={unreadCount > 0 ? "check" : undefined}
        onRightPress={() => void handleMarkAllRead()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadNotifications("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Centro de avisos</Text>
            <Text style={styles.summaryValue}>{notifications.length}</Text>
            <Text style={styles.summaryText}>
              {notifications.length === 1 ? "notificacion" : "notificaciones"}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Sin leer</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
              {unreadCount}
            </Text>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.summaryButton, unreadCount === 0 && styles.summaryButtonDisabled]}
              disabled={unreadCount === 0 || markingAll}
              onPress={() => void handleMarkAllRead()}
            >
              <Text style={styles.summaryButtonText}>
                {markingAll ? "Actualizando..." : "Marcar todas"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <LoadingState label="Cargando notificaciones..." />
        ) : error ? (
          <ErrorState
            title="No pudimos cargar tus notificaciones"
            message={error}
            onRetry={() => void loadNotifications()}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="Todavia no hay novedades"
            message="Cuando PROMY tenga algo importante para contarte, va a aparecer aca."
            actionLabel="Explorar promos"
            onAction={() => navigation.navigate("Tabs", { screen: "Explorar" })}
            icon={<Feather name="bell" size={22} color={theme.colors.accentRed} />}
          />
        ) : (
          <View style={styles.list}>
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;
              return (
                <TouchableOpacity
                  key={notification.id}
                  activeOpacity={0.92}
                  style={[styles.card, isUnread && styles.cardUnread]}
                  onPress={() =>
                    void handleOpenNotification(
                      notification.id,
                      Number(notification.data?.promotionId),
                    )
                  }
                >
                  <View
                    style={[
                      styles.iconWrap,
                      isUnread ? styles.iconWrapUnread : styles.iconWrapRead,
                    ]}
                  >
                    <Feather
                      name={notification.type === "REDEMPTION_VALIDATED" ? "check-circle" : "bell"}
                      size={18}
                      color={
                        notification.type === "REDEMPTION_VALIDATED"
                          ? theme.colors.success
                          : theme.colors.accentRed
                      }
                    />
                  </View>

                  <View style={styles.textWrap}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{notification.title}</Text>
                      {isUnread ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <Text style={styles.cardBody}>{notification.body}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(notification.createdAt).toLocaleString("es-AR")}
                    </Text>
                  </View>

                  <Feather name="chevron-right" size={16} color={theme.colors.textSoft} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 36 },

  summaryCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 18,
    borderRadius: 22,
    backgroundColor: theme.colors.headerDark,
    flexDirection: "row",
    alignItems: "stretch",
    ...theme.shadow.card,
  },
  summaryBlock: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    marginHorizontal: 16,
    backgroundColor: theme.colors.dividerOnDark,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(255,255,255,0.62)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  summaryText: {
    fontSize: 12,
    color: theme.colors.mutedOnDark,
    fontWeight: "600",
  },
  summaryButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  summaryButtonDisabled: {
    opacity: 0.55,
  },
  summaryButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: theme.colors.text,
  },

  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  cardUnread: {
    borderColor: "rgba(255,190,0,0.35)",
    backgroundColor: "#FFF8E5",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapUnread: {
    backgroundColor: theme.colors.primarySoft,
  },
  iconWrapRead: {
    backgroundColor: theme.colors.surfaceWarm,
  },
  textWrap: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentRed,
  },
  cardBody: {
    fontSize: 12.5,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 10.5,
    color: theme.colors.textSoft,
    fontWeight: "700",
  },
});
