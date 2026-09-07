import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import {
  BottomSafeSpacer,
  ErrorState,
  PrimaryButton,
  ScreenHeader,
} from "../../components/promy/PromyUI";
import { useAuth } from "../../context/AuthContext";
import type { MainStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import { formatAuthError } from "../../utils/promy";
import { requestMyEmailChange } from "../../api/users";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ChangeEmailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { session } = useAuth();
  const [nextEmail, setNextEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentEmail = session?.user.email?.trim() || "";
  const trimmedNextEmail = nextEmail.trim();
  const canSubmit =
    !saving &&
    currentPassword.trim().length >= 8 &&
    isValidEmail(trimmedNextEmail) &&
    trimmedNextEmail.toLowerCase() !== currentEmail.toLowerCase();

  const submit = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await requestMyEmailChange({
        nextEmail: trimmedNextEmail,
        currentPassword,
      });

      setCurrentPassword("");
      setSuccess(
        response.message ||
          "Te enviamos un enlace al nuevo email para confirmar el cambio.",
      );

      Alert.alert(
        "Revisa tu nuevo email",
        response.message ||
          "Te enviamos un enlace al nuevo correo. Tu cuenta seguirá usando el email actual hasta que lo confirmes.",
      );
    } catch (requestError) {
      setError(formatAuthError(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />
      <ScreenHeader title="Cambiar email" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Feather name="mail" size={18} color={theme.colors.accentRed} />
          </View>
          <Text style={styles.heroEyebrow}>Seguridad de la cuenta</Text>
          <Text style={styles.heroTitle}>Confirma el nuevo correo antes de aplicarlo</Text>
          <Text style={styles.heroCopy}>
            Por seguridad, el email de tu cuenta no cambia al instante. Primero te mandamos un
            enlace al nuevo correo y recién después actualizamos el acceso.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Email actual</Text>
          <Text style={styles.summaryValue}>{currentEmail || "Sin email"}</Text>
        </View>

        {error ? (
          <ErrorState
            title="No pudimos iniciar el cambio"
            message={error}
          />
        ) : null}

        {success ? (
          <View style={styles.successCard}>
            <Feather name="check-circle" size={18} color={theme.colors.success} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Nuevo email</Text>
          <TextInput
            value={nextEmail}
            onChangeText={setNextEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="nuevo@correo.com"
            placeholderTextColor={theme.colors.textSoft}
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>Tu contraseña actual</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Ingresa tu contraseña"
            placeholderTextColor={theme.colors.textSoft}
            style={styles.input}
          />

          <Text style={styles.helper}>
            Cuando confirmes el enlace en el nuevo correo, cerraremos tus sesiones activas y
            tendrás que volver a ingresar con el email nuevo.
          </Text>
        </View>

        <PrimaryButton
          label={saving ? "Enviando..." : "Enviar confirmación"}
          onPress={() => void submit()}
          disabled={!canSubmit}
        />

        <BottomSafeSpacer extra={18} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: 18,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#FFF6EC",
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.accentRed,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.text,
  },
  heroCopy: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
  },
  successCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#F2FBF5",
    borderWidth: 1,
    borderColor: "#C7EBD2",
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  successText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  formCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: "#FFFDF9",
    marginBottom: 14,
  },
  helper: {
    fontSize: 12.5,
    lineHeight: 19,
    color: theme.colors.textMuted,
  },
});
