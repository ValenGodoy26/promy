import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  Weekday,
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

const weekdayOptions: Array<{ id: Weekday; label: string }> = [
  { id: "MONDAY", label: "Lun" },
  { id: "TUESDAY", label: "Mar" },
  { id: "WEDNESDAY", label: "Mie" },
  { id: "THURSDAY", label: "Jue" },
  { id: "FRIDAY", label: "Vie" },
  { id: "SATURDAY", label: "Sab" },
  { id: "SUNDAY", label: "Dom" },
];

const weekdayOrder: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const scheduleTemplateOptions: Array<{
  id: string;
  label: string;
  days: Weekday[];
  startTime: string;
  endTime: string;
}> = [
  {
    id: "weekdays",
    label: "Lun a Vie · 09:00 a 18:00",
    days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    startTime: "09:00",
    endTime: "18:00",
  },
  {
    id: "weekend",
    label: "Sab y Dom · 12:00 a 20:00",
    days: ["SATURDAY", "SUNDAY"],
    startTime: "12:00",
    endTime: "20:00",
  },
  {
    id: "everyday",
    label: "Todos los dias · 09:00 a 18:00",
    days: weekdayOrder,
    startTime: "09:00",
    endTime: "18:00",
  },
];

function getScheduleGuidance(promotionType: PromotionType) {
  if (promotionType === "TIME_SLOT") {
    return "Usa inicio y cierre para marcar la franja exacta en la que la promo se puede canjear.";
  }

  if (promotionType === "DAY_PROMO") {
    return "Si es una promo por dia, defini vigencia clara y, si aplica, una ventana horaria corta para evitar dudas.";
  }

  return "Si la promo depende de un horario, completa inicio y cierre juntos para que la app la muestre bien.";
}

