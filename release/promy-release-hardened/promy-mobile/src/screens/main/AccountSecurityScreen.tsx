import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import {
  changeMyPassword,
  deleteMyAccount,
  fetchMySessions,
  revokeMyOtherSessions,
  revokeMySession,
} from "../../api/users";
import {
  BottomSafeSpacer,
  ErrorState,
  ScreenHeader,
} from "../../components/promy/PromyUI";
import {
  ProfilePasswordCard,
  ProfileSectionHeader,
} from "../../components/promy/profile/ProfileSections";
import { useAuth } from "../../context/AuthContext";
import type { MainStackParamList } from "../../navigation/types";
import { theme } from "../../styles/theme";
import type { UserSessionSummary } from "../../types/api";
import { formatAuthError } from "../../utils/promy";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatSessionDate(value?: string | null) {
  if (!value) return "Sin registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/**
 * Elige el ícono correcto según el texto del deviceLabel del servidor.
 * El servidor produce: "iPhone", "iPad", "Android", "Windows", "Mac",
 * "Linux", "Expo" o "Sesión web o móvil".
 */
function buildDeviceIcon(
  session: UserSessionSummary,
): React.ComponentProps<typeof Feather>["name"] {
  if (session.isCurrent) return "smartphone";

  const label = (session.deviceLabel || "").toLowerCase();

  if (label.includes("iphone") || label.includes("android")) return "smartphone";
  if (label.includes("ipad")) return "tablet";
  if (
    label.includes("windows") ||
    label.includes("mac") ||
    label.includes("linux")
  )
    return "monitor";
  if (label.includes("expo")) return "code";

  // Fallback: si no podemos distinguir, usamos smartphone (más probable
  // que la mayoría de los usuarios accedan desde el celular).
  return "smartphone";
}

/**
 * Arma la línea de metadata de cada sesión.
 * Muestra cuándo se inició (más útil para detectar acceso sospechoso)
 * y la IP cuando está disponible.
 */
function buildSessionMeta(session: UserSessionSummary) {
  const parts: string[] = [];

  if (session.createdAt) {
    parts.push(`Iniciada el ${formatSessionDate(session.createdAt)}`);
  }

  if (session.ipAddress) {
    parts.push(`IP ${session.ipAddress}`);
  }

  return parts.join("  ·  ");
}

// ─── componente ─────────────────────────────────────────────────────────────

export default function AccountSecurityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { signOut } = useAuth();

  // ── password ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ── sesiones ──
  const [sessions, setSessions] = useState<UserSessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<number | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  // ── cuenta ──
  const [deletingAccount, setDeletingAccount] = useState(false);

  // ─── carga de sesiones ───────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      setSessionsError(null);
      const response = await fetchMySessions();
      setSessions(response.sessions || []);
    } catch (sessionError) {
      setSessionsError(formatAuthError(sessionError));
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSessions();
    }, [loadSessions]),
  );

  // ─── acciones de contraseña ──────────────────────────────────────────────

  const savePassword = async () => {
    try {
      setChangingPassword(true);
      setPasswordError(null);
      const response = await changeMyPassword({ currentPassword, nextPassword });
      setCurrentPassword("");
      setNextPassword("");
      Alert.alert(
        "Contrasena actualizada",
        response.message || "Tu contrasena ya fue actualizada correctamente.",
      );
      // Recargamos sesiones: cambiar la password cierra todas las demás.
      await loadSessions();
    } catch (err) {
      setPasswordError(formatAuthError(err));
    } finally {
      setChangingPassword(false);
    }
  };

  // ─── acciones de sesiones ────────────────────────────────────────────────

  const isBusyWithSession = revokingSessionId !== null || revokingOthers;

  const confirmRevokeSession = (session: UserSessionSummary) => {
    if (session.isCurrent || isBusyWithSession) return;

    Alert.alert(
      "Cerrar esta sesion",
      `Vamos a cerrar la sesion en ${session.deviceLabel}. Ese dispositivo va a tener que volver a ingresar.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesion",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setRevokingSessionId(session.id);
                const response = await revokeMySession(session.id);
                Alert.alert(
                  "Sesion cerrada",
                  response.message || "La sesion se cerro correctamente.",
                );
                await loadSessions();
              } catch (err) {
                Alert.alert("No pudimos cerrar la sesion", formatAuthError(err));
              } finally {
                setRevokingSessionId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const confirmRevokeOtherSessions = () => {
    if (isBusyWithSession) return;

    const otherCount = sessions.filter((s) => !s.isCurrent).length;

    Alert.alert(
      "Cerrar otras sesiones",
      otherCount === 1
        ? "Vamos a cerrar la otra sesion activa de tu cuenta. Esta sesion queda abierta."
        : `Vamos a cerrar las otras ${otherCount} sesiones activas de tu cuenta. Esta sesion queda abierta.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar otras",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setRevokingOthers(true);
                const response = await revokeMyOtherSessions();
                Alert.alert(
                  "Sesiones cerradas",
                  response.message || "Las otras sesiones se cerraron correctamente.",
                );
                await loadSessions();
              } catch (err) {
                Alert.alert(
                  "No pudimos cerrar las otras sesiones",
                  formatAuthError(err),
                );
              } finally {
                setRevokingOthers(false);
              }
            })();
          },
        },
      ],
    );
  };

  // ─── eliminacion de cuenta ───────────────────────────────────────────────

  const confirmDeleteAccount = () => {
    if (deletingAccount) return;

    Alert.alert(
      "Eliminar cuenta",
      "Vamos a eliminar tu cuenta, tus sesiones y tu historial asociado. Esta accion no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setDeletingAccount(true);
                const response = await deleteMyAccount();
                await signOut({
                  reason:
                    response.message ||
                    "Tu cuenta fue eliminada correctamente. Cuando quieras, podes crear una nueva.",
                });
              } catch (err) {
                Alert.alert("No pudimos eliminar tu cuenta", formatAuthError(err));
              } finally {
                setDeletingAccount(false);
              }
            })();
          },
        },
      ],
    );
  };

  // ─── cuántas sesiones "otras" hay (para mostrar / ocultar botón) ─────────
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.headerDark} />
      <ScreenHeader title="Seguridad y sesiones" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Contraseña ── */}
        <ProfileSectionHeader title="Email de acceso" />

        <View style={styles.securityCard}>
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.securityRow}
            onPress={() => navigation.navigate("ChangeEmail")}
          >
            <View style={styles.securityIcon}>
              <Feather name="mail" size={16} color={theme.colors.text} />
            </View>
            <View style={styles.securityCopy}>
              <Text style={styles.securityTitle}>Cambiar email</Text>
              <Text style={styles.securityText}>
                Te enviaremos un enlace al nuevo correo y el cambio se aplicara al confirmarlo.
              </Text>
            </View>
            <Feather name="chevron-right" size={17} color={theme.colors.textSoft} />
          </TouchableOpacity>
        </View>

        <ProfileSectionHeader title="Contrasena" />

        {passwordError ? (
          <ErrorState title="No pudimos actualizar la contrasena" message={passwordError} />
        ) : null}

        <ProfilePasswordCard
          currentPassword={currentPassword}
          nextPassword={nextPassword}
          saving={changingPassword}
          onCurrentPasswordChange={setCurrentPassword}
          onNextPasswordChange={setNextPassword}
          onSave={() => void savePassword()}
        />

        {/* ── Sesiones activas ── */}
        <ProfileSectionHeader
          title="Dispositivos conectados"
          actionLabel={
            otherSessionsCount > 0
              ? revokingOthers
                ? "Cerrando..."
                : `Cerrar ${otherSessionsCount === 1 ? "la otra" : `las otras ${otherSessionsCount}`}`
              : undefined
          }
          onAction={
            otherSessionsCount > 0 && !isBusyWithSession
              ? confirmRevokeOtherSessions
              : undefined
          }
        />

        {sessionsError ? (
          <ErrorState title="No pudimos cargar tus dispositivos" message={sessionsError} />
        ) : (
          <View style={styles.sessionsCard}>
            {loadingSessions ? (
              <View style={styles.sessionsLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.sessionsLoadingText}>Buscando sesiones activas...</Text>
              </View>
            ) : sessions.length === 0 ? (
              <Text style={styles.sessionsEmptyText}>
                No hay sesiones activas registradas para esta cuenta.
              </Text>
            ) : (
              sessions.map((session, index) => (
                <View key={session.id}>
                  <View style={styles.sessionRow}>

                    {/* Ícono del dispositivo */}
                    <View
                      style={[
                        styles.sessionIcon,
                        session.isCurrent && styles.sessionIconCurrent,
                      ]}
                    >
                      <Feather
                        name={buildDeviceIcon(session)}
                        size={16}
                        color={
                          session.isCurrent
                            ? theme.colors.success
                            : theme.colors.text
                        }
                      />
                    </View>

                    {/* Info de la sesión */}
                    <View style={styles.sessionCopy}>
                      <View style={styles.sessionTitleRow}>
                        <Text style={styles.sessionTitle}>{session.deviceLabel}</Text>
                        {session.isCurrent ? (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Este dispositivo</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.sessionMeta}>
                        Ultimo uso: {formatSessionDate(session.lastUsedAt)}
                      </Text>

                      {buildSessionMeta(session) ? (
                        <Text style={styles.sessionMeta}>{buildSessionMeta(session)}</Text>
                      ) : null}
                    </View>

                    {/* Botón cerrar (solo en sesiones no actuales) */}
                    {session.isCurrent ? null : (
                      <TouchableOpacity
                        activeOpacity={0.86}
                        style={[
                          styles.sessionAction,
                          isBusyWithSession && styles.sessionActionDisabled,
                        ]}
                        // Deshabilitado si cualquier sesión está siendo revocada,
                        // no solo la propia — evita requests paralelos y feedback confuso.
                        disabled={isBusyWithSession}
                        onPress={() => confirmRevokeSession(session)}
                      >
                        {revokingSessionId === session.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.sessionActionText}>Cerrar</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {index < sessions.length - 1 ? (
                    <View style={styles.divider} />
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── Privacidad y cuenta ── */}
        <ProfileSectionHeader title="Privacidad" />
        <View style={styles.securityCard}>
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.securityRow}
            onPress={() => navigation.navigate("Legal", { kind: "privacy" })}
          >
            <View style={styles.securityIcon}>
              <Feather name="shield" size={16} color={theme.colors.text} />
            </View>
            <View style={styles.securityCopy}>
              <Text style={styles.securityTitle}>Privacidad y datos</Text>
              <Text style={styles.securityText}>Revisa como PROMY cuida tu informacion.</Text>
            </View>
            <Feather name="chevron-right" size={17} color={theme.colors.textSoft} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.securityRow}
            onPress={() => navigation.navigate("Legal", { kind: "terms" })}
          >
            <View style={styles.securityIcon}>
              <Feather name="file-text" size={16} color={theme.colors.text} />
            </View>
            <View style={styles.securityCopy}>
              <Text style={styles.securityTitle}>Terminos y condiciones</Text>
              <Text style={styles.securityText}>
                Ultima version disponible para usuarios PROMY.
              </Text>
            </View>
            <Feather name="chevron-right" size={17} color={theme.colors.textSoft} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.securityRow}
            onPress={confirmDeleteAccount}
            disabled={deletingAccount}
          >
            <View style={[styles.securityIcon, styles.securityIconDanger]}>
              <Feather name="trash-2" size={16} color={theme.colors.accentRed} />
            </View>
            <View style={styles.securityCopy}>
              <Text style={styles.securityTitleDanger}>
                {deletingAccount ? "Eliminando cuenta..." : "Eliminar cuenta"}
              </Text>
              <Text style={styles.securityTextDanger}>
                Borra tu cuenta, sesiones e historial asociado.
              </Text>
            </View>
            <Feather name="chevron-right" size={17} color={theme.colors.accentRed} />
          </TouchableOpacity>
        </View>

        <BottomSafeSpacer extra={18} />
      </ScrollView>
    </View>
  );
}

// ─── estilos ─────────────────────────────────────────────────────────────────

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

  // ── sesiones ──
  sessionsCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  sessionsLoading: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sessionsLoadingText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  sessionsEmptyText: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 12.5,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  sessionRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  // El ícono de la sesión actual usa verde (éxito) en lugar de rojo (peligro).
  sessionIconCurrent: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "rgba(36,168,101,0.22)",
  },
  sessionCopy: {
    flex: 1,
    gap: 3,
  },
  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  sessionTitle: {
    fontSize: 13.5,
    fontWeight: "900",
    color: theme.colors.text,
  },
  currentBadge: {
    borderRadius: 999,
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(36,168,101,0.22)",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: theme.colors.success,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sessionMeta: {
    fontSize: 10.8,
    lineHeight: 14,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  sessionAction: {
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: theme.colors.headerDark,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  // Cuando está deshabilitado (otra sesión se está cerrando) baja la opacidad.
  sessionActionDisabled: {
    opacity: 0.4,
  },
  sessionActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  // ── privacidad / cuenta ──
  securityCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  securityRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  securityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  securityIconDanger: {
    backgroundColor: theme.colors.accentRedSoft,
    borderColor: "rgba(255,49,49,0.18)",
  },
  securityCopy: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13.5,
    fontWeight: "900",
    color: theme.colors.text,
  },
  securityTitleDanger: {
    fontSize: 13.5,
    fontWeight: "900",
    color: theme.colors.accentRed,
  },
  securityText: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  securityTextDanger: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#B34A4A",
  },

  // ── separador ──
  divider: {
    height: 1,
    marginLeft: 62,
    backgroundColor: theme.colors.border,
  },
});
