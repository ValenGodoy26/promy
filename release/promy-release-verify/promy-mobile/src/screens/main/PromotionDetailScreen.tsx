import React, { useRef, useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { requestEmailVerification } from "../../api/auth";
import { createRedemption, fetchMyRedemptions, fetchPromotionById } from "../../api/catalog";
import { ApiError } from "../../api/client";
import PromoLogo from "../../components/promy/PromoLogo";
import {
  BadgePill,
  ErrorState,
  LoadingState,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
} from "../../components/promy/PromyUI";
import { useAuth } from "../../context/AuthContext";
import { useFavorites } from "../../context/FavoritesContext";
import type { MainStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import type { ApiRedemption, PromotionDetail, ValidationMethod } from "../../types/api";
import {
  buildPromotionTiming,
  formatAuthError,
  getCommerceHeadline,
  getPromotionAvailabilityMessage,
  getPromotionAvailabilityState,
  getPromotionBadgeLabel,
  getPromotionImage,
  getPromoMetricText,
  getValidationMethodLabel,
} from "../../utils/promy";

type PromotionDetailRoute = NativeStackScreenProps<MainStackParamList, "PromotionDetail">["route"];
type PromotionDetailNavigation = NativeStackNavigationProp<MainStackParamList>;
type FeedbackTone = "info" | "success" | "error";

export default function PromotionDetailScreen() {
  const navigation = useNavigation<PromotionDetailNavigation>();
  const route = useRoute<PromotionDetailRoute>();
  const { session, signOut } = useAuth();
  const { isPromotionFavorite, togglePromotionFavorite } = useFavorites();

  const [promotion, setPromotion] = useState<PromotionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const celebrationScale = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;

  const triggerCelebration = useCallback(() => {
    celebrationScale.setValue(0);
    celebrationOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(celebrationScale, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.delay(1400),
      Animated.timing(celebrationOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [celebrationScale, celebrationOpacity]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("info");
  const [existingRedemption, setExistingRedemption] = useState<ApiRedemption | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  const loadPromotion = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      setFeedback(null);

      const response = await fetchPromotionById(route.params.promotionId);
      setPromotion(response.promotion);

      if (session?.accessToken) {
        const redemptionsResponse = await fetchMyRedemptions(session.accessToken);
        const found = redemptionsResponse.redemptions.find(
          (item) => item.promotion.id === route.params.promotionId,
        );
        setExistingRedemption(found || null);
      } else {
        setExistingRedemption(null);
      }
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
    void loadPromotion();
  }, [route.params.promotionId]);

  const validationMethod: ValidationMethod | null = useMemo(
    () => promotion?.validationMethod || null,
    [promotion?.validationMethod],
  );
  const isEmailVerified = Boolean(session?.user.emailVerifiedAt);

  const availabilityState = useMemo(() => getPromotionAvailabilityState(promotion), [promotion]);
  const availabilityMessage = useMemo(() => getPromotionAvailabilityMessage(promotion), [promotion]);

  const handleResendVerification = async () => {
    if (!session?.user.email || resendingVerification) return;

    try {
      setResendingVerification(true);
      setFeedbackTone("success");
      setFeedback(null);

      const response = await requestEmailVerification(session.user.email);
      setFeedback(
        response.message ||
          "Te reenviamos el enlace de verificación. Revisá tu casilla y volvé para generar el canje.",
      );
    } catch (verificationError) {
      setFeedbackTone("error");
      setFeedback(formatAuthError(verificationError));
    } finally {
      setResendingVerification(false);
    }
  };

  const handleRedeem = async () => {
    if (!promotion || !session?.accessToken || redeeming || existingRedemption?.status === "SUCCESS") {
      return;
    }

    if (!isEmailVerified) {
      setFeedbackTone("error");
      setFeedback(
        "Primero verificá tu email para poder generar canjes. Si no encontrás el mail, pedí un nuevo enlace.",
      );
      return;
    }

    if (availabilityState !== "available") {
      setFeedbackTone("error");
      setFeedback(
        availabilityMessage ||
          "Esta promo no se puede usar ahora. Revisá la vigencia y el horario antes de volver a intentarlo.",
      );
      return;
    }

    if (existingRedemption?.status === "PENDING") {
      setFeedbackTone("info");
      setFeedback("Ya generaste este canje. Mostrá el QR o el código en el comercio para validarlo.");
      return;
    }

    try {
      setRedeeming(true);
      setFeedback(null);

      const response = await createRedemption(session.accessToken, {
        promotionId: promotion.id,
      });

      setExistingRedemption(response.redemption);
      setFeedbackTone("success");
      setFeedback(response.message || "¡Canje generado!");
      triggerCelebration();
    } catch (redeemError) {
      if (redeemError instanceof ApiError && redeemError.status === 401) {
        await signOut({ reason: "Tu sesión venció. Volvé a ingresar para seguir usando PROMY." });
        return;
      }
      setFeedbackTone("error");
      setFeedback(formatAuthError(redeemError));
    } finally {
      setRedeeming(false);
    }
  };

  const openCommerce = () => {
    if (!promotion?.commerce.id) return;
    navigation.navigate("CommerceDetail", { commerceId: promotion.commerce.id });
  };

  const handleToggleFavorite = async () => {
    if (!promotion) return;
    const added = await togglePromotionFavorite(promotion);
    setFeedbackTone("info");
    setFeedback(added ? "Guardada en favoritos" : "Quitada de favoritos");
  };

  const timing = promotion ? buildPromotionTiming(promotion) : null;
  const isFavorite = promotion ? isPromotionFavorite(promotion.id) : false;
  const redeemDisabled =
    existingRedemption?.status === "SUCCESS" ||
    existingRedemption?.status === "PENDING" ||
    availabilityState !== "available" ||
    !session?.accessToken ||
    !isEmailVerified;
  const image = promotion ? getPromotionImage(promotion, promotion.commerce) : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />
      {/* Celebration overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.celebrationOverlay,
          { opacity: celebrationOpacity },
        ]}
      >
        <Animated.View
          style={[
            styles.celebrationBurst,
            { transform: [{ scale: celebrationScale }] },
          ]}
        >
          <Feather name="check-circle" size={72} color={theme.colors.success} />
          <Text style={styles.celebrationText}>¡Canje listo!</Text>
          <Text style={styles.celebrationSub}>Mostralo en el comercio</Text>
        </Animated.View>
      </Animated.View>

      <ScreenHeader
        title="Detalle de promo"
        onBack={() => navigation.goBack()}
        rightIcon={isFavorite ? "heart" : "heart"}
        onRightPress={() => void handleToggleFavorite()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadPromotion("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
      >
        {loading ? (
          <LoadingState label="Cargando promoción..." />
        ) : error || !promotion ? (
          <ErrorState
            title="No pudimos cargar esta promo"
            message={error || "Promoción no disponible"}
            hint="Puede haber vencido, estar inactiva o ya no formar parte de los beneficios activos."
            onRetry={() => void loadPromotion()}
          />
        ) : (
          <>
            <View style={styles.heroWrap}>
              {image ? (
                <Image source={{ uri: image }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={styles.heroFallback}>
                  <PromoLogo size="lg" />
                </View>
              )}
              <View style={styles.heroBadgeOverlay}>
                <BadgePill label={getPromotionBadgeLabel(promotion)} variant="red" />
              </View>
              {isFavorite ? (
                <View style={styles.heroFavOverlay}>
                  <View style={styles.heroFavPill}>
                    <Feather name="heart" size={12} color={theme.colors.accentRed} />
                    <Text style={styles.heroFavText}>Guardada</Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.body}>
              <Text style={styles.commerceLabel}>{promotion.commerce.name}</Text>
              <Text style={styles.title}>{promotion.title}</Text>

              <View style={styles.metricCard}>
                <View>
                  <Text style={styles.metricEyebrow}>Tu beneficio</Text>
                  <Text style={styles.metricValue}>{getPromoMetricText(promotion)}</Text>
                </View>
                <View style={styles.metricMascot}>
                  <PromoLogo size="md" />
                </View>
              </View>

              {promotion.description ? (
                <Text style={styles.description}>{promotion.description}</Text>
              ) : null}

              <InfoCard
                icon="clock"
                title="Disponibilidad"
                value={timing || "Disponible por tiempo limitado"}
              />

              {validationMethod ? (
                <InfoCard
                  icon={validationMethod === "QR" ? "maximize" : "hash"}
                  title="Validación"
                  value={getValidationMethodLabel(validationMethod)}
                />
              ) : null}

              {promotion.conditions ? (
                <InfoCard icon="info" title="Condiciones" value={promotion.conditions} />
              ) : null}

              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.commerceCard}
                onPress={openCommerce}
              >
                <View style={styles.commerceLogo}>
                  <PromoLogo size="sm" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commerceTitle}>{promotion.commerce.name}</Text>
                  <Text style={styles.commerceSubtitle}>
                    {promotion.commerce.category?.name || "Comercio adherido"}
                  </Text>
                  <Text style={styles.commerceDescription} numberOfLines={2}>
                    {promotion.commerce.address || getCommerceHeadline(promotion.commerce)}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {existingRedemption?.validationCode ? (
                <View style={styles.codeCard}>
                  <View style={styles.codeHeader}>
                    <Feather name="hash" size={14} color={theme.colors.accentRed} />
                    <Text style={styles.codeTitle}>
                      {existingRedemption.validationMethod === "QR"
                        ? "QR y código de respaldo"
                        : "Código de validación"}
                    </Text>
                  </View>
                  {existingRedemption.validationMethod === "QR" ? (
                    <View style={styles.qrCard}>
                      <View style={styles.qrWrap}>
                        <QRCode
                          value={existingRedemption.validationCode}
                          size={172}
                          backgroundColor="#FFFFFF"
                          color="#111111"
                        />
                      </View>
                      <Text style={styles.qrHint}>
                        Mostralo para que el comercio lo escanee. Si hace falta, también puede validar con el código de abajo.
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.codeInputWrap}>
                    <Text style={styles.codeValue}>{existingRedemption.validationCode}</Text>
                    <Text style={styles.codeHint}>
                      {existingRedemption.validationMethod === "QR"
                        ? "QR principal con fallback manual."
                        : "Mostralo en el comercio para que validen el canje."}
                    </Text>
                  </View>
                </View>
              ) : null}

              {availabilityMessage && existingRedemption?.status !== "SUCCESS" ? (
                <View style={styles.availabilityCard}>
                  <Feather
                    name={availabilityState === "upcoming" ? "clock" : "slash"}
                    size={18}
                    color={
                      availabilityState === "upcoming"
                        ? theme.colors.primaryDark
                        : theme.colors.accentRed
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.availabilityTitle}>
                      {availabilityState === "upcoming"
                        ? "Promo todavía no disponible"
                        : "Promo no disponible ahora"}
                    </Text>
                    <Text style={styles.availabilityText}>{availabilityMessage}</Text>
                  </View>
                </View>
              ) : null}

              {!isEmailVerified && existingRedemption?.status !== "SUCCESS" ? (
                <View style={styles.verifyCard}>
                  <View style={styles.verifyIconWrap}>
                    <Feather name="mail" size={18} color={theme.colors.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verifyTitle}>Verificá tu email para poder canjear</Text>
                    <Text style={styles.verifyText}>
                      Antes de generar el QR o el código, necesitamos confirmar tu casilla.
                      Revisá tu correo o pedí un nuevo enlace.
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={styles.verifyButton}
                      onPress={() => void handleResendVerification()}
                      disabled={resendingVerification}
                    >
                      <Feather
                        name={resendingVerification ? "clock" : "send"}
                        size={14}
                        color={theme.colors.headerDark}
                      />
                      <Text style={styles.verifyButtonText}>
                        {resendingVerification ? "Enviando..." : "Reenviar verificación"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {existingRedemption?.status === "SUCCESS" ? (
                <View style={styles.successCard}>
                  <Feather name="check-circle" size={18} color={theme.colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.successTitle}>Ya usaste esta promo</Text>
                    <Text style={styles.successText}>
                      Esta marcada en tu historial de canjes.
                    </Text>
                  </View>
                </View>
              ) : null}

              {existingRedemption?.status === "PENDING" ? (
                <View style={styles.pendingCard}>
                  <Feather name="clock" size={18} color={theme.colors.primaryDark} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingTitle}>Canje pendiente de validación</Text>
                    <Text style={styles.pendingText}>
                      {existingRedemption.validationMethod === "QR"
                        ? "Tu QR ya fue generado. El comercio puede escanearlo o usar el código manual de respaldo."
                        : "Tu código ya fue generado. Cuando el comercio lo confirme, va a pasar a usado."}
                    </Text>
                  </View>
                </View>
              ) : null}

              {feedback && existingRedemption?.status !== "SUCCESS" ? (
                <View
                  style={[
                    styles.feedbackCard,
                    feedbackTone === "success"
                      ? styles.feedbackCardSuccess
                      : feedbackTone === "error"
                      ? styles.feedbackCardError
                      : styles.feedbackCardInfo,
                  ]}
                >
                  <Feather
                    name={
                      feedbackTone === "success"
                        ? "check-circle"
                        : feedbackTone === "error"
                        ? "alert-circle"
                        : "info"
                    }
                    size={16}
                    color={
                      feedbackTone === "success"
                        ? theme.colors.success
                        : feedbackTone === "error"
                        ? theme.colors.accentRed
                        : theme.colors.text
                    }
                  />
                  <Text style={styles.feedbackText}>{feedback}</Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {promotion && !loading ? (
        <View style={styles.footer}>
          <SecondaryButton
            label="Ver local"
            icon="map-pin"
            onPress={openCommerce}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={
              existingRedemption?.status === "SUCCESS"
                ? "Ya usada"
                : existingRedemption?.status === "PENDING"
                ? validationMethod === "QR"
                  ? "QR generado"
                  : "Código generado"
                : !isEmailVerified
                ? "Verificá tu email"
                : availabilityState !== "available"
                ? "No disponible"
                : validationMethod === "QR"
                ? "Generar QR"
                : "Canjear"
            }
            iconRight={existingRedemption?.status === "SUCCESS" ? "check" : "arrow-right"}
            onPress={() => void handleRedeem()}
            loading={redeeming}
            disabled={redeemDisabled}
            style={{ flex: 1.4 }}
          />
        </View>
      ) : null}
    </View>
  );
}

function InfoCard({
  icon,
  title,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIconWrap}>
        <Feather name={icon} size={14} color={theme.colors.accentRed} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  celebrationOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,15,16,0.72)",
  },
  celebrationBurst: {
    alignItems: "center",
    gap: 12,
    padding: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  celebrationText: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  celebrationSub: {
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  container: { flex: 1 },
  content: { paddingBottom: 120 },

  heroWrap: {
    margin: 16,
    height: 220,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: { width: "100%", height: "100%" },
  heroFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeOverlay: {
    position: "absolute",
    top: 14,
    left: 14,
  },
  heroFavOverlay: {
    position: "absolute",
    top: 14,
    right: 14,
  },
  heroFavPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    ...theme.shadow.soft,
  },
  heroFavText: {
    fontSize: 11,
    color: theme.colors.accentRed,
    fontWeight: "900",
  },

  body: {
    paddingHorizontal: 20,
  },
  commerceLabel: {
    fontSize: 12,
    color: theme.colors.accentRed,
    fontWeight: "900",
    letterSpacing: 0.4,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.colors.text,
    lineHeight: 30,
    letterSpacing: -0.6,
    marginBottom: 16,
  },

  metricCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  metricEyebrow: {
    fontSize: 12,
    color: "#111111",
    fontWeight: "800",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  metricMascot: {
    transform: [{ rotate: "8deg" }],
  },

  description: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textMuted,
    marginBottom: 16,
    fontWeight: "500",
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: theme.colors.accentRedSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: theme.colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: "600",
    lineHeight: 18,
  },

  commerceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  commerceLogo: {},
  commerceTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 1,
  },
  commerceSubtitle: {
    fontSize: 11,
    color: theme.colors.accentRed,
    fontWeight: "800",
    marginBottom: 3,
  },
  commerceDescription: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
    fontWeight: "500",
  },

  codeCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  codeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  codeTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  codeInputWrap: {
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  qrCard: {
    alignItems: "center",
    marginBottom: 12,
  },
  qrWrap: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  qrHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  codeValue: {
    fontSize: 22,
    color: theme.colors.text,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  codeHint: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },

  availabilityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  availabilityTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 1,
  },
  availabilityText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
    lineHeight: 17,
  },
  verifyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: "#F2D27A",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  verifyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF1C9",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.text,
  },
  verifyText: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "600",
    lineHeight: 18,
  },
  verifyButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  verifyButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.headerDark,
  },

  successCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(36,168,101,0.18)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.success,
    marginBottom: 1,
  },
  successText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(255,190,0,0.22)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.primaryDark,
    marginBottom: 1,
  },
  pendingText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },

  feedbackCard: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedbackCardInfo: {
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  feedbackCardSuccess: {
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(36,168,101,0.18)",
  },
  feedbackCardError: {
    backgroundColor: theme.colors.accentRedSoft,
    borderWidth: 1,
    borderColor: "rgba(255,49,49,0.12)",
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "600",
    lineHeight: 18,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 28,
    flexDirection: "row",
    gap: 10,
    ...theme.shadow.card,
  },
});
