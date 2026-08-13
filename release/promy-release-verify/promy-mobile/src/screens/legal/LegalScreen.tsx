import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AuthStackParamList, MainStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";

type Props =
  | NativeStackScreenProps<AuthStackParamList, "Legal">
  | NativeStackScreenProps<MainStackParamList, "Legal">;

export default function LegalScreen({ navigation, route }: Props) {
  const kind = route.params.kind;
  const isPrivacy = kind === "privacy";

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color={theme.colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.kicker}>PROMY · Ley 25.326</Text>
            <Text style={styles.title}>{isPrivacy ? "Privacidad" : "Términos"}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          {isPrivacy
            ? "Esta política explica qué datos personales trata PROMY, para qué los usa y qué derechos podés ejercer."
            : "Estos términos ordenan el uso de PROMY entre clientes, comercios y la plataforma."}
        </Text>

        {isPrivacy ? <PrivacyContent /> : <TermsContent />}

        <Text style={styles.footer}>Última actualización: mayo 2026 · Contacto: hola@promy.app</Text>
      </ScrollView>
    </View>
  );
}

function PrivacyContent() {
  return (
    <>
      <LegalBlock title="Qué datos guardamos">
        Cuenta, nombre, email, teléfono opcional, ciudad, ubicación autorizada, comercios, promociones,
        canjes, notificaciones, favoritos locales y registros técnicos mínimos.
      </LegalBlock>
      <LegalBlock title="Para qué">
        Para operar cuentas, mostrar promociones cercanas, validar canjes, enviar avisos operativos,
        moderar contenido, prevenir abuso, mejorar la app y cumplir obligaciones legales.
      </LegalBlock>
      <LegalBlock title="Cómo se usan">
        PROMY muestra información pública de comercios y promociones aprobadas. Los comercios ven datos
        necesarios para validar canjes. No vendemos datos personales.
      </LegalBlock>
      <LegalBlock title="Tus derechos">
        Podés pedir acceso, actualización, rectificación o supresión de tus datos escribiendo a
        hola@promy.app desde el email de tu cuenta.
      </LegalBlock>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <LegalBlock title="Uso de la app">
        La app permite descubrir promociones, consultar comercios y canjear beneficios. Debés usarla de
        buena fe y brindar datos reales.
      </LegalBlock>
      <LegalBlock title="Responsabilidades">
        Los códigos o QR son personales y pueden rechazarse si están vencidos, usados o fueron obtenidos
        de forma irregular.
      </LegalBlock>
      <LegalBlock title="Relación con comercios">
        Los comercios son responsables por sus promociones, precios, stock, condiciones y atención en el
        local. PROMY facilita la conexión y validación.
      </LegalBlock>
      <LegalBlock title="Moderación">
        PROMY puede pausar, rechazar o eliminar cuentas, comercios o promociones ante errores, abuso,
        información falsa o incumplimientos.
      </LegalBlock>
    </>
  );
}

function LegalBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <Text style={styles.blockText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  safe: { backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.8,
  },
  content: { paddingHorizontal: 20, paddingBottom: 42 },
  intro: {
    fontSize: 15,
    lineHeight: 23,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  block: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 6,
  },
  blockText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  footer: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSoft,
    textAlign: "center",
  },
});
