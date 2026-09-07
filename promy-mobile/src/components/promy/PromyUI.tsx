/**
 * PromyUI - componentes visuales compartidos.
 *
 * Todas las pantallas de PROMY usan estos building blocks para mantener
 * la consistencia del diseño. Si algo se repite en 3+ pantallas, vive acá.
 */
import React, { ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../styles/theme";
import PromoLogo from "./PromoLogo";

// ─────────────────────────────────────────────────────────────
// ScreenHeader — header oscuro con back / título / acción derecha
// Uso: en todas las pantallas "internas" con stack nav (Detalles, Mis canjes, Favoritos).
// ─────────────────────────────────────────────────────────────
export function ScreenHeader({
  title,
  onBack,
  rightIcon,
  onRightPress,
  showBack = true,
}: {
  title: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightPress?: () => void;
  showBack?: boolean;
}) {
  return (
    <SafeAreaView edges={["top"]} style={headerStyles.safe}>
      <View style={headerStyles.row}>
        {showBack ? (
          <TouchableOpacity
            activeOpacity={0.85}
            style={headerStyles.iconButton}
            onPress={onBack}
          >
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={headerStyles.iconButton} />
        )}

        <Text style={headerStyles.title} numberOfLines={1}>
          {title}
        </Text>

        {rightIcon ? (
          <TouchableOpacity
            activeOpacity={0.85}
            style={headerStyles.iconButton}
            onPress={onRightPress}
          >
            <Feather name={rightIcon} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={headerStyles.iconButton} />
        )}
      </View>
    </SafeAreaView>
  );
}

const headerStyles = StyleSheet.create({
  safe: {
    backgroundColor: theme.colors.headerDark,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.dividerOnDark,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
    flex: 1,
    textAlign: "center",
  },
});

// ─────────────────────────────────────────────────────────────
// SectionHeader — título de sección con acción opcional a la derecha
// ─────────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  emoji,
  actionLabel,
  onAction,
  compact = false,
}: {
  title: string;
  emoji?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[sectionStyles.row, compact && { marginTop: 16, marginBottom: 8 }]}>
      <View style={sectionStyles.titleRow}>
        <Text style={sectionStyles.title}>{title}</Text>
        {emoji ? <Text style={sectionStyles.emoji}>{emoji}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity activeOpacity={0.85} onPress={onAction}>
          <Text style={sectionStyles.action}>{actionLabel} →</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  emoji: { fontSize: 16 },
  action: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.accentRed,
  },
});

// ─────────────────────────────────────────────────────────────
// BadgePill — badge visual: descuento, hot, new, etc.
// ─────────────────────────────────────────────────────────────
export function BadgePill({
  label,
  variant = "red",
  size = "md",
}: {
  label: string;
  variant?: "red" | "yellow" | "dark" | "success" | "ghost";
  size?: "sm" | "md";
}) {
  const variantStyle = badgeVariants[variant];
  const sizeStyle = size === "sm" ? badgeStyles.sm : badgeStyles.md;

  return (
    <View style={[badgeStyles.base, variantStyle.container, sizeStyle]}>
      <Text style={[badgeStyles.label, variantStyle.label, size === "sm" && { fontSize: 10 }]}>
        {label}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  label: {
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.2,
  },
});

const badgeVariants = {
  red: {
    container: { backgroundColor: theme.colors.accentRed } as ViewStyle,
    label: { color: "#FFFFFF" } as TextStyle,
  },
  yellow: {
    container: { backgroundColor: theme.colors.primary } as ViewStyle,
    label: { color: "#111111" } as TextStyle,
  },
  dark: {
    container: { backgroundColor: theme.colors.headerDark } as ViewStyle,
    label: { color: theme.colors.primary } as TextStyle,
  },
  success: {
    container: { backgroundColor: theme.colors.successSoft } as ViewStyle,
    label: { color: theme.colors.success } as TextStyle,
  },
  ghost: {
    container: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    } as ViewStyle,
    label: { color: theme.colors.text } as TextStyle,
  },
};

