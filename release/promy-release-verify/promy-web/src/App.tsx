import React, { Suspense, lazy, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./auth";
import {
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from "./features/public/AuthActionPages";
import CommerceRegisterPage from "./features/public/CommerceRegisterPage";
import { PromyMark, PromyWordmark } from "./components/Logo";
import { buildAppSectionDeepLink } from "./lib/clientLinks";
import {
  IconArrowRight,
  IconAlert,
  IconStore,
  IconLogout,
  IconCheck,
  IconActivity,
  IconTag,
} from "./components/Icons";
import type { UserRole } from "./types/api";

const AdminPanel = lazy(() => import("./features/admin/AdminPanel"));
const CommercePanel = lazy(() => import("./features/commerce/CommercePanel"));

function buildClientAppNoticePath(title: string, description: string) {
  const params = new URLSearchParams({
    title,
    description,
  });

  return `/client-app?${params.toString()}`;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/register-commerce" element={<CommerceRegisterPage />} />
      <Route path="/terms" element={<LegalPage kind="terms" />} />
      <Route path="/privacy" element={<LegalPage kind="privacy" />} />
      <Route path="/app" element={<RoleRedirectPage />} />
      <Route
        path="/commerce/*"
        element={
          <ProtectedRoute roles={["COMMERCE"]}>
            <Suspense fallback={<CenteredState title="Cargando panel" text="Preparando herramientas de comercio..." />}>
              <CommercePanel />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <Suspense fallback={<CenteredState title="Cargando panel" text="Preparando backoffice..." />}>
              <AdminPanel />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route path="/client-app" element={<ClientAppNoticePage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ProtectedRoute({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { session, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return <CenteredState title="Validando acceso" text="Un segundo..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!roles.includes(session.user.role)) {
    if (session.user.role === "CLIENT") {
      return <Navigate to="/client-app" replace />;
    }
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

function RoleRedirectPage() {
  const { session, booting } = useAuth();

  if (booting) {
    return <CenteredState title="Cargando sesión" text="Preparando tu panel..." />;
  }
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (session.user.role === "COMMERCE") return <Navigate to="/commerce" replace />;
  return <Navigate to="/client-app" replace />;
}

/* ============================================================
   LANDING
============================================================ */
function LandingPage() {
  return (
    <div className="landing-shell">
      <nav className="landing-nav">
        <div className="landing-nav-start">
          <PromyMark size="sm" variant="default" />
          <span className="landing-nav-wordmark">PROMY</span>
          <span className="landing-nav-pill">v0.1 · Panel</span>
        </div>
        <div className="landing-nav-end">
          <a href="#roles" className="landing-nav-link">Cómo funciona</a>
          <a href="#app" className="landing-nav-link">Para clientes</a>
          <Link to="/register-commerce" className="landing-btn landing-btn-ghost">
            <IconStore size={14} /> Soy comercio
          </Link>
          <Link to="/login" className="landing-btn landing-btn-primary">
            Entrar <IconArrowRight size={14} />
          </Link>
        </div>
      </nav>

      <section className="landing-hero-new">
        <div className="landing-hero-text">
          <div className="landing-eyebrow">
            <span className="landing-eyebrow-line" />
            <span>Concordia · Entre Ríos</span>
          </div>

          <h1 className="landing-hero-title">
            Promociones de <em>verdad</em>, cerca tuyo.
          </h1>

          <p className="landing-hero-copy">
            PROMY conecta a los <strong>comercios locales</strong> con gente que vive cerca.
            Descubrís beneficios reales, los canjeás en el local, y ya está.
            Sin vueltas, sin cupones raros, sin tarjetas de plástico.
          </p>

          <div className="landing-hero-actions">
            <Link to="/login" className="landing-btn landing-btn-accent landing-btn-lg">
              Entrar al panel <IconArrowRight size={15} />
            </Link>
            <Link to="/register-commerce" className="landing-btn landing-btn-yellow landing-btn-lg">
              Sumá tu comercio
            </Link>
          </div>

          <div className="landing-hero-note">
            El alta queda sujeta a revisión antes de operar promociones
          </div>
        </div>

        <div className="landing-hero-mascot">
          <div className="landing-mascot-wrap">
            <div className="landing-mascot-halo" />
            <PromyMark size="hero" variant="mark" className="landing-mascot-svg" />

            <div className="landing-mascot-chip landing-mascot-chip-1">
              <strong>-40%</strong> en cafés
            </div>
            <div className="landing-mascot-chip landing-mascot-chip-2">
              2x1 hoy
            </div>
            <div className="landing-mascot-chip landing-mascot-chip-3">
              Alta moderada
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="roles">
        <div className="landing-section-head">
          <div>
            <div className="landing-section-label">Para quién es esto</div>
            <h2 className="landing-section-title">
              Si tenés un comercio, <em>estás en el lugar correcto</em>.
            </h2>
          </div>
        </div>

        <div className="landing-roles-grid-2col">
          <article className="role-card-v2 role-card-primary">
            <div className="role-card-head">
              <span className="role-card-dot commerce" />
            </div>
            <h3 className="role-card-title-v2">
              Cargá tus promos en <em>2 minutos</em>.
            </h3>
            <p className="role-card-desc-v2">
              Gestioná tu perfil, tus promociones y los canjes desde un panel pensado para operar.
            </p>
            <div className="role-card-bullets-v2">
              <span className="role-card-bullet-v2"><IconCheck size={12} /> Seguimiento de promos y canjes</span>
              <span className="role-card-bullet-v2"><IconCheck size={12} /> Crear, pausar y editar promos</span>
              <span className="role-card-bullet-v2"><IconCheck size={12} /> Validá canjes con QR o código</span>
            </div>
            <div className="role-card-actions">
              <Link to="/register-commerce" className="landing-btn landing-btn-yellow landing-btn-lg">
                Crear cuenta comercio <IconArrowRight size={14} />
              </Link>
              <Link to="/login" className="landing-btn-text">
                Ya tengo cuenta
              </Link>
            </div>
          </article>

          <article className="role-card-v2 role-card-client" id="app">
            <div className="role-card-head">
              <span className="role-card-dot client" />
            </div>
            <h3 className="role-card-title-v2">¿Buscás promos <em>cerca tuyo</em>?</h3>
            <p className="role-card-desc-v2">
              Descubrí beneficios reales de comercios del barrio desde la app mobile de PROMY.
            </p>
            <div className="role-card-bullets-v2">
              <span className="role-card-bullet-v2"><IconCheck size={12} /> Promos geolocalizadas cerca tuyo</span>
              <span className="role-card-bullet-v2"><IconCheck size={12} /> Canjeable con un toque en el local</span>
              <span className="role-card-bullet-v2"><IconCheck size={12} /> App cliente en beta cerrada</span>
            </div>
            <Link
              to={buildClientAppNoticePath(
                "Ver estado de la app mobile",
                "La experiencia cliente de PROMY se usa desde la app mobile y hoy se habilita por etapas.",
              )}
              className="landing-btn landing-btn-yellow landing-btn-lg"
              style={{ display: "inline-flex", textDecoration: "none", marginTop: "auto" }}
            >
              Ver estado de la app <IconArrowRight size={14} />
            </Link>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <PromyMark size="xs" variant="default" />
          <span>PROMY · Concordia</span>
        </div>
        <div className="landing-footer-links">
          <span>Versión 0.1 · Abril 2026</span>
          <Link to="/terms">Términos</Link>
          <Link to="/privacy">Privacidad</Link>
        </div>
      </footer>
    </div>
  );
}

function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const isPrivacy = kind === "privacy";
  const title = isPrivacy ? "Política de privacidad" : "Términos y condiciones";
  const intro = isPrivacy
    ? "Esta política explica qué datos personales trata PROMY, para qué los usa y cómo podés ejercer tus derechos."
    : "Estos términos regulan el uso de PROMY por clientes, comercios y administradores de la plataforma.";

  return (
    <div className="legal-page">
      <nav className="landing-nav">
        <div className="landing-nav-start">
          <PromyMark size="sm" variant="default" />
          <span className="landing-nav-wordmark">PROMY</span>
        </div>
        <div className="landing-nav-end">
          <Link to="/" className="landing-btn landing-btn-ghost">Volver</Link>
          <Link to={isPrivacy ? "/terms" : "/privacy"} className="landing-btn landing-btn-primary">
            {isPrivacy ? "Ver términos" : "Ver privacidad"}
          </Link>
        </div>
      </nav>

      <main className="legal-shell">
        <div className="legal-kicker">PROMY · Argentina · Ley 25.326</div>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        {isPrivacy ? <PrivacyContent /> : <TermsContent />}
        <p className="legal-note">
          Última actualización: mayo 2026. Contacto: hola@promy.app.
        </p>
      </main>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="legal-grid">
      <LegalBlock title="Qué datos guardamos">
        Nombre, email, teléfono opcional, rol de cuenta, ciudad, datos de comercios registrados,
        promociones, canjes, favoritos locales, notificaciones, logs técnicos mínimos, ubicación
        aproximada si la autorizás y archivos que suban los comercios.
      </LegalBlock>
      <LegalBlock title="Para qué los usamos">
        Para crear y proteger cuentas, mostrar promociones cercanas, operar canjes, moderar comercios
        y promociones, enviar avisos operativos, prevenir abuso, mejorar la app y cumplir obligaciones
        legales o requerimientos válidos de autoridad competente.
      </LegalBlock>
      <LegalBlock title="Cómo se usan y comparten">
        PROMY muestra a clientes la información pública de comercios y promociones aprobadas. Los
        comercios ven datos necesarios para validar canjes. No vendemos datos personales. Podemos usar
        proveedores técnicos de hosting, email, almacenamiento, analítica operativa o notificaciones.
      </LegalBlock>
      <LegalBlock title="Tus derechos">
        Conforme la Ley 25.326, podés solicitar acceso, actualización, rectificación o supresión de tus
        datos cuando corresponda. Escribinos a hola@promy.app indicando el email de tu cuenta.
      </LegalBlock>
      <LegalBlock title="Seguridad y conservación">
        Aplicamos controles razonables de seguridad, autenticación, roles, validación de archivos y
        registros de auditoría. Conservamos datos mientras la cuenta esté activa o exista una necesidad
        operativa, legal, antifraude o de soporte.
      </LegalBlock>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="legal-grid">
      <LegalBlock title="Uso de la app">
        PROMY permite descubrir promociones de comercios adheridos, crear cuentas, canjear beneficios y
        consultar actividad. El usuario debe brindar datos reales y usar la plataforma de buena fe.
      </LegalBlock>
      <LegalBlock title="Responsabilidades de clientes">
        Los clientes deben respetar condiciones, vigencias y límites de cada promoción. Los códigos o QR
        de canje son personales y pueden rechazarse si están vencidos, usados o fueron obtenidos de forma
        irregular.
      </LegalBlock>
      <LegalBlock title="Relación con comercios">
        Los comercios son responsables por la veracidad de sus datos, promociones, stock, precios,
        condiciones y atención en el local. PROMY facilita la conexión y validación, pero no reemplaza la
        relación comercial entre cliente y comercio.
      </LegalBlock>
      <LegalBlock title="Moderación y disponibilidad">
        PROMY puede aprobar, rechazar, pausar o eliminar comercios, promociones o cuentas ante errores,
        abuso, información falsa, incumplimientos o riesgos para usuarios y comercios.
      </LegalBlock>
      <LegalBlock title="Cambios">
        PROMY puede actualizar estos términos y la política de privacidad. Los cambios relevantes se
        comunicarán por medios razonables dentro de la plataforma.
      </LegalBlock>
    </div>
  );
}

function LegalBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="legal-block">
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

/* ============================================================
   LOGIN
============================================================ */
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, login, booting, authNotice, clearAuthNotice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session && !booting) {
      navigate("/app", { replace: true });
    }
  }, [booting, navigate, session]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      clearAuthNotice();
      await login(email, password);
      const target = (location.state as { from?: string } | null)?.from;
      navigate(target || "/app", { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No pudimos iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <aside className="auth-brand-side">
        <div className="auth-brand-nav">
          <Link to="/" className="auth-back-link">
            ← Volver al inicio
          </Link>
          <PromyWordmark />
        </div>

        <div className="auth-brand-content">
          <div className="auth-brand-mascot">
            <PromyMark size="xl" variant="default" />
          </div>

          <h2 className="auth-brand-headline">
            Entrá al <em>panel operativo</em>
          </h2>
          <p className="auth-brand-copy">
            El centro de control de PROMY. Todo lo que pasa en la app mobile se gestiona desde acá.
          </p>

          <div className="auth-brand-highlights">
            <div className="auth-brand-highlight">
              <div className="auth-brand-highlight-icon">
                <IconActivity size={14} />
              </div>
              <span>Seguimiento operativo</span>
            </div>
            <div className="auth-brand-highlight">
              <div className="auth-brand-highlight-icon">
                <IconTag size={14} />
              </div>
              <span>Gestión de promociones</span>
            </div>
            <div className="auth-brand-highlight">
              <div className="auth-brand-highlight-icon">
                <IconCheck size={14} />
              </div>
              <span>Canjes validados al instante</span>
            </div>
          </div>
        </div>

        <div className="auth-brand-footer">
          PROMY · CONCORDIA · v0.1
        </div>

        <div className="auth-brand-decor auth-brand-decor-1" />
        <div className="auth-brand-decor auth-brand-decor-2" />
        <div className="auth-brand-decor auth-brand-decor-3">P</div>
      </aside>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-form-eyebrow">Inicio de sesión</div>
          <h1 className="auth-form-title">
            Bienvenido <em>de vuelta</em>
          </h1>
          <p className="auth-form-subtitle">
            Ingresá con tu cuenta de comercio o admin. Te redirigimos al panel correcto según tu rol.
          </p>

          <form className="auth-form-body" onSubmit={handleSubmit}>
            <div>
              <label className="auth-field-label">Email</label>
              <input
                className="auth-field-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="auth-field-label">Contraseña</label>
              <input
                className="auth-field-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="auth-inline-actions">
              <Link
                className="auth-text-link"
                to={
                  email.trim()
                    ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                    : "/forgot-password"
                }
              >
                Olvidé mi contraseña
              </Link>
              <Link
                className="auth-text-link"
                to={
                  email.trim()
                    ? `/verify-email?email=${encodeURIComponent(email.trim())}`
                    : "/verify-email"
                }
              >
                Reenviar verificación
              </Link>
            </div>

            {authNotice && !error ? (
              <div className="auth-alert">
                <IconAlert size={14} />
                <span>{authNotice}</span>
              </div>
            ) : null}

            {error ? (
              <div className="auth-alert auth-alert-danger">
                <IconAlert size={14} />
                <span>{error}</span>
              </div>
            ) : null}

            <button className="auth-submit" disabled={loading} type="submit">
              {loading ? "Ingresando..." : "Ingresar al panel"}
              {!loading && <IconArrowRight size={15} />}
            </button>
          </form>

          <div className="auth-divider">
            <span className="auth-divider-text">¿Sos comercio nuevo?</span>
          </div>

          <Link to="/register-commerce" className="auth-secondary-cta">
            <div className="auth-secondary-cta-content">
              <div className="auth-secondary-cta-title">Sumá tu comercio</div>
              <div className="auth-secondary-cta-copy">
                Registro gratuito · verificación por email y revisión del equipo
              </div>
            </div>
            <IconArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ============================================================
   CLIENT NOTICE
============================================================ */
function ClientAppNoticePage() {
  const { session, logout, loggingOut } = useAuth();
  const [searchParams] = useSearchParams();
  const target = searchParams.get("target")?.trim() || buildAppSectionDeepLink("home");
  const targetTitle = searchParams.get("title")?.trim() || "Abrir PROMY app";
  const targetDescription =
    searchParams.get("description")?.trim() ||
    "Abrí la app mobile para seguir este flujo como cliente.";
  return (
    <main className="auth-shell">
      <aside className="auth-brand-side">
        <div className="auth-brand-nav">
          <Link to="/" className="auth-back-link">← Volver al inicio</Link>
          <PromyWordmark />
        </div>
        <div className="auth-brand-content">
          <div className="auth-brand-mascot">
            <PromyMark size="xl" variant="default" />
          </div>
          <h2 className="auth-brand-headline">
            La magia vive en <em>mobile</em>
          </h2>
          <p className="auth-brand-copy">
            Los clientes disfrutan PROMY desde su celular: descubriendo promos cerca, canjeando en el local.
          </p>
        </div>
        <div className="auth-brand-footer">PROMY · CONCORDIA · v0.1</div>
        <div className="auth-brand-decor auth-brand-decor-1" />
        <div className="auth-brand-decor auth-brand-decor-2" />
      </aside>

      <section className="auth-form-side">
        <div className="auth-form-wrap" style={{ textAlign: "center" }}>
          <div className="auth-form-eyebrow" style={{ justifyContent: "center" }}>Rol no soportado</div>
          <h1 className="auth-form-title">
            Tu cuenta es de <em>cliente</em>
          </h1>
          <p className="auth-form-subtitle" style={{ marginLeft: "auto", marginRight: "auto" }}>
            La web está orientada a operación interna y comercios.
            Descargá la app mobile PROMY para usar tu cuenta como cliente.
          </p>

          <a
            className="auth-secondary-cta"
            href={target}
            style={{ marginTop: 20, marginBottom: 20, textDecoration: "none" }}
          >
            <div className="auth-secondary-cta-content">
              <div className="auth-secondary-cta-title">{targetTitle}</div>
              <div className="auth-secondary-cta-copy">{targetDescription}</div>
            </div>
            <IconArrowRight size={16} />
          </a>

          {session ? (
            <button
              className="auth-submit"
              style={{ width: "100%", background: "#0E0E10", borderColor: "#0E0E10" }}
              onClick={() => void logout()}
              disabled={loggingOut}
              type="button"
            >
              <IconLogout size={14} />
              {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </button>
          ) : (
            <Link className="auth-submit" to="/login" style={{ display: "inline-flex", textDecoration: "none" }}>
              Volver al login <IconArrowRight size={15} />
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}

function ForbiddenPage() {
  return (
    <CenteredState
      title="Sin acceso a este panel"
      text="Tu sesión es válida, pero este módulo no corresponde a tu rol."
    />
  );
}

function CenteredState({ title, text }: { title: string; text: string }) {
  return (
    <main className="auth-shell">
      <aside className="auth-brand-side">
        <div className="auth-brand-nav">
          <Link to="/" className="auth-back-link">← Volver al inicio</Link>
          <PromyWordmark />
        </div>
        <div className="auth-brand-content">
          <div className="auth-brand-mascot">
            <PromyMark size="xl" variant="default" />
          </div>
          <h2 className="auth-brand-headline">{title}</h2>
          <p className="auth-brand-copy">{text}</p>
        </div>
        <div className="auth-brand-footer">PROMY · CONCORDIA · v0.1</div>
        <div className="auth-brand-decor auth-brand-decor-1" />
        <div className="auth-brand-decor auth-brand-decor-2" />
      </aside>
      <section className="auth-form-side">
        <div className="auth-form-wrap" style={{ textAlign: "center" }}>
          <Link className="auth-submit" to="/" style={{ display: "inline-flex", textDecoration: "none" }}>
            Ir al inicio <IconArrowRight size={15} />
          </Link>
        </div>
      </section>
    </main>
  );
}

export default App;
