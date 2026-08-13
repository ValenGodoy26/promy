import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import PromoLogo from "../PromoLogo";
import { theme } from "../../../styles/theme";
import type { ApiRedemption, AuthUser } from "../../../types/api";

export function ProfileHeader({
  user,
  onFavoritesPress,
  onRedemptionsPress,
}: {
  user?: AuthUser | null;
  onFavoritesPress: () => void;
  onRedemptionsPress: () => void;
}) {
  return (
    <SafeAreaView edges={["top"]} style={styles.header}>
      <View style={styles.headerGlowYellow} />
      <View style={styles.headerGlowRed} />

      <View style={styles.headerTopRow}>
        <Text style={styles.headerEyebrow}>Mi cuenta</Text>
        <View style={styles.headerStatusBadge}>
          <Feather
            name={user?.emailVerifiedAt ? "check-circle" : "mail"}
            size={13}
            color="rgba(255,255,255,0.85)"
          />
          <Text style={styles.headerStatusText}>
            {user?.emailVerifiedAt ? "Verificada" : "Pendiente"}
          </Text>
        </View>
      </View>

      <View style={styles.profileRow}>
        <View style={styles.avatarOuter}>
          <View style={styles.avatarShell}>
            <PromoLogo size="lg" />
          </View>
          <View style={styles.verifiedDot}>
            <Feather name="check" size={10} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.profileMeta}>
          <Text style={styles.name}>{user?.fullName || "Usuario PROMY"}</Text>
          <Text style={styles.email}>{user?.email || "Tu cuenta PROMY"}</Text>
          <View style={styles.memberPill}>
            <Feather name="star" size={10} color={theme.colors.primary} />
            <Text style={styles.memberPillText}>
              {user?.emailVerifiedAt ? "Email verificado" : "Verificacion pendiente"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.headerActionRow}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.secondaryHeaderButton}
          onPress={onFavoritesPress}
        >
          <Feather name="heart" size={13} color="#FFFFFF" />
          <Text style={styles.secondaryHeaderButtonText}>Favoritos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryHeaderButton}
          onPress={onRedemptionsPress}
        >
          <Feather name="tag" size={13} color={theme.colors.text} />
          <Text style={styles.primaryHeaderButtonText}>Mis canjes</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export function ProfileActivitySummary({
  successCount,
  currentPeriodLabel,
  monthlyCount,
  favoritesCount,
  lastRedemptionDate,
  onViewDetail,
}: {
  successCount: number;
  currentPeriodLabel: string;
  monthlyCount: number;
  favoritesCount: number;
  lastRedemptionDate: string | null;
  onViewDetail: () => void;
}) {
  return (
    <View style={styles.savingsCard}>
      <View style={styles.savingsTopRow}>
        <View style={styles.savingsPill}>
          <Feather name="activity" size={11} color={theme.colors.text} />
          <Text style={styles.savingsPillText}>Tu actividad</Text>
        </View>
        <Text style={styles.savingsMonth}>{currentPeriodLabel}</Text>
      </View>

      <View style={styles.savingsBody}>
        <Text style={styles.savingsValue}>{successCount.toLocaleString("es-AR")}</Text>
      </View>

      <Text style={styles.savingsLabel}>Canjes exitosos acumulados en tu cuenta</Text>

      <View style={styles.savingsTrendPill}>
        <Feather
          name={monthlyCount > 0 ? "check-circle" : "clock"}
          size={10}
          color={monthlyCount > 0 ? theme.colors.success : theme.colors.text}
        />
        <Text style={styles.savingsTrendText}>
          {monthlyCount > 0
            ? `${monthlyCount} canjes realizados este mes`
            : "Todavía no registras canjes este mes"}
        </Text>
      </View>

      <View style={styles.goalRow}>
        <Text style={styles.goalLabel}>Favoritos guardados</Text>
        <Text style={styles.goalLabel}>{favoritesCount}</Text>
      </View>


      <View style={styles.savingsFooter}>
        <Text style={styles.savingsFooterText}>
          {lastRedemptionDate
            ? `Ultimo canje validado: ${lastRedemptionDate}`
            : "Tu historial se va a actualizar cuando valides tu primera promo"}
        </Text>
        <TouchableOpacity activeOpacity={0.85} onPress={onViewDetail}>
          <Text style={styles.savingsFooterLink}>Ver detalle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ProfileMiniStats({
  monthlyCount,
  favoritesCount,
  successCount,
}: {
  monthlyCount: number;
  favoritesCount: number;
  successCount: number;
}) {
  return (
    <View style={styles.statsRow}>
      <MiniStat
        value={monthlyCount}
        label="Canjes este mes"
        icon={
          <MaterialCommunityIcons
            name="ticket-percent-outline"
            size={16}
            color={theme.colors.accentRed}
          />
        }
        accentBg="#FFE8E8"
      />
      <MiniStat
        value={favoritesCount}
        label="Favoritos"
        icon={<Feather name="heart" size={16} color={theme.colors.accentRed} />}
        accentBg="#FFE8E8"
      />
      <MiniStat
        value={successCount}
        label="Promos usadas"
        icon={<Feather name="star" size={16} color="#B78A00" />}
        accentBg={theme.colors.surfaceAlt}
      />
    </View>
  );
}

export function ProfileSectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity activeOpacity={0.85} onPress={onAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ProfileQuickActions({
  monthlyCount,
  favoritesCount,
  successCount,
  onRedemptionsPress,
  onFavoritesPress,
  onExplorePress,
  onMapPress,
}: {
  monthlyCount: number;
  favoritesCount: number;
  successCount: number;
  onRedemptionsPress: () => void;
  onFavoritesPress: () => void;
  onExplorePress: () => void;
  onMapPress: () => void;
}) {
  return (
    <View style={styles.quickGrid}>
      <QuickCard
        label="Mis canjes"
        sub={`${successCount} activos`}
        ribbon={monthlyCount > 0 ? `${monthlyCount} nuevos` : undefined}
        bg={theme.colors.primary}
        icon={
          <MaterialCommunityIcons
            name="ticket-percent-outline"
            size={20}
            color={theme.colors.accentRed}
          />
        }
        onPress={onRedemptionsPress}
      />
      <QuickCard
        label="Favoritos"
        sub={`${favoritesCount} guardados`}
        bg={theme.colors.surfaceWarm}
        icon={<Feather name="heart" size={19} color={theme.colors.accentRed} />}
        onPress={onFavoritesPress}
      />
      <QuickCard
        label="Explorar"
        sub="Promos y locales"
        bg="#FFF8EA"
        icon={<Feather name="search" size={19} color={theme.colors.text} />}
        onPress={onExplorePress}
      />
      <QuickCard
        label="Mapa"
        sub="Cerca tuyo"
        bg="#FFFFFF"
        icon={<Feather name="map-pin" size={19} color={theme.colors.text} />}
        onPress={onMapPress}
      />
    </View>
  );
}

export function ProfileRecentActivity({
  redemptions,
  onPromotionPress,
}: {
  redemptions: ApiRedemption[];
  onPromotionPress: (promotionId: number) => void;
}) {
  return (
    <View style={styles.activityList}>
      {redemptions.slice(0, 3).map((item) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.92}
          style={styles.activityCard}
          onPress={() => onPromotionPress(item.promotion.id)}
        >
          <View style={styles.activityIconWrap}>
            <Feather name="check" size={10} color="#FFFFFF" />
          </View>
          <View style={styles.activityContent}>
            <View style={styles.activityStorePill}>
              <Text style={styles.activityStorePillText}>
                {item.commerce?.name || "Local adherido"}
              </Text>
            </View>
            <Text style={styles.activityTitle} numberOfLines={1}>
              {item.promotion.title}
            </Text>
            <Text style={styles.activityDate}>
              {new Date(item.createdAt).toLocaleDateString("es-AR")} - Canje exitoso
            </Text>
          </View>
          <View style={styles.activitySavings}>
            <Text style={styles.activitySavingsPct}>
              {item.validationMethod === "QR" ? "QR" : "CODIGO"}
            </Text>
            <Text style={styles.activitySavingsAmount}>Validado</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ProfileSettingsCard({
  onTermsPress,
  onPrivacyPress,
}: {
  onTermsPress?: () => void;
  onPrivacyPress?: () => void;
}) {
  return (
    <View style={styles.settingsCard}>
      <SettingsRow
        icon={<Feather name="settings" size={17} color={theme.colors.text} />}
        label="Ajustes de la app"
        sub="Idioma, datos, apariencia"
      />
      <SettingsRow
        icon={<Feather name="shield" size={17} color={theme.colors.text} />}
        label="Privacidad y seguridad"
        sub="Datos personales, contrasena, verificacion"
        onPress={onPrivacyPress}
      />
      <SettingsRow
        icon={<Feather name="help-circle" size={17} color={theme.colors.text} />}
        label="Soporte"
        sub="Ayuda y contacto del equipo"
      />
      <SettingsRow
        icon={<Feather name="file-text" size={17} color={theme.colors.text} />}
        label="Terminos y condiciones"
        sub="Ultima version - abril 2026"
        onPress={onTermsPress}
        divider={false}
      />
    </View>
  );
}

export function ProfileLogoutButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.logoutButton} onPress={onPress}>
      <Feather name="log-out" size={15} color={theme.colors.accentRed} />
      <Text style={styles.logoutButtonText}>Cerrar sesion</Text>
    </TouchableOpacity>
  );
}

export function ProfileFooter() {
  return <Text style={styles.footerBrand}>PROMY - Promociones reales cerca tuyo.</Text>;
}

function MiniStat({
  value,
  label,
  icon,
  accentBg,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  accentBg: string;
}) {
  return (
    <View style={styles.miniStatCard}>
      <View style={[styles.miniStatIcon, { backgroundColor: accentBg }]}>{icon}</View>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function QuickCard({
  label,
  sub,
  icon,
  bg,
  ribbon,
  onPress,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  bg: string;
  ribbon?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.quickCard, { backgroundColor: bg }]}
      onPress={onPress}
    >
      {ribbon ? (
        <View style={styles.quickRibbon}>
          <Text style={styles.quickRibbonText}>{ribbon}</Text>
        </View>
      ) : null}
      <View style={styles.quickIcon}>{icon}</View>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

function SettingsRow({
  icon,
  label,
  sub,
  trailing,
  onPress,
  divider = true,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
}) {
  const RowContainer = onPress ? TouchableOpacity : View;
  return (
    <View>
      <RowContainer
        style={styles.settingsRow}
        {...(onPress ? { activeOpacity: 0.85, onPress } : {})}
      >
        <View style={styles.settingsIcon}>{icon}</View>
        <View style={styles.settingsTextWrap}>
          <Text style={styles.settingsLabel}>{label}</Text>
          {sub ? <Text style={styles.settingsSub}>{sub}</Text> : null}
        </View>
        {trailing || (onPress ? <Feather name="chevron-right" size={17} color={theme.colors.textSoft} /> : null)}
      </RowContainer>
      {divider ? <View style={styles.settingsDivider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.headerDark,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  headerGlowYellow: {
    position: "absolute",
    left: -50,
    top: -40,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(255,191,0,0.24)",
  },
  headerGlowRed: {
    position: "absolute",
    right: -60,
    top: 90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,49,49,0.18)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    color: "rgba(255,255,255,0.62)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerStatusBadge: {
    minHeight: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
  },
  profileRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarOuter: {
    position: "relative",
  },
  avatarShell: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.headerDark,
    alignItems: "center",
    justifyContent: "center",
  },
  profileMeta: {
    flex: 1,
  },
  name: {
    fontSize: 23,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.7,
    lineHeight: 25,
  },
  email: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: "600",
    color: "rgba(255,255,255,0.66)",
  },
  memberPill: {
    marginTop: 9,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,191,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,191,0,0.28)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  memberPillText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerActionRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  secondaryHeaderButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryHeaderButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  primaryHeaderButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  primaryHeaderButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  savingsCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    overflow: "hidden",
    ...theme.shadow.strong,
  },
  savingsTopRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  savingsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savingsPillText: {
    color: theme.colors.text,
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  savingsMonth: {
    color: theme.colors.textMuted,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  savingsBody: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  savingsValue: {
    fontSize: 40,
    lineHeight: 42,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -1.6,
  },
  savingsLabel: {
    paddingHorizontal: 16,
    marginTop: 6,
    fontSize: 12.5,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  savingsTrendPill: {
    marginTop: 10,
    marginHorizontal: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "rgba(36,168,101,0.12)",
    borderWidth: 1,
    borderColor: "rgba(36,168,101,0.28)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savingsTrendText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#1B7A49",
  },
  goalRow: {
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.text,
  },
  goalTrack: {
    marginHorizontal: 16,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    overflow: "hidden",
  },
  goalProgress: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRightWidth: 1.5,
    borderRightColor: theme.colors.text,
  },
  savingsFooter: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(17,17,17,0.18)",
    backgroundColor: theme.colors.surfaceWarm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  savingsFooterText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.text,
  },
  savingsFooterLink: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: "900",
    color: theme.colors.accentRed,
  },
  statsRow: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: "row",
    gap: 8,
  },
  miniStatCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  miniStatIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  miniStatValue: {
    fontSize: 20,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.7,
  },
  miniStatLabel: {
    marginTop: 2,
    fontSize: 10.5,
    lineHeight: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.accentRed,
  },
  quickGrid: {
    paddingHorizontal: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  quickCard: {
    width: "48.5%",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    padding: 14,
    minHeight: 126,
    ...theme.shadow.card,
  },
  quickRibbon: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.accentRed,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  quickRibbonText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickLabel: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  quickSub: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: "700",
    color: "rgba(17,17,17,0.58)",
  },
  activityList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activityIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityStorePill: {
    alignSelf: "flex-start",
    borderRadius: 5,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  activityStorePillText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#8A5A2A",
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  activityDate: {
    marginTop: 3,
    fontSize: 10.5,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  activitySavings: {
    alignItems: "flex-end",
    gap: 4,
  },
  activitySavingsPct: {
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: theme.colors.text,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.text,
  },
  activitySavingsAmount: {
    fontSize: 10.5,
    fontWeight: "900",
    color: theme.colors.success,
  },
  settingsCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  settingsRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsTextWrap: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 13.5,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  settingsSub: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  settingsDivider: {
    height: 1,
    marginLeft: 62,
    backgroundColor: theme.colors.border,
  },
  logoutButton: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(255,49,49,0.28)",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  logoutButtonText: {
    color: theme.colors.accentRed,
    fontSize: 13.5,
    fontWeight: "900",
  },
  footerBrand: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 10.5,
    fontWeight: "700",
    color: theme.colors.textMuted,
    letterSpacing: 0.2,
  },
});
