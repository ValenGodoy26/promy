import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BadgePill,
  ErrorState,
  GhostButton,
  LoadingState,
  PrimaryButton,
  ScreenHeader,
} from "../../components/promy/PromyUI";
import { fetchMyCommerce, updateMyCommerce, updateMyCommerceStatus } from "../../api/commerce";
import type { CommerceStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import type { CommerceManagedProfile, UpdateMyCommerceInput } from "../../types/api";
import {
  formatAuthError,
  getCommerceStatusLabel,
  getCommerceStatusTone,
} from "../../utils/promy";
import { DEFAULT_CITY_LABEL } from "../../services/location";

export default function CommerceProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<CommerceStackParamList>>();
  const [commerce, setCommerce] = useState<CommerceManagedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UpdateMyCommerceInput>({});

  const loadCommerce = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const response = await fetchMyCommerce();
      setCommerce(response.commerce);
      setForm(buildFormState(response.commerce));
    } catch (loadError) {
      setError(formatAuthError(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCommerce();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await updateMyCommerce(normalizeCommercePayload(form));
      setCommerce(response.commerce);
      setForm(buildFormState(response.commerce));
      Alert.alert(
        "Cambios guardados",
        "Actualizamos los datos del comercio. Si algo sigue pendiente, lo vas a ver reflejado en el estado del perfil.",
      );
    } catch (saveError) {
      setError(formatAuthError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!commerce) return;

    const nextStatus = commerce.status === "APPROVED" ? "INACTIVE" : "APPROVED";

    try {
      setTogglingStatus(true);
      setError(null);
      const response = await updateMyCommerceStatus({ status: nextStatus });
      setCommerce(response.commerce);
      setForm(buildFormState(response.commerce));
      Alert.alert(
        nextStatus === "INACTIVE" ? "Comercio pausado" : "Comercio reactivado",
        response.message ||
          (nextStatus === "INACTIVE"
            ? "Tu comercio dejó de mostrarse en el catálogo público."
            : "Tu comercio volvió a estar visible para clientes."),
      );
    } catch (toggleError) {
      setError(formatAuthError(toggleError));
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />
      <ScreenHeader title="Mi comercio" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadCommerce("refresh")}
            tintColor={theme.colors.accentRed}
          />
        }
      >
        {loading ? (
          <LoadingState label="Cargando datos del comercio..." />
        ) : error && !commerce ? (
          <ErrorState
            title="No pudimos cargar el comercio"
            message={error}
            onRetry={() => void loadCommerce()}
          />
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>{commerce?.name || "Tu comercio"}</Text>
              <Text style={styles.heroSubtitle}>
                {commerce?.category?.name || "Negocio"} · {commerce?.city?.name || DEFAULT_CITY_LABEL}
              </Text>
              <View style={styles.heroStatusRow}>
                <Text style={styles.heroStatusLabel}>Estado actual</Text>
                <BadgePill
                  label={getCommerceStatusLabel(commerce?.status)}
                  variant={getCommerceStatusTone(commerce?.status)}
                />
              </View>
            </View>

            {error ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inlineHint}>
              <Text style={styles.inlineHintText}>
                Mantené estos datos al día para evitar demoras al aprobar promos o mostrar tu local en la app.
              </Text>
            </View>

            {commerce && (commerce.status === "APPROVED" || commerce.status === "INACTIVE") ? (
              <View style={styles.pauseCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pauseTitle}>
                    {commerce.status === "APPROVED" ? "Pausar comercio" : "Reactivar comercio"}
                  </Text>
                  <Text style={styles.pauseCopy}>
                    {commerce.status === "APPROVED"
                      ? "Úsalo si quieres dejar de aparecer un tiempo en PROMY sin depender del admin."
                      : "Tu comercio está pausado. Puedes volver a activarlo cuando quieras."}
                  </Text>
                </View>
                <GhostButton
                  label={
                    togglingStatus
                      ? "Actualizando..."
                      : commerce.status === "APPROVED"
                      ? "Pausar"
                      : "Reactivar"
                  }
                  onPress={handleToggleStatus}
                />
              </View>
            ) : null}

            <Field
              label="Nombre visible"
              value={form.name || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
            />
            <Field
              label="Descripción corta"
              value={form.shortDescription || ""}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, shortDescription: value }))
              }
              multiline
            />
            <Field
              label="Descripción completa"
              value={form.description || ""}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, description: value }))
              }
              multiline
            />
            <Field
              label="Dirección"
              value={form.address || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, address: value }))}
            />
            <Field
              label="Teléfono"
              value={form.phone || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
            />
            <Field
              label="Instagram"
              value={form.instagram || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, instagram: value }))}
            />
            <Field
              label="Logo URL"
              value={form.logoUrl || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, logoUrl: value }))}
            />
            <Field
              label="Cover URL"
              value={form.coverUrl || ""}
              onChangeText={(value) => setForm((current) => ({ ...current, coverUrl: value }))}
            />

            <View style={styles.footerActions}>
              <PrimaryButton
                label="Guardar cambios"
                onPress={handleSave}
                loading={saving}
                fullWidth
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.inputMultiline]}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholder={label}
        placeholderTextColor={theme.colors.textSoft}
      />
    </View>
  );
}

function buildFormState(commerce: CommerceManagedProfile): UpdateMyCommerceInput {
  return {
    name: commerce.name || "",
    shortDescription: commerce.shortDescription || "",
    description: commerce.description || "",
    address: commerce.address || "",
    phone: commerce.phone || "",
    instagram: commerce.instagram || "",
    logoUrl: commerce.logoUrl || "",
    coverUrl: commerce.coverUrl || "",
  };
}

function normalizeCommercePayload(form: UpdateMyCommerceInput): UpdateMyCommerceInput {
  const payload: UpdateMyCommerceInput = {};
  const assign = (key: keyof UpdateMyCommerceInput, value?: string | number) => {
    if (typeof value === "string") {
      payload[key] = value.trim() as never;
      return;
    }

    if (typeof value === "number") {
      payload[key] = value as never;
    }
  };

  assign("name", form.name);
  assign("shortDescription", form.shortDescription);
  assign("description", form.description);
  assign("address", form.address);
  assign("phone", form.phone);
  assign("instagram", form.instagram);
  assign("logoUrl", form.logoUrl);
  assign("coverUrl", form.coverUrl);
  return payload;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 34 },
  heroCard: {
    margin: 16,
    borderRadius: 22,
    backgroundColor: theme.colors.headerDark,
    padding: 18,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    marginBottom: 8,
  },
  heroStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroStatusLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.72)",
  },
  inlineError: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 16,
    backgroundColor: theme.colors.accentRedSoft,
    borderWidth: 1,
    borderColor: "rgba(255,49,49,0.18)",
    padding: 12,
  },
  inlineErrorText: {
    color: theme.colors.accentRedDark,
    fontSize: 12,
    fontWeight: "700",
  },
  inlineHint: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  inlineHintText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  fieldWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.text,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: 14,
    paddingBottom: 14,
  },
  footerActions: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  pauseCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 12,
  },
  pauseTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
  },
  pauseCopy: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
});
