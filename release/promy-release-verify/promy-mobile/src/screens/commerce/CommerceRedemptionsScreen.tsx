import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import {
  fetchCommerceRedemptions,
  validateCommerceRedemption,
} from "../../api/commerce";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenHeader,
  Segmented,
} from "../../components/promy/PromyUI";
import type { CommerceStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import type { CommerceManagedRedemption } from "../../types/api";
import { formatAuthError } from "../../utils/promy";

type Filter = "all" | "pending" | "success" | "failed";

function normalizeValidationCode(rawValue: string) {
  const normalized = rawValue.trim().toUpperCase();
  const exactMatch = normalized.match(/PROMY-[A-Z0-9]+/);

  if (exactMatch) {
    return exactMatch[0];
  }

  return normalized;
}

export default function CommerceRedemptionsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<CommerceStackParamList>>();
  const [redemptions, setRedemptions] = useState<CommerceManagedRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [validationCode, setValidationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const loadRedemptions = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const response = await fetchCommerceRedemptions();
      setRedemptions(response.redemptions ?? []);
    } catch (loadError) {
      setError(formatAuthError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadRedemptions();
  }, []);

  const pendingCount = redemptions.filter((item) => item.status === "PENDING").length;
  const successCount = redemptions.filter((item) => item.status === "SUCCESS").length;
  const failedCount = redemptions.filter((item) => item.status === "FAILED").length;
  const filtered = useMemo(() => {
    if (filter === "pending") return redemptions.filter((item) => item.status === "PENDING");
    if (filter === "success") return redemptions.filter((item) => item.status === "SUCCESS");
    if (filter === "failed") return redemptions.filter((item) => item.status === "FAILED");
    return redemptions;
  }, [filter, redemptions]);

  const submitValidation = async (sourceCode?: string) => {
    const normalizedCode = normalizeValidationCode(sourceCode ?? validationCode);

    if (!normalizedCode) {
      setSubmitError("Ingresa el codigo que muestra el cliente para validar el canje.");
      setSubmitMessage(null);
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitMessage(null);

      const response = await validateCommerceRedemption({
        validationCode: normalizedCode,
      });

      setSubmitMessage(response.message ?? "Canje validado correctamente.");
      setSubmitError(null);
      setValidationCode("");
      await loadRedemptions();
      setFilter("success");
    } catch (submitValidationError) {
      setSubmitError(formatAuthError(submitValidationError));
      setSubmitMessage(null);
    } finally {
      setSubmitting(false);
    }
  };

  const openScanner = async () => {
    setSubmitError(null);
    setSubmitMessage(null);

    if (cameraPermission?.granted) {
      setScannerLocked(false);
      setScannerOpen(true);
      return;
    }

    const permissionResponse = await requestCameraPermission();

    if (permissionResponse.granted) {
      setScannerLocked(false);
      setScannerOpen(true);
      return;
    }

    Alert.alert(
      "Camara no disponible",
      "Necesitamos permiso de camara para escanear el QR del cliente. Si prefieres, puedes validar el canje ingresando el codigo manualmente.",
    );
  };

  const closeScanner = () => {
    setScannerOpen(false);
    setScannerLocked(false);
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scannerLocked || submitting) {
      return;
    }

    const normalizedCode = normalizeValidationCode(data);

    if (!normalizedCode.startsWith("PROMY-")) {
      setSubmitError("El QR escaneado no corresponde a un canje valido de PROMY.");
      setSubmitMessage(null);
      setScannerLocked(true);
      setTimeout(() => setScannerLocked(false), 1200);
      return;
    }

    setScannerLocked(true);
    setValidationCode(normalizedCode);
    closeScanner();
    void submitValidation(normalizedCode);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />
      <ScreenHeader title="Canjes del comercio" onBack={() => navigation.goBack()} />

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
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{redemptions.length}</Text>
          <Text style={styles.summaryLabel}>canjes registrados</Text>
        </View>

        <View style={styles.validatorCard}>
          <View style={styles.validatorHeader}>
            <View style={styles.validatorIcon}>
              <Feather name="shield" size={16} color={theme.colors.primaryDark} />
            </View>

            <View style={styles.validatorHeaderBody}>
              <Text style={styles.validatorTitle}>Validar un canje ahora</Text>
              <Text style={styles.validatorHint}>
                Escanea el QR del cliente o escribe el codigo exacto para aprobarlo.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[styles.scannerButton, scannerOpen && styles.scannerButtonActive]}
            onPress={() => void openScanner()}
          >
            <Feather name="camera" size={16} color={theme.colors.headerDark} />
            <Text style={styles.scannerButtonText}>
              {scannerOpen ? "Escaner activo" : "Escanear QR con la camara"}
            </Text>
          </TouchableOpacity>

          {scannerOpen ? (
            <View style={styles.scannerCard}>
              <CameraView
                style={styles.scannerPreview}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
              </View>
              <Text style={styles.scannerHint}>
                Alinea el codigo dentro del recuadro. Apenas lo detectemos, validamos el canje.
              </Text>
              <TouchableOpacity activeOpacity={0.85} style={styles.scannerClose} onPress={closeScanner}>
                <Text style={styles.scannerCloseText}>Cerrar escaner</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TextInput
            value={validationCode}
            onChangeText={(value) => {
              setValidationCode(value);
              if (submitError) setSubmitError(null);
            }}
            placeholder="PROMY-ABCD1234"
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.validatorInput}
            placeholderTextColor={theme.colors.textSoft}
          />

          {submitMessage ? <Text style={styles.validatorSuccess}>{submitMessage}</Text> : null}
          {submitError ? <Text style={styles.validatorError}>{submitError}</Text> : null}

          <TouchableOpacity
            activeOpacity={0.92}
            style={[styles.validatorButton, submitting && styles.validatorButtonDisabled]}
            onPress={() => void submitValidation()}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check-circle" size={16} color="#FFFFFF" />
                <Text style={styles.validatorButtonText}>Confirmar canje</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Segmented<Filter>
          active={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "Todos", count: redemptions.length },
            { id: "pending", label: "Pendientes", count: pendingCount },
            { id: "success", label: "Exitosos", count: successCount },
            { id: "failed", label: "Fallidos", count: failedCount },
          ]}
        />

        {loading ? (
          <LoadingState label="Cargando canjes..." />
        ) : error ? (
          <ErrorState
            title="No pudimos cargar los canjes"
            message={error}
            onRetry={() => void loadRedemptions()}
          />
        ) : filtered.length ? (
          <View style={styles.list}>
            {filtered.map((item) => {
              const isSuccess = item.status === "SUCCESS";
              const isPending = item.status === "PENDING";
              const accentColor = isSuccess
                ? theme.colors.success
                : isPending
                ? theme.colors.primaryDark
                : theme.colors.accentRed;
              const iconBg = isSuccess
                ? theme.colors.successSoft
                : isPending
                ? theme.colors.primaryBg
                : theme.colors.accentRedSoft;

              return (
                <View key={item.id} style={styles.card}>
                  <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
                    <Feather
                      name={
                        isSuccess ? "check-circle" : isPending ? "clock" : "alert-circle"
                      }
                      size={18}
                      color={accentColor}
                    />
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.promotion.title}</Text>
                    <Text style={styles.cardUser}>{item.user.fullName}</Text>
                    <Text style={styles.cardMeta}>
                      {item.validationMethod} -{" "}
                      {new Date(item.createdAt).toLocaleDateString("es-AR")}
                    </Text>
                    {item.validationCode ? (
                      <Text style={styles.cardCode}>Codigo {item.validationCode}</Text>
                    ) : null}
                  </View>

                  <Text style={[styles.cardStatus, { color: accentColor }]}>{item.status}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            title={
              filter === "pending"
                ? "No hay canjes pendientes"
                : filter === "success"
                ? "No encontramos canjes exitosos"
                : filter === "failed"
                ? "No hay canjes fallidos"
                : "No encontramos canjes"
            }
            message="La actividad del comercio va a aparecer aca cuando empiecen a usar las promos."
          />
        )}
      </ScrollView>
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
    padding: 18,
  },
  summaryValue: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.70)",
  },
  validatorCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
  },
  validatorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  validatorIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primaryBg,
  },
  validatorHeaderBody: {
    flex: 1,
    gap: 4,
  },
  validatorTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
  },
  validatorHint: {
    fontSize: 12.5,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  scannerButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scannerButtonActive: {
    borderColor: theme.colors.primaryDark,
  },
  scannerButtonText: {
    color: theme.colors.headerDark,
    fontSize: 13.5,
    fontWeight: "900",
  },
  scannerCard: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: theme.colors.headerDark,
  },
  scannerPreview: {
    width: "100%",
    height: 240,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerFrame: {
    width: 180,
    height: 180,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.92)",
    backgroundColor: "transparent",
  },
  scannerHint: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  scannerClose: {
    margin: 14,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  scannerCloseText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  validatorInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceWarm,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: theme.colors.text,
  },
  validatorSuccess: {
    color: theme.colors.success,
    fontSize: 12.5,
    fontWeight: "700",
  },
  validatorError: {
    color: theme.colors.accentRed,
    fontSize: 12.5,
    fontWeight: "700",
  },
  validatorButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.headerDark,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  validatorButtonDisabled: {
    opacity: 0.7,
  },
  validatorButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  card: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 2,
  },
  cardUser: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  cardCode: {
    marginTop: 6,
    fontSize: 11.5,
    fontWeight: "900",
    color: theme.colors.text,
  },
  cardStatus: {
    fontSize: 11,
    fontWeight: "900",
  },
});
