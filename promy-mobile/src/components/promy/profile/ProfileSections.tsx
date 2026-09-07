import React from "react";
import {
  Pressable,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import PromoLogo from "../PromoLogo";
import { theme } from "../../../styles/theme";
import type { ApiRedemption, AuthUser } from "../../../types/api";

const GENDER_OPTIONS = [
  { value: "WOMAN", label: "Mujer" },
  { value: "MAN", label: "Hombre" },
  { value: "NON_BINARY", label: "No binario" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefiero no decirlo" },
  { value: "OTHER", label: "Otro" },
] as const;

function formatBirthDateLabel(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-AR");
}

function getGenderLabel(value?: string | null) {
  return GENDER_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

function getProfileCompletion(user?: AuthUser | null) {
  const checks = [
    { key: "phone", label: "Teléfono", done: Boolean(user?.phone?.trim()) },
    { key: "birthDate", label: "Fecha de nacimiento", done: Boolean(user?.birthDate) },
    { key: "country", label: "País", done: Boolean(user?.country?.trim()) },
    { key: "gender", label: "Género", done: Boolean(user?.gender?.trim()) },
    { key: "emailVerifiedAt", label: "Email verificado", done: Boolean(user?.emailVerifiedAt) },
  ];

  const completed = checks.filter((item) => item.done).length;
  const total = checks.length;
  const percentage = Math.round((completed / total) * 100);
  const missing = checks.filter((item) => !item.done).map((item) => item.label);

  return { completed, total, percentage, missing };
}

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

export function ProfileCompletionCard({
  user,
  onPress,
}: {
  user?: AuthUser | null;
  onPress: () => void;
}) {
  const completion = getProfileCompletion(user);
  const isComplete = completion.completed === completion.total;

  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.completionCard} onPress={onPress}>
      <View style={styles.completionTopRow}>
        <View style={styles.completionPill}>
          <Feather
            name={isComplete ? "check-circle" : "user-plus"}
            size={11}
            color={isComplete ? theme.colors.success : theme.colors.text}
          />
          <Text
            style={[
              styles.completionPillText,
              isComplete ? styles.completionPillTextSuccess : null,
            ]}
          >
            {isComplete ? "Perfil al día" : "Completar perfil"}
          </Text>
        </View>
        <Text style={styles.completionPercent}>{completion.percentage}%</Text>
      </View>

      <Text style={styles.completionTitle}>
        {isComplete
          ? "Tu cuenta ya tiene todo lo necesario para una experiencia más personalizada."
          : "Sumá algunos datos para que PROMY te acompañe mejor en próximos beneficios y recordatorios."}
      </Text>

      <View style={styles.completionTrack}>
        <View style={[styles.completionProgress, { width: `${completion.percentage}%` }]} />
      </View>

      <View style={styles.completionFooter}>
        <Text style={styles.completionHint}>
          {isComplete
            ? "Ya cargaste teléfono, nacimiento, país, género y validaste tu email."
            : `Te falta: ${completion.missing.slice(0, 3).join(", ")}${
                completion.missing.length > 3 ? "..." : ""
              }`}
        </Text>
        <View style={styles.completionCta}>
          <Text style={styles.completionCtaText}>
            {isComplete ? "Revisar" : "Completar"}
          </Text>
          <Feather name="chevron-right" size={15} color={theme.colors.accentRed} />
        </View>
      </View>
    </TouchableOpacity>
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
              {new Date(item.createdAt).toLocaleDateString("es-AR")} - {item.commerce?.name || "Comercio adherido"}
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
  onDeleteAccountPress,
  pushEnabled = false,
  pushBusy = false,
  onPushToggle,
  deletingAccount = false,
}: {
  onTermsPress?: () => void;
  onPrivacyPress?: () => void;
  onDeleteAccountPress?: () => void;
  pushEnabled?: boolean;
  pushBusy?: boolean;
  onPushToggle?: (nextValue: boolean) => void;
  deletingAccount?: boolean;
}) {
  return (
    <View style={styles.settingsCard}>
      <SettingsRow
        icon={<Feather name="settings" size={15} color={theme.colors.text} />}
        label="Ajustes de la app"
        sub="Idioma, datos, apariencia"
      />
      <SettingsRow
        icon={<Feather name="shield" size={15} color={theme.colors.text} />}
        label="Privacidad y seguridad"
        sub="Datos personales, contrasena, verificacion"
        onPress={onPrivacyPress}
      />
      <SettingsToggleRow
        icon={<Feather name="bell" size={15} color={theme.colors.text} />}
        label="Notificaciones push"
        sub={
          pushEnabled
            ? "Avisos activos para validaciones y novedades clave"
            : "Activalas para enterarte cuando una promo se valida"
        }
        value={pushEnabled}
        disabled={pushBusy}
        onChange={onPushToggle}
      />
      <SettingsRow
        icon={<Feather name="help-circle" size={15} color={theme.colors.text} />}
        label="Soporte"
        sub="Ayuda y contacto del equipo"
      />
      <SettingsRow
        icon={<Feather name="file-text" size={15} color={theme.colors.text} />}
        label="Terminos y condiciones"
        sub="Ultima version - abril 2026"
        onPress={onTermsPress}
        divider={Boolean(onDeleteAccountPress)}
      />
      {onDeleteAccountPress ? (
        <SettingsRow
          icon={<Feather name="trash-2" size={15} color={theme.colors.accentRed} />}
          label={deletingAccount ? "Eliminando cuenta..." : "Eliminar cuenta"}
          sub="Borra tu cuenta, tus sesiones y el historial asociado"
          onPress={deletingAccount ? undefined : onDeleteAccountPress}
          destructive
          divider={false}
        />
      ) : null}
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


export function ProfileAccountSummaryCard({
  user,
  onPress,
}: {
  user?: AuthUser | null;
  onPress: () => void;
}) {
  const phoneLabel = user?.phone ? user.phone : "Sin telefono cargado";
  const birthDateLabel = formatBirthDateLabel(user?.birthDate);
  const countryLabel = user?.country?.trim() || null;
  const genderLabel = getGenderLabel(user?.gender);
  const metaBits = [birthDateLabel, countryLabel, genderLabel].filter(Boolean);

  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.summaryCard} onPress={onPress}>
      <View style={styles.summaryIcon}>
        <Feather name="user" size={18} color={theme.colors.text} />
      </View>
      <View style={styles.summaryTextWrap}>
        <Text style={styles.summaryTitle}>Datos basicos</Text>
        <Text style={styles.summaryText} numberOfLines={1}>
          {user?.fullName || "Usuario PROMY"}
        </Text>
        <Text style={styles.summarySub} numberOfLines={1}>
          {phoneLabel}
        </Text>
        {metaBits.length > 0 ? (
          <Text style={styles.summarySub} numberOfLines={1}>
            {metaBits.join(" · ")}
          </Text>
        ) : (
          <Text style={styles.summarySub} numberOfLines={1}>
            Sumá fecha, país y género para completar tu perfil
          </Text>
        )}
      </View>
      <View style={styles.summaryCta}>
        <Text style={styles.summaryCtaText}>Editar</Text>
        <Feather name="chevron-right" size={15} color={theme.colors.accentRed} />
      </View>
    </TouchableOpacity>
  );
}

export function ProfileSecuritySummaryCard({
  emailVerified,
  onPress,
}: {
  emailVerified?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.summaryCard} onPress={onPress}>
      <View style={styles.summaryIcon}>
        <Feather name="shield" size={18} color={theme.colors.text} />
      </View>
      <View style={styles.summaryTextWrap}>
        <Text style={styles.summaryTitle}>Seguridad de la cuenta</Text>
        <Text style={styles.summaryText} numberOfLines={1}>
          Contrasena, email y privacidad
        </Text>
        <Text style={[styles.summarySub, emailVerified ? styles.summarySubSuccess : null]} numberOfLines={1}>
          {emailVerified ? "Email verificado" : "Email pendiente de verificacion"}
        </Text>
      </View>
      <View style={styles.summaryCta}>
        <Text style={styles.summaryCtaText}>Gestionar</Text>
        <Feather name="chevron-right" size={15} color={theme.colors.accentRed} />
      </View>
    </TouchableOpacity>
  );
}