function summarizeScheduleRows(
  schedules: Array<{ weekday: Weekday; startTime: string; endTime: string }>,
) {
  const normalized = schedules.filter((schedule) => schedule.startTime.trim() && schedule.endTime.trim());
  if (!normalized.length) return null;

  const grouped = new Map<string, Weekday[]>();

  normalized.forEach((schedule) => {
    const key = `${schedule.startTime.trim()}|${schedule.endTime.trim()}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(schedule.weekday);
    grouped.set(key, bucket);
  });

  const formatDays = (days: Weekday[]) => {
    const sorted = [...days].sort(
      (left, right) => weekdayOrder.indexOf(left) - weekdayOrder.indexOf(right),
    );

    if (sorted.length === weekdayOrder.length) return "Todos los dias";

    const ranges: string[] = [];
    let rangeStart = sorted[0];
    let previous = sorted[0];

    for (let index = 1; index <= sorted.length; index += 1) {
      const current = sorted[index];
      const previousOrder = weekdayOrder.indexOf(previous);
      const currentOrder = current ? weekdayOrder.indexOf(current) : -1;
      const isContiguous = current && currentOrder === previousOrder + 1;

      if (isContiguous) {
        previous = current;
        continue;
      }

      const startLabel = weekdayOptions.find((option) => option.id === rangeStart)?.label || rangeStart;
      const endLabel = weekdayOptions.find((option) => option.id === previous)?.label || previous;
      ranges.push(rangeStart === previous ? startLabel : `${startLabel} a ${endLabel}`);

      if (current) {
        rangeStart = current;
        previous = current;
      }
    }

    return ranges.join(" y ");
  };

  return [...grouped.entries()]
    .sort(([leftTimeKey, leftDays], [rightTimeKey, rightDays]) => {
      const leftOrder = Math.min(...leftDays.map((day) => weekdayOrder.indexOf(day)));
      const rightOrder = Math.min(...rightDays.map((day) => weekdayOrder.indexOf(day)));

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return leftTimeKey.localeCompare(rightTimeKey);
    })
    .map(([timeKey, days]) => {
      const [startTime, endTime] = timeKey.split("|");
      return `${formatDays(days)} · ${startTime} a ${endTime}`;
    })
    .join(" / ");
}

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
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [schedules, setSchedules] = useState<
    Array<{ weekday: Weekday; startTime: string; endTime: string }>
  >([]);
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
          setError("No encontramos la promociÃ³n que querÃ­as editar.");
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
    () => (isEditing ? "Editar promociÃ³n" : "Nueva promociÃ³n"),
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
        maxRedemptions,
        startTime,
        endTime,
        schedules,
        imageUrl,
        promotionType,
        validationMethod,
        statusMode,
      });

      const response = isEditing && route.params?.promotionId
        ? await updateCommercePromotion(route.params.promotionId, payload)
        : await createCommercePromotion(payload);

      hydrateForm(response.promotion);
      Alert.alert(
        isEditing ? "PromociÃ³n actualizada" : "PromociÃ³n creada",
        isEditing
          ? "Guardamos los cambios de la promo. Si quedÃ³ en revisiÃ³n, te vamos a mostrar el estado actualizado."
          : "La promo ya quedÃ³ cargada. Si la enviaste a revisiÃ³n, ahora la puede moderar el equipo.",
      );
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
      "Eliminar promociÃ³n",
      "Si esta promociÃ³n no tiene canjes asociados, la vamos a eliminar de forma permanente.",
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
      Alert.alert("PromociÃ³n eliminada", "La promo se eliminÃ³ correctamente del panel.");
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
    setMaxRedemptions(
      typeof currentPromotion.maxRedemptions === "number"
        ? String(currentPromotion.maxRedemptions)
        : "",
    );
    setStartTime(currentPromotion.startTime || "");
    setEndTime(currentPromotion.endTime || "");
    setImageUrl(currentPromotion.imageUrl || "");
    setSchedules(
      currentPromotion.schedules?.map((schedule) => ({
        weekday: schedule.weekday,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })) || [],
    );
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
          <LoadingState label="Cargando promociÃ³n..." />
        ) : error && isEditing && !promotion ? (
          <ErrorState title="No pudimos abrir la promociÃ³n" message={error} />
        ) : (
          <>
            {error ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inlineHint}>
              <Text style={styles.inlineHintText}>
                UsÃ¡ tÃ­tulos claros, condiciones concretas y horarios reales para que la promo llegue lista a revisiÃ³n.
              </Text>
            </View>

            <Field label="TÃ­tulo" value={title} onChangeText={setTitle} />
            <Field
              label="DescripciÃ³n"
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
              label="Valor del descuento"
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="numeric"
            />
            <Field
              label="Cupo maximo de canjes"
              value={maxRedemptions}
              onChangeText={setMaxRedemptions}
              keyboardType="numeric"
            />
            <View style={styles.inlineHint}>
              <Text style={styles.inlineHintText}>{getScheduleGuidance(promotionType)}</Text>
            </View>
            <Field label="Hora de inicio" value={startTime} onChangeText={setStartTime} />
            <Field label="Hora de cierre" value={endTime} onChangeText={setEndTime} />
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Ventanas por dia (opcional)</Text>
              <Text style={styles.scheduleHint}>
                Si agregas franjas por dia, estas ventanas mandan sobre el horario general.
              </Text>
              {schedules.length ? (
                <View style={styles.inlineHint}>
                  <Text style={styles.inlineHintText}>
                    Resumen: {summarizeScheduleRows(schedules) || "Completa inicio y cierre para ver el resumen."}
                  </Text>
                </View>
              ) : null}
              <View style={styles.scheduleTemplateList}>
                {scheduleTemplateOptions.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.scheduleTemplateChip}
                    onPress={() =>
                      setSchedules((current) => [
                        ...current,
                        ...template.days.map((weekday) => ({
                          weekday,
                          startTime: template.startTime,
                          endTime: template.endTime,
                        })),
                      ])
                    }
                  >
                    <Text style={styles.scheduleTemplateChipText}>{template.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.scheduleList}>
                {schedules.map((schedule, index) => (
                  <View key={`${schedule.weekday}-${index}`} style={styles.scheduleCard}>
                    <View style={styles.scheduleDayRow}>
                      {weekdayOptions.map((option) => (
                        <TouchableOpacity
                          key={`${option.id}-${index}`}
                          style={[
                            styles.scheduleDayChip,
                            schedule.weekday === option.id && styles.scheduleDayChipActive,
                          ]}
                          onPress={() =>
                            setSchedules((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, weekday: option.id } : item,
                              ),
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.scheduleDayChipText,
                              schedule.weekday === option.id && styles.scheduleDayChipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.scheduleTimeRow}>
                      <View style={styles.scheduleTimeField}>
                        <Text style={styles.fieldMiniLabel}>Inicio</Text>
                        <TextInput
                          value={schedule.startTime}
                          onChangeText={(value) =>
                            setSchedules((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, startTime: value } : item,
                              ),
                            )
                          }
                          style={styles.input}
                          placeholder="09:00"
                          placeholderTextColor={theme.colors.textSoft}
                        />
                      </View>
                      <View style={styles.scheduleTimeField}>
                        <Text style={styles.fieldMiniLabel}>Cierre</Text>
                        <TextInput
                          value={schedule.endTime}
                          onChangeText={(value) =>
                            setSchedules((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, endTime: value } : item,
                              ),
                            )
                          }
                          style={styles.input}
                          placeholder="18:00"
                          placeholderTextColor={theme.colors.textSoft}
                        />
                      </View>
                    </View>
                    <GhostButton
                      label="Quitar franja"
                      icon="x"
                      onPress={() =>
                        setSchedules((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                      fullWidth
                    />
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 10 }}>
                <GhostButton
                  label="Agregar franja"
                  icon="plus"
                  onPress={() =>
                    setSchedules((current) => [
                      ...current,
                      { weekday: "MONDAY", startTime: "09:00", endTime: "18:00" },
                    ])
                  }
                  fullWidth
                />
              </View>
            </View>
            <Field label="URL de imagen" value={imageUrl} onChangeText={setImageUrl} />

            <Text style={styles.groupLabel}>Tipo de promociÃ³n</Text>
            <View style={styles.segmentWrap}>
              <Segmented
                active={promotionType}
                onChange={setPromotionType}
                options={promotionTypes}
              />
            </View>

            <Text style={styles.groupLabel}>ValidaciÃ³n</Text>
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
                  { id: "PENDING_REVIEW", label: "RevisiÃ³n" },
                ]}
              />
            </View>

            <View style={styles.actionWrap}>
              <PrimaryButton
                label={isEditing ? "Guardar promociÃ³n" : "Crear promociÃ³n"}
                loading={saving}
                onPress={handleSave}
                fullWidth
              />
            </View>

            {isEditing ? (
              <View style={styles.secondaryActionWrap}>
                <GhostButton
                  label="Eliminar promociÃ³n"
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
  maxRedemptions: string;
  startTime: string;
  endTime: string;
  schedules: Array<{ weekday: Weekday; startTime: string; endTime: string }>;
  imageUrl: string;
  promotionType: PromotionType;
  validationMethod: ValidationMethod;
  statusMode: PromotionMode;
}): CreateCommercePromotionInput {
  const normalizedDiscount = input.discountValue.trim()
    ? Number(input.discountValue.replace(",", "."))
    : null;
  const normalizedMaxRedemptions = input.maxRedemptions.trim()
    ? Number(input.maxRedemptions.replace(",", "."))
    : null;

  return {
    title: input.title.trim(),
    description: input.description.trim(),
    conditions: input.conditions.trim() || undefined,
    discountValue: Number.isFinite(normalizedDiscount as number)
      ? normalizedDiscount
      : null,
    maxRedemptions: Number.isInteger(normalizedMaxRedemptions as number)
      ? normalizedMaxRedemptions
      : null,
    startTime: input.startTime.trim() || undefined,
    endTime: input.endTime.trim() || undefined,
    schedules: input.schedules
      .map((schedule) => ({
        weekday: schedule.weekday,
        startTime: schedule.startTime.trim(),
        endTime: schedule.endTime.trim(),
      }))
      .filter((schedule) => schedule.startTime && schedule.endTime),
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
  inlineHint: {
    marginHorizontal: 16,
    marginTop: 12,
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
  scheduleHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  scheduleTemplateList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  scheduleTemplateChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scheduleTemplateChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  fieldWrap: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  fieldMiniLabel: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textMuted,
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
  scheduleList: {
    gap: 12,
    marginTop: 12,
  },
  scheduleCard: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  scheduleDayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scheduleDayChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surfaceWarm,
  },
  scheduleDayChipActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  scheduleDayChipText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  scheduleDayChipTextActive: {
    color: "#FFFFFF",
  },
  scheduleTimeRow: {
    flexDirection: "row",
    gap: 10,
  },
  scheduleTimeField: {
    flex: 1,
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







