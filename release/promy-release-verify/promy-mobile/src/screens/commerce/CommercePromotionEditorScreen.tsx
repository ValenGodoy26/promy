import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  createCommercePromotion,
  deleteCommercePromotion,
  fetchCommercePromotions,
  updateCommercePromotion,
} from "../../api/commerce";
import {
  ErrorState,
  GhostButton,
  LoadingState,
  PrimaryButton,
  ScreenHeader,
  Segmented,
} from "../../components/promy/PromyUI";
import type { CommerceStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import type {
  CommerceManagedPromotion,
  CreateCommercePromotionInput,
  PromotionStatus,
  PromotionType,
  ValidationMethod,
} from "../../types/api";
import { formatAuthError } from "../../utils/promy";

type EditorRoute = NativeStackScreenProps<
  CommerceStackParamList,
  "CommercePromotionEditor"
>["route"];

type PromotionMode = "DRAFT" | "PENDING_REVIEW";

const promotionTypes: Array<{ id: PromotionType; label: string }> = [
  { id: "PERCENTAGE", label: "Descuento" },
  { id: "FIXED_AMOUNT", label: "Monto fijo" },
  { id: "SPECIAL_COMBO", label: "Combo" },
  { id: "BENEFIT", label: "Beneficio" },
  { id: "TIME_SLOT", label: "Franja horaria" },
  { id: "DAY_PROMO", label: "Dia promo" },
];

const validationMethodOptions: Array<{ id: ValidationMethod; label: string }> = [
  { id: "QR", label: "QR" },
  { id: "MANUAL_CODE", label: "Codigo" },
];

export default function CommercePromotionEditorScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<CommerceStackParamList>>();
  const route = useRoute<EditorRoute>();
  const [promotion, setPromotion] = useState<CommerceManagedPromotion | null>(null);
  const [loading, setLoading] = useState(Boolean(route.params?.promotionId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [conditions, setConditions] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [promotionType, setPromotionType] = useState<PromotionType>("PERCENTAGE");
  const [validationMethod, setValidationMethod] = useState<ValidationMethod>("QR");
  const [statusMode, setStatusMode] = useState<PromotionMode>("DRAFT");

  const isEditing = Boolean(route.params?.promotionId);

  useEffect(() => {
    const loadPromotion = async () => {
      if (!route.params?.promotionId) return;

      try {
        setLoading(true);
        setError(null);
        const response = await fetchCommercePromotions();
        const currentPromotion =
          response.promotions.find((item) => item.id === route.params?.promotionId) || null;

        if (!currentPromotion) {
          setError("No encontramos la promocion a editar.");
          return;
        }

        hydrateForm(currentPromotion);
      } catch (loadError) {
        setError(formatAuthError(loadError));
      } finally {
        setLoading(false);
      }
    };

    void loadPromotion();
  }, [route.params?.promotionId]);

  const screenTitle = useMemo(
    () => (isEditing ? "Editar promocion" : "Nueva promocion"),
    [isEditing],
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload = buildPayload({
        title,
        description,
        conditions,
        discountValue,
        startTime,
        endTime,
        imageUrl,
        promotionType,
        validationMethod,
        statusMode,
      });

      const response = isEditing && route.params?.promotionId
        ? await updateCommercePromotion(route.params.promotionId, payload)
        : await createCommercePromotion(payload);

      hydrateForm(response.promotion);
      navigation.goBack();
    } catch (saveError) {
      setError(formatAuthError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!route.params?.promotionId) return;

    Alert.alert(
      "Eliminar promocion",
      "Si esta promocion no tiene canjes asociados, la vamos a eliminar de forma permanente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void confirmDelete(route.params?.promotionId as number);
          },
        },
      ],
    );
  };

  const confirmDelete = async (promotionId: number) => {
    try {
      setSaving(true);
      setError(null);
      await deleteCommercePromotion(promotionId);
      navigation.goBack();
    } catch (deleteError) {
      setError(formatAuthError(deleteError));
    } finally {
      setSaving(false);
    }
  };

  function hydrateForm(currentPromotion: CommerceManagedPromotion) {
    setPromotion(currentPromotion);
    setTitle(currentPromotion.title || "");
    setDescription(currentPromotion.description || "");
    setConditions(currentPromotion.conditions || "");
    setDiscountValue(
      typeof currentPromotion.discountValue === "number"
        ? String(currentPromotion.discountValue)
        : "",
    );
    setStartTime(currentPromotion.startTime || "");
    setEndTime(currentPromotion.endTime || "");
    setImageUrl(currentPromotion.imageUrl || "");
    setPromotionType(currentPromotion.promotionType);
    setValidationMethod(currentPromotion.validationMethod);
    setStatusMode(
      currentPromotion.status === "PENDING_REVIEW" ? "PENDING_REVIEW" : "DRAFT",
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />
      <ScreenHeader title={screenTitle} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {loading ? (
          <LoadingState label="Cargando promocion..." />
        ) : error && isEditing && !promotion ? (
          <ErrorState title="No pudimos abrir la promocion" message={error} />
        ) : (
          <>
            {error ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{error}</Text>
              </View>
            ) : null}

            <Field label="Titulo" value={title} onChangeText={setTitle} />
            <Field
              label="Descripcion"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <Field
              label="Condiciones"
              value={conditions}
              onChangeText={setConditions}
              multiline
            />
            <Field
              label="Valor descuento"
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="numeric"
            />
            <Field label="Hora inicio" value={startTime} onChangeText={setStartTime} />
            <Field label="Hora fin" value={endTime} onChangeText={setEndTime} />
            <Field label="Imagen URL" value={imageUrl} onChangeText={setImageUrl} />

            <Text style={styles.groupLabel}>Tipo de promocion</Text>
            <View style={styles.segmentWrap}>
              <Segmented
                active={promotionType}
                onChange={setPromotionType}
                options={promotionTypes}
              />
            </View>

            <Text style={styles.groupLabel}>Validacion</Text>
            <View style={styles.segmentWrap}>
              <Segmented
                active={validationMethod}
                onChange={setValidationMethod}
                options={validationMethodOptions}
              />
            </View>

            <Text style={styles.groupLabel}>Estado</Text>
            <View style={styles.segmentWrap}>
              <Segmented<PromotionMode>
                active={statusMode}
                onChange={setStatusMode}
                options={[
                  { id: "DRAFT", label: "Borrador" },
                  { id: "PENDING_REVIEW", label: "Revision" },
                ]}
              />
            </View>

            <View style={styles.actionWrap}>
              <PrimaryButton
                label={isEditing ? "Guardar promocion" : "Crear promocion"}
                loading={saving}
                onPress={handleSave}
                fullWidth
              />
            </View>

            {isEditing ? (
              <View style={styles.secondaryActionWrap}>
                <GhostButton
                  label="Eliminar promocion"
                  icon="trash-2"
                  onPress={handleDelete}
                  fullWidth
                />
              </View>
            ) : null}
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
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline && styles.inputMultiline]}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor={theme.colors.textSoft}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

function buildPayload(input: {
  title: string;
  description: string;
  conditions: string;
  discountValue: string;
  startTime: string;
  endTime: string;
  imageUrl: string;
  promotionType: PromotionType;
  validationMethod: ValidationMethod;
  statusMode: PromotionMode;
}): CreateCommercePromotionInput {
  const normalizedDiscount = input.discountValue.trim()
    ? Number(input.discountValue.replace(",", "."))
    : null;

  return {
    title: input.title.trim(),
    description: input.description.trim(),
    conditions: input.conditions.trim() || undefined,
    discountValue: Number.isFinite(normalizedDiscount as number)
      ? normalizedDiscount
      : null,
    startTime: input.startTime.trim() || undefined,
    endTime: input.endTime.trim() || undefined,
    imageUrl: input.imageUrl.trim() || undefined,
    promotionType: input.promotionType,
    validationMethod: input.validationMethod,
    status: input.statusMode as PromotionStatus,
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 34 },
  inlineError: {
    marginHorizontal: 16,
    marginTop: 16,
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
  fieldWrap: {
    marginHorizontal: 16,
    marginTop: 14,
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
  groupLabel: {
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: "900",
    color: theme.colors.text,
  },
  segmentWrap: {
    marginBottom: 4,
  },
  actionWrap: {
    marginHorizontal: 16,
    marginTop: 18,
  },
  secondaryActionWrap: {
    marginHorizontal: 16,
    marginTop: 10,
  },
});