export function ProfileEditableAccountCard({
  fullName,
  phone,
  birthDateLabel,
  country,
  countryLabel,
  genderLabel,
  saving,
  onFullNameChange,
  onPhoneChange,
  onOpenBirthPicker,
  onOpenCountryPicker,
  onOpenGenderPicker,
  onSave,
}: {
  fullName: string;
  phone: string;
  birthDateLabel: string;
  country: string;
  countryLabel: string;
  genderLabel: string;
  saving?: boolean;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onOpenBirthPicker: () => void;
  onOpenCountryPicker: () => void;
  onOpenGenderPicker: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.editorCard}>
      <Text style={styles.editorTitle}>Datos basicos</Text>
      <Text style={styles.editorSub}>
        Mantene actualizado tu nombre, tu fecha de nacimiento y algunos datos utiles para personalizar tu experiencia.
      </Text>

      <View style={styles.editorField}>
        <Text style={styles.editorLabel}>Nombre completo</Text>
        <TextInput
          value={fullName}
          onChangeText={onFullNameChange}
          placeholder="Tu nombre"
          style={styles.editorInput}
          placeholderTextColor={theme.colors.textSoft}
        />
      </View>

      <View style={styles.editorField}>
        <Text style={styles.editorLabel}>Telefono</Text>
        <TextInput
          value={phone}
          onChangeText={onPhoneChange}
          placeholder="Opcional"
          style={styles.editorInput}
          placeholderTextColor={theme.colors.textSoft}
          keyboardType="phone-pad"
        />
      </View>

        <View style={styles.editorField}>
          <Text style={styles.editorLabel}>Fecha de nacimiento</Text>
          <Pressable style={styles.selectorField} onPress={onOpenBirthPicker}>
            <View style={styles.selectorTextWrap}>
              <Text style={styles.selectorValue}>
                {birthDateLabel || "Elegi tu fecha de nacimiento"}
              </Text>
              <Text style={styles.selectorHint}>
                Nos sirve para saludos y futuras experiencias especiales.
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.colors.textSoft} />
          </Pressable>
        </View>

        <View style={styles.editorField}>
          <Text style={styles.editorLabel}>Pais</Text>
          <Pressable style={styles.selectorField} onPress={onOpenCountryPicker}>
            <View style={styles.selectorTextWrap}>
              <Text style={styles.selectorValue}>{countryLabel || "Selecciona tu pais"}</Text>
              <Text style={styles.selectorHint}>
                {country ? "Puedes cambiarlo cuando quieras." : "Ayuda a personalizar tu cuenta."}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.colors.textSoft} />
          </Pressable>
        </View>

        <View style={styles.editorField}>
          <Text style={styles.editorLabel}>Genero</Text>
          <Pressable style={styles.selectorField} onPress={onOpenGenderPicker}>
            <View style={styles.selectorTextWrap}>
              <Text style={styles.selectorValue}>{genderLabel || "Selecciona tu genero"}</Text>
              <Text style={styles.selectorHint}>
                Elige la opcion con la que te sientas mas comodo.
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.colors.textSoft} />
          </Pressable>
        </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.editorButton, saving && styles.editorButtonDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={styles.editorButtonText}>{saving ? "Guardando..." : "Guardar datos"}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ProfilePasswordCard({
  currentPassword,
  nextPassword,
  saving,
  onCurrentPasswordChange,
  onNextPasswordChange,
  onSave,
}: {
  currentPassword: string;
  nextPassword: string;
  saving?: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNextPasswordChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.editorCard}>
      <Text style={styles.editorTitle}>Seguridad de la cuenta</Text>
      <Text style={styles.editorSub}>
        Cambia tu contrasena desde una sesion autenticada sin salir de la app.
      </Text>

      <View style={styles.editorField}>
        <Text style={styles.editorLabel}>Contrasena actual</Text>
        <TextInput
          value={currentPassword}
          onChangeText={onCurrentPasswordChange}
          placeholder="Tu contrasena actual"
          style={styles.editorInput}
          placeholderTextColor={theme.colors.textSoft}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <View style={styles.editorField}>
        <Text style={styles.editorLabel}>Nueva contrasena</Text>
        <TextInput
          value={nextPassword}
          onChangeText={onNextPasswordChange}
          placeholder="Nueva contrasena"
          style={styles.editorInput}
          placeholderTextColor={theme.colors.textSoft}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.editorButton, saving && styles.editorButtonDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={styles.editorButtonText}>
          {saving ? "Actualizando..." : "Cambiar contrasena"}
        </Text>
      </TouchableOpacity>
    </View>
  );
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
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
  destructive?: boolean;
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
          <Text style={[styles.settingsLabel, destructive ? styles.settingsLabelDestructive : null]}>
            {label}
          </Text>
          {sub ? (
            <Text style={[styles.settingsSub, destructive ? styles.settingsSubDestructive : null]}>
              {sub}
            </Text>
          ) : null}
        </View>
        {trailing ||
          (onPress ? (
            <Feather
              name="chevron-right"
              size={15}
              color={destructive ? theme.colors.accentRed : theme.colors.textSoft}
            />
          ) : null)}
      </RowContainer>
      {divider ? <View style={styles.settingsDivider} /> : null}
    </View>
  );
}