// ─────────────────────────────────────────────────────────────
// ChipRow — chips de filtro (activos / inactivos)
// ─────────────────────────────────────────────────────────────
export function FilterChipsRow<T extends string | number>({
  options,
  active,
  onChange,
  paddingHorizontal = 20,
}: {
  options: Array<{ id: T; label: string; icon?: keyof typeof Feather.glyphMap }>;
  active: T;
  onChange: (id: T) => void;
  paddingHorizontal?: number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 7,
        paddingHorizontal,
        paddingVertical: 2,
        flexWrap: "nowrap",
      }}
    >
      {options.map((opt) => {
        const isActive = opt.id === active;
        return (
          <TouchableOpacity
            key={String(opt.id)}
            activeOpacity={0.88}
            onPress={() => onChange(opt.id)}
            style={[chipStyles.base, isActive ? chipStyles.active : chipStyles.inactive]}
          >
            {opt.icon ? (
              <Feather
                name={opt.icon}
                size={12}
                color={isActive ? "#111111" : theme.colors.textMuted}
              />
            ) : null}
            <Text style={[chipStyles.label, isActive ? chipStyles.labelActive : chipStyles.labelInactive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  base: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  active: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  inactive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  label: {
    fontSize: 12.2,
    fontWeight: "800",
  },
  labelActive: { color: "#111111" },
  labelInactive: { color: theme.colors.textMuted },
});

// ─────────────────────────────────────────────────────────────
// PrimaryButton / SecondaryButton / GhostButton
// ─────────────────────────────────────────────────────────────
type ButtonProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  iconRight?: keyof typeof Feather.glyphMap;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
  iconRight,
  fullWidth,
  style,
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={loading || disabled}
      onPress={onPress}
      style={[
        btnStyles.primary,
        fullWidth && { alignSelf: "stretch" },
        disabled && btnStyles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <>
          {icon ? <Feather name={icon} size={16} color="#FFFFFF" /> : null}
          <Text style={btnStyles.primaryLabel}>{label}</Text>
          {iconRight ? <Feather name={iconRight} size={16} color="#FFFFFF" /> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
  iconRight,
  fullWidth,
  style,
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={loading || disabled}
      onPress={onPress}
      style={[
        btnStyles.secondary,
        fullWidth && { alignSelf: "stretch" },
        disabled && btnStyles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primary} size="small" />
      ) : (
        <>
          {icon ? <Feather name={icon} size={16} color={theme.colors.primary} /> : null}
          <Text style={btnStyles.secondaryLabel}>{label}</Text>
          {iconRight ? <Feather name={iconRight} size={16} color={theme.colors.primary} /> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

export function GhostButton({
  label,
  onPress,
  icon,
  iconRight,
  fullWidth,
  style,
}: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[btnStyles.ghost, fullWidth && { alignSelf: "stretch" }, style]}
    >
      {icon ? <Feather name={icon} size={15} color={theme.colors.text} /> : null}
      <Text style={btnStyles.ghostLabel}>{label}</Text>
      {iconRight ? <Feather name={iconRight} size={15} color={theme.colors.text} /> : null}
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.accentRed,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  secondary: {
    backgroundColor: theme.colors.headerDark,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
  },
  secondaryLabel: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "900",
  },
  ghost: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  ghostLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.5,
  },
});

// ─────────────────────────────────────────────────────────────
// LoadingState / ErrorState / EmptyState
// ─────────────────────────────────────────────────────────────
export function LoadingState({ label = "Cargando..." }: { label?: string }) {
  return (
    <View style={stateStyles.loadingWrap}>
      <ActivityIndicator color={theme.colors.accentRed} />
      <Text style={stateStyles.loadingText}>{label}</Text>
    </View>
  );
}

export function SkeletonBlock({
  width = "100%",
  height = 16,
  radius = 12,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = React.useRef(new Animated.Value(0.55)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        stateStyles.skeletonBlock,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export function ErrorState({
  title,
  message,
  hint,
  onRetry,
}: {
  title: string;
  message: string;
  hint?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={stateStyles.errorCard}>
      <Text style={stateStyles.errorTitle}>{title}</Text>
      <Text style={stateStyles.errorText}>{message}</Text>
      {hint ? <Text style={stateStyles.errorHint} numberOfLines={2}>{hint}</Text> : null}
      {onRetry ? (
        <TouchableOpacity style={stateStyles.retryBtn} activeOpacity={0.9} onPress={onRetry}>
          <Text style={stateStyles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  children,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={stateStyles.emptyCard}>
      {icon ? (
        <View style={stateStyles.emptyIcon}>{icon}</View>
      ) : (
        <View style={stateStyles.emptyLogoIcon}>
          <PromoLogo size="md" />
        </View>
      )}
      <Text style={stateStyles.emptyTitle}>{title}</Text>
      <Text style={stateStyles.emptyText}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          activeOpacity={0.88}
          style={stateStyles.emptyButton}
          onPress={onAction}
        >
          <Text style={stateStyles.emptyButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
      {children}
    </View>
  );
}

const stateStyles = StyleSheet.create({
  loadingWrap: { paddingVertical: 56, alignItems: "center", gap: 10 },
  loadingText: { fontSize: 13, color: theme.colors.textMuted, fontWeight: "500" },
  skeletonBlock: {
    backgroundColor: "#E9DFCF",
  },
  errorCard: {
    margin: 20,
    padding: 18,
    borderRadius: 18,
    backgroundColor: theme.colors.accentRedSoft,
    borderWidth: 1,
    borderColor: "rgba(255,49,49,0.14)",
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.accentRedDark,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  errorHint: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 12 },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.accentRed,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  retryBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
  emptyCard: {
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 22,
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.2,
    borderColor: theme.colors.border,
    alignItems: "center",
    overflow: "hidden",
    ...theme.shadow.soft,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyLogoIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: theme.colors.surfaceWarm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 7,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  emptyText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: theme.colors.textMuted,
    textAlign: "center",
    maxWidth: 292,
    fontWeight: "600",
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: theme.colors.accentRed,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
  },
  emptyButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
});


// ─────────────────────────────────────────────────────────────
// BottomSafeSpacer — separa el final del scroll de la tab bar flotante.
// ─────────────────────────────────────────────────────────────
export function BottomSafeSpacer({ extra = 32 }: { extra?: number }) {
  const insets = useSafeAreaInsets();
  return <View style={{ height: 72 + Math.max(insets.bottom, 10) + extra }} />;
}

// ─────────────────────────────────────────────────────────────
// Segmented — selector tipo toggle (promos/locales, todos/usados, etc.)
// ─────────────────────────────────────────────────────────────
export function Segmented<T extends string>({
  options,
  active,
  onChange,
}: {
  options: Array<{ id: T; label: string; count?: number }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={segmentedStyles.container}>
      {options.map((opt) => {
        const isActive = opt.id === active;
        return (
          <TouchableOpacity
            key={opt.id}
            activeOpacity={0.9}
            onPress={() => onChange(opt.id)}
            style={[segmentedStyles.button, isActive && segmentedStyles.buttonActive]}
          >
            <Text
              style={[segmentedStyles.label, isActive && segmentedStyles.labelActive]}
            >
              {opt.label}
              {opt.count != null ? ` (${opt.count})` : ""}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segmentedStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 999,
    padding: 4,
    marginHorizontal: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  buttonActive: {
    backgroundColor: "#FFFFFF",
    ...theme.shadow.soft,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textMuted,
  },
  labelActive: {
    color: theme.colors.text,
  },
});
