import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import {
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AuthStackParamList, MainStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import { mobileLegalDocuments } from "./legalContent";

type Props =
  | NativeStackScreenProps<AuthStackParamList, "Legal">
  | NativeStackScreenProps<MainStackParamList, "Legal">;

export default function LegalScreen({ navigation, route }: Props) {
  const kind = route.params.kind;
  const document = mobileLegalDocuments[kind];
  const alternateKind = kind === "privacy" ? "terms" : "privacy";

  const openMail = async () => {
    await Linking.openURL(`mailto:${document.contactEmail}`).catch(() => undefined);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />

      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.88}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={18} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>{document.lawLabel}</Text>
            <Text style={styles.title}>{document.shortTitle}</Text>
          </View>

          <TouchableOpacity
            style={styles.swapButton}
            activeOpacity={0.9}
            onPress={() => (navigation as any).navigate("Legal", { kind: alternateKind })}
          >
            <Text style={styles.swapButtonText}>
              {alternateKind === "privacy" ? "Ver privacidad" : "Ver términos"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlowYellow} />
          <View style={styles.heroGlowRed} />

          <Text style={styles.heroEyebrow}>Documento legal vigente</Text>
          <Text style={styles.heroTitle}>{document.title}</Text>
          <Text style={styles.heroIntro}>{document.intro}</Text>

          <View style={styles.metaRow}>
            <MetaPill label="Actualización" value={document.updatedAt} />
            <MetaPill label="Versión" value={document.version} />
          </View>

          <TouchableOpacity style={styles.contactButton} activeOpacity={0.9} onPress={openMail}>
            <Feather name="mail" size={15} color={theme.colors.text} />
            <Text style={styles.contactButtonText}>{document.contactEmail}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryGrid}>
          {document.summary.map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionList}>
          {document.sections.map((section) => (
            <View key={`${document.kind}-${section.number}`} style={styles.sectionCard}>
              <View style={styles.sectionTop}>
                <View style={styles.sectionNumberPill}>
                  <Text style={styles.sectionNumberText}>{section.number}</Text>
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>

              {section.paragraphs?.map((paragraph) => (
                <Text key={paragraph} style={styles.sectionParagraph}>
                  {paragraph}
                </Text>
              ))}

              {section.bullets?.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Nota final</Text>
          <Text style={styles.footerText}>{document.footer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safe: {
    backgroundColor: "rgba(255, 253, 248, 0.96)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,17,17,0.06)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: theme.colors.textSoft,
  },
  title: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.8,
  },
  swapButton: {
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: theme.colors.headerDark,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  swapButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 42,
    gap: 16,
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(17,17,17,0.07)",
    padding: 22,
    ...theme.shadow.strong,
  },
  heroGlowYellow: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,191,0,0.14)",
  },
  heroGlowRed: {
    position: "absolute",
    bottom: -50,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,49,49,0.08)",
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#8A7C68",
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -1.4,
  },
  heroIntro: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 24,
    color: "#51483D",
    fontWeight: "600",
  },
  metaRow: {
    marginTop: 18,
    gap: 10,
  },
  metaPill: {
    borderRadius: 18,
    backgroundColor: "#FFF8EA",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#9A896F",
  },
  metaValue: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    fontWeight: "800",
  },
  contactButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  contactButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  summaryGrid: {
    gap: 12,
  },
  summaryCard: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.07)",
    padding: 18,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#9A896F",
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
    fontWeight: "800",
  },
  sectionList: {
    gap: 14,
  },
  sectionCard: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.07)",
    padding: 20,
    ...theme.shadow.soft,
  },
  sectionTop: {
    marginBottom: 12,
    gap: 10,
  },
  sectionNumberPill: {
    alignSelf: "flex-start",
    minWidth: 46,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    backgroundColor: theme.colors.headerDark,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumberText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 24,
    color: theme.colors.text,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  sectionParagraph: {
    fontSize: 14.5,
    lineHeight: 23,
    color: "#51483D",
    fontWeight: "600",
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.accentRed,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 23,
    color: "#51483D",
    fontWeight: "600",
  },
  footerCard: {
    borderRadius: 24,
    backgroundColor: "#FFF4D9",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
  },
  footerTitle: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#8A7C68",
  },
  footerText: {
    marginTop: 10,
    fontSize: 14.5,
    lineHeight: 23,
    color: theme.colors.text,
    fontWeight: "700",
  },
});