function SettingsToggleRow({
  icon,
  label,
  sub,
  value,
  disabled = false,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  value: boolean;
  disabled?: boolean;
  onChange?: (nextValue: boolean) => void;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsIcon}>{icon}</View>
      <View style={styles.settingsTextWrap}>
        <Text style={styles.settingsLabel}>{label}</Text>
        <Text style={styles.settingsSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: "#D9D4CB", true: theme.colors.primary }}
        thumbColor="#FFFFFF"
        style={styles.settingsSwitch}
      />
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    minHeight: 118,
    ...theme.shadow.soft,
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
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    borderColor: "rgba(240,223,192,0.72)",
    overflow: "hidden",
  },
  settingsRow: {
    minHeight: 62,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "rgba(255,243,222,0.82)",
    borderWidth: 1,
    borderColor: "rgba(240,223,192,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsTextWrap: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.18,
  },
  settingsLabelDestructive: {
    color: theme.colors.accentRed,
  },
  settingsSub: {
    marginTop: 1,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  settingsSubDestructive: {
    color: "#B34A4A",
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
    backgroundColor: "rgba(240,223,192,0.74)",
  },
  settingsSwitch: {
    transform: [{ scaleX: 0.86 }, { scaleY: 0.86 }],
  },
  summaryCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...theme.shadow.soft,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextWrap: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  summaryText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  summarySub: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSoft,
  },
  summarySubSuccess: {
    color: theme.colors.success,
  },
  summaryCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  summaryCtaText: {
    fontSize: 11.5,
    fontWeight: "900",
    color: theme.colors.accentRed,
  },
  completionCard: {
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 12,
    ...theme.shadow.soft,
  },
  completionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  completionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  completionPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  completionPillTextSuccess: {
    color: theme.colors.success,
  },
  completionPercent: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.6,
  },
  completionTitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    color: theme.colors.text,
  },
  completionTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
  },
  completionProgress: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  completionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  completionHint: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  completionCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  completionCtaText: {
    fontSize: 11.5,
    fontWeight: "900",
    color: theme.colors.accentRed,
  },
  editorCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 14,
  },
  editorTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
  },
  editorSub: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textMuted,
  },
  editorField: {
    gap: 8,
  },
  editorLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  editorInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  selectorField: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectorTextWrap: {
    flex: 1,
    gap: 4,
  },
  selectorValue: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  selectorHint: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  editorButton: {
    backgroundColor: theme.colors.headerDark,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
  },
  editorButtonDisabled: {
    opacity: 0.7,
  },
  editorButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
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
