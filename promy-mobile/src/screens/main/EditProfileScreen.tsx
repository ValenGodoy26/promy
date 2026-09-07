import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { updateMyProfile } from "../../api/users";
import { BottomSafeSpacer, ErrorState, ScreenHeader } from "../../components/promy/PromyUI";
import {
  ProfileEditableAccountCard,
  ProfileSectionHeader,
} from "../../components/promy/profile/ProfileSections";
import { useAuth } from "../../context/AuthContext";
import type { MainStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import { formatAuthError } from "../../utils/promy";

const COUNTRY_OPTIONS = [
  "Argentina",
  "Uruguay",
  "Chile",
  "Paraguay",
  "Bolivia",
  "Brasil",
  "Peru",
  "Colombia",
  "Mexico",
  "Espana",
  "Estados Unidos",
  "Otro",
] as const;

const GENDER_OPTIONS = [
  { value: "WOMAN", label: "Mujer" },
  { value: "MAN", label: "Hombre" },
  { value: "NON_BINARY", label: "No binario" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefiero no decirlo" },
  { value: "OTHER", label: "Otro" },
] as const;

type PickerType = "country" | "gender" | null;

function parseBirthDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatBirthDateLabel(value: Date | null) {
  if (!value) return "";
  return value.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getGenderLabel(value: string) {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label || "";
}

function buildPickerOptions(type: PickerType) {
  if (type === "country") {
    return COUNTRY_OPTIONS.map((item) => ({ value: item, label: item }));
  }

  if (type === "gender") {
    return GENDER_OPTIONS.map((item) => ({ value: item.value, label: item.label }));
  }

  return [];
}

function getPickerMeta(type: PickerType) {
  switch (type) {
    case "country":
      return {
        title: "Selecciona tu pais",
        subtitle: "Esto nos ayuda a ubicar mejor tu contexto.",
      };
    case "gender":
      return {
        title: "Selecciona tu genero",
        subtitle: "Elige la opcion con la que te sientas mas comodo.",
      };
    default:
      return {
        title: "",
        subtitle: "",
      };
  }
}

function OptionPickerSheet({
  visible,
  type,
  selectedValue,
  onClose,
  onSelect,
}: {
  visible: boolean;
  type: PickerType;
  selectedValue: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const options = useMemo(() => buildPickerOptions(type), [type]);
  const meta = getPickerMeta(type);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>{meta.title}</Text>
              <Text style={styles.sheetSubtitle}>{meta.subtitle}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.88} onPress={onClose} style={styles.sheetClose}>
              <Feather name="x" size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetOptions}>
            {options.map((option) => {
              const active = option.value === selectedValue;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.9}
                  style={[styles.sheetOption, active && styles.sheetOptionActive]}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>
                    {option.label}
                  </Text>
                  {active ? (
                    <Feather name="check" size={16} color={theme.colors.accentRed} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BirthDatePickerSheet({
  visible,
  value,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  value: Date | null;
  onClose: () => void;
  onConfirm: (value: Date | null) => void;
}) {
  const [draftDate, setDraftDate] = useState<Date>(value ?? new Date(2000, 0, 1));

  useEffect(() => {
    setDraftDate(value ?? new Date(2000, 0, 1));
  }, [value, visible]);

  const handleChange = (_event: DateTimePickerEvent, nextDate?: Date) => {
    if (nextDate) {
      setDraftDate(nextDate);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Fecha de nacimiento</Text>
              <Text style={styles.sheetSubtitle}>
                Elige tu fecha con el selector nativo del dispositivo.
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.88} onPress={onClose} style={styles.sheetClose}>
              <Feather name="x" size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.datePreviewCard}>
            <Text style={styles.datePreviewLabel}>Fecha seleccionada</Text>
            <Text style={styles.datePreviewValue}>{formatBirthDateLabel(draftDate)}</Text>
          </View>

          <View style={styles.datePickerWrap}>
            <DateTimePicker
              value={draftDate}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              locale="es-AR"
              onChange={handleChange}
              style={styles.datePicker}
              textColor={theme.colors.text}
            />
          </View>

          <View style={styles.dateActionsRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.dateGhostButton}
              onPress={() => onConfirm(null)}
            >
              <Text style={styles.dateGhostButtonText}>Borrar fecha</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.datePrimaryButton}
              onPress={() => onConfirm(draftDate)}
            >
              <Text style={styles.datePrimaryButtonText}>Usar esta fecha</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { session, updateSessionUser, signOut } = useAuth();

  const [fullNameInput, setFullNameInput] = useState(session?.user.fullName || "");
  const [phoneInput, setPhoneInput] = useState(session?.user.phone || "");
  const [birthDateValue, setBirthDateValue] = useState<Date | null>(parseBirthDate(session?.user.birthDate));
  const [countryInput, setCountryInput] = useState(session?.user.country || "");
  const [genderInput, setGenderInput] = useState(session?.user.gender || "");
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [birthPickerVisible, setBirthPickerVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullNameInput(session?.user.fullName || "");
    setPhoneInput(session?.user.phone || "");
    setBirthDateValue(parseBirthDate(session?.user.birthDate));
    setCountryInput(session?.user.country || "");
    setGenderInput(session?.user.gender || "");
  }, [
    session?.user.birthDate,
    session?.user.country,
    session?.user.fullName,
    session?.user.gender,
    session?.user.phone,
  ]);

  const birthDateLabel = formatBirthDateLabel(birthDateValue);
  const genderLabel = getGenderLabel(genderInput);

  const selectedPickerValue = useMemo(() => {
    switch (activePicker) {
      case "country":
        return countryInput;
      case "gender":
        return genderInput;
      default:
        return "";
    }
  }, [activePicker, countryInput, genderInput]);

  const handlePickerSelect = (value: string) => {
    if (activePicker === "country") {
      setCountryInput(value);
      return;
    }

    if (activePicker === "gender") {
      setGenderInput(value);
    }
  };

  const saveBasicProfile = async () => {
    try {
      setSavingProfile(true);
      setError(null);

      const response = await updateMyProfile({
        fullName: fullNameInput,
        phone: phoneInput,
        birthDate: birthDateValue ? birthDateValue.toISOString().slice(0, 10) : null,
        country: countryInput,
        gender: genderInput,
      });

      await updateSessionUser(response.user);
      Alert.alert("Perfil actualizado", response.message || "Tus datos ya quedaron al dia.");
      navigation.goBack();
    } catch (profileError) {
      if (profileError instanceof Error && profileError.message.toLowerCase().includes("401")) {
        await signOut({ reason: "Tu sesion vencio. Volve a ingresar para seguir usando PROMY." });
        return;
      }
      setError(formatAuthError(profileError));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />
      <ScreenHeader title="Editar perfil" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Perfil personal</Text>
          <Text style={styles.heroTitle}>Completa tu cuenta con un poco mas de contexto.</Text>
          <Text style={styles.heroText}>
            Cuanto mejor este tu perfil, mas natural se va a sentir PROMY en futuras campanas,
            saludos y beneficios personalizados.
          </Text>
        </View>

        <ProfileSectionHeader title="Tus datos" />
        {error ? <ErrorState title="No pudimos guardar los datos" message={error} /> : null}

        <ProfileEditableAccountCard
          fullName={fullNameInput}
          phone={phoneInput}
          birthDateLabel={birthDateLabel}
          country={countryInput}
          countryLabel={countryInput}
          genderLabel={genderLabel}
          saving={savingProfile}
          onFullNameChange={setFullNameInput}
          onPhoneChange={setPhoneInput}
          onOpenBirthPicker={() => setBirthPickerVisible(true)}
          onOpenCountryPicker={() => setActivePicker("country")}
          onOpenGenderPicker={() => setActivePicker("gender")}
          onSave={() => void saveBasicProfile()}
        />

        <BottomSafeSpacer extra={18} />
      </ScrollView>

      <BirthDatePickerSheet
        visible={birthPickerVisible}
        value={birthDateValue}
        onClose={() => setBirthPickerVisible(false)}
        onConfirm={(value) => {
          setBirthDateValue(value);
          setBirthPickerVisible(false);
        }}
      />

      <OptionPickerSheet
        visible={activePicker !== null}
        type={activePicker}
        selectedValue={selectedPickerValue}
        onClose={() => setActivePicker(null)}
        onSelect={handlePickerSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { paddingBottom: 24 },
  heroCard: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 10,
    ...theme.shadow.soft,
  },
  heroEyebrow: {
    fontSize: 10.5,
    fontWeight: "900",
    color: theme.colors.accentRed,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.6,
  },
  heroText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,15,16,0.34)",
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: "#FFFDF8",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 26,
    maxHeight: "76%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetOptions: {
    gap: 10,
    paddingBottom: 8,
  },
  sheetOption: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetOptionActive: {
    borderColor: theme.colors.text,
    backgroundColor: theme.colors.surfaceWarm,
  },
  sheetOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sheetOptionTextActive: {
    fontWeight: "900",
  },
  datePreviewCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    gap: 4,
  },
  datePreviewLabel: {
    fontSize: 10.5,
    fontWeight: "900",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  datePreviewValue: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  datePickerWrap: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  datePicker: {
    width: "100%",
    height: 210,
  },
  dateActionsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  dateGhostButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  dateGhostButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },
  datePrimaryButton: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.headerDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  datePrimaryButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
