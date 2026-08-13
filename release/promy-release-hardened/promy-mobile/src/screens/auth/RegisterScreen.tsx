import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import PromoLogo from "../../components/promy/PromoLogo";
import { useAuth } from "../../context/AuthContext";
import { AuthStackParamList } from "../../navigation/AuthNavigator";
import { theme } from "../../styles/theme";
import { formatAuthError } from "../../utils/promy";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
}

export default function RegisterScreen({ navigation }: Props) {
  const { signUpClient, isSigningIn } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length >= 3 &&
      email.trim().length > 0 &&
      isStrongPassword(password) &&
      confirmPassword.length > 0 &&
      acceptedLegal &&
      !isSigningIn
    );
  }, [acceptedLegal, confirmPassword.length, email, fullName, isSigningIn, password.length]);

  const handleRegister = async () => {
    if (!canSubmit) {
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    if (!isStrongPassword(password)) {
      setError("La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula y un numero.");
      return;
    }

    if (!acceptedLegal) {
      setError("Tenes que aceptar terminos y politica de privacidad para crear la cuenta.");
      return;
    }

    try {
      setError(null);
      await signUpClient({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
    } catch (authError) {
      setError(formatAuthError(authError));
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.primary} />

      <SafeAreaView edges={["top"]} style={styles.hero}>
        <View style={styles.cityPill}>
          <Feather name="user-plus" size={11} color={theme.colors.accentRed} />
          <Text style={styles.cityPillText}>CREA TU CUENTA PROMY</Text>
        </View>

        <View style={styles.brandBlock}>
          <PromoLogo size="lg" />
          <Text style={styles.brandName}>PROMY</Text>
          <Text style={styles.brandTagline}>Tu cuenta para descubrir promos cerca tuyo</Text>
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
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.inactiveTab}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={styles.inactiveTabText}>Iniciar sesion</Text>
              </TouchableOpacity>
              <View style={styles.activeTab}>
                <Text style={styles.activeTabText}>Registrarse</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <InputField
                label="Nombre completo"
                icon="user"
                placeholder="Como te llamas?"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />

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
                label="Telefono"
                icon="phone"
                placeholder="Opcional"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <InputField
                label="Contrasena"
                icon="lock"
                placeholder="8 caracteres, mayuscula y numero"
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

              <InputField
                label="Repeti la contrasena"
                icon="shield"
                placeholder="Volvela a escribir"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                trailing={
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    hitSlop={8}
                  >
                    <Feather
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={16}
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                }
              />
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color={theme.colors.accentRedDark} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.legalAcceptRow}
              onPress={() => setAcceptedLegal((prev) => !prev)}
            >
              <View style={[styles.checkbox, acceptedLegal && styles.checkboxActive]}>
                {acceptedLegal ? <Feather name="check" size={13} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.legalAcceptText}>
                Acepto los{" "}
                <Text
                  style={styles.legalLink}
                  onPress={() => navigation.navigate("Legal", { kind: "terms" })}
                >
                  Terminos y condiciones
                </Text>{" "}
                y la{" "}
                <Text
                  style={styles.legalLink}
                  onPress={() => navigation.navigate("Legal", { kind: "privacy" })}
                >
                  Politica de privacidad
                </Text>
                .
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.92}
              disabled={!canSubmit}
              style={[styles.cta, !canSubmit && styles.ctaDisabled]}
              onPress={handleRegister}
            >
              {isSigningIn ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Crear cuenta</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.helperText}>
              Te vamos a pedir verificar tu email para proteger la cuenta y recuperar acceso cuando haga falta.
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
    height: 300,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    paddingHorizontal: 24,
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
    marginTop: -10,
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
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  formCard: {
    marginTop: -24,
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
  inactiveTab: {
    flex: 1,
    height: "100%",
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
    opacity: 0.6,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  legalAcceptRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: theme.colors.accentRed,
    borderColor: theme.colors.accentRed,
  },
  legalAcceptText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  legalLink: {
    color: theme.colors.accentRed,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});
