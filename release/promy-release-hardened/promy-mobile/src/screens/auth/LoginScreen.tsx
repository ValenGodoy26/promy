import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import PromoLogo from "../../components/promy/PromoLogo";
import { requestPasswordReset } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { AuthStackParamList } from "../../navigation/AuthNavigator";
import { theme } from "../../styles/theme";
import { formatAuthError } from "../../utils/promy";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn, isSigningIn, authNotice, clearAuthNotice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0 && !isSigningIn,
    [email, password, isSigningIn],
  );

  const handleLogin = async () => {
    if (!canSubmit) return;
    try {
      setError(null);
      clearAuthNotice();
      await signIn(email.trim(), password);
    } catch (authError) {
      setError(formatAuthError(authError));
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Ingresá tu email para recuperar la contraseña.");
      return;
    }

    try {
      setError(null);
      const response = await requestPasswordReset(normalizedEmail);

      Alert.alert(
        "Recuperación iniciada",
        __DEV__ && response.reset?.link
          ? `Si el email existe, enviamos instrucciones para recuperar la contraseña.\n\nEn entorno local:\n${response.reset.link}`
          : "Si el email existe, enviamos instrucciones para recuperar la contraseña.",
      );
    } catch (authError) {
      setError(formatAuthError(authError));
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.primary} />

      <SafeAreaView edges={["top"]} style={styles.hero}>
        <View style={styles.cityPill}>
          <Feather name="map-pin" size={11} color={theme.colors.accentRed} />
          <Text style={styles.cityPillText}>APP CLIENTE · BETA</Text>
        </View>

        <View style={styles.brandBlock}>
          <PromoLogo size="lg" />
          <Text style={styles.brandName}>PROMY</Text>
          <Text style={styles.brandTagline}>Descuentos reales · cerca tuyo</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.tabShell}>
              <View style={styles.activeTab}>
                <Text style={styles.activeTabText}>Iniciar sesion</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.inactiveTabButton}
                onPress={() => navigation.navigate("Register")}
              >
                <Text style={styles.inactiveTabText}>Registrarse</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <InputField
                label="Email"
                icon="mail"
                placeholder="tu@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />

              <InputField
                label="Contrasena"
                icon="lock"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                trailing={
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={8}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={16}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                }
              />

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.forgotWrap}
                onPress={() => void handleForgotPassword()}
              >
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>

            {authNotice && !error ? (
              <View style={styles.noticeBanner}>
                <Feather name="clock" size={14} color={theme.colors.text} />
                <Text style={styles.noticeText}>{authNotice}</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={clearAuthNotice} hitSlop={8}>
                  <Feather name="x" size={14} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color={theme.colors.accentRedDark} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.92}
              disabled={!canSubmit}
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
              onPress={handleLogin}
            >
              {isSigningIn ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Iniciar sesion</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.spacer} />

            <Text style={styles.helperText}>
              Usa tu cuenta real para descubrir promos, guardar favoritas y ver tus canjes.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InputField({
  label,
  icon,
  trailing,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  trailing?: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputShell}>
        <Feather name={icon} size={16} color={theme.colors.textMuted} />
        <TextInput
          placeholderTextColor={theme.colors.textSoft}
          style={styles.input}
          {...props}
        />
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: { flex: 1 },
  hero: {
    height: 320,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  cityPill: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(17,17,17,0.08)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cityPillText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    color: theme.colors.text,
  },
  brandBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: -12,
  },
  brandName: {
    fontSize: 42,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -2,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(17,17,17,0.72)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  formCard: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    padding: 20,
    ...theme.shadow.strong,
  },
  tabShell: {
    height: 46,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    padding: 4,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  activeTab: {
    flex: 1,
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.headerDark,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  inactiveTabText: {
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },
  inactiveTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingLeft: 4,
  },
  inputShell: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    paddingVertical: 0,
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: -2,
  },
  forgotText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  noticeBanner: {
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: theme.colors.text,
    fontWeight: "700",
  },
  errorBanner: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.accentRedSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.accentRedDark,
  },
  cta: {
    height: 56,
    borderRadius: 999,
    backgroundColor: theme.colors.accentRed,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  ctaDisabled: {
    backgroundColor: "rgba(255,49,49,0.42)",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  spacer: {
    minHeight: 18,
  },
  helperText: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});
