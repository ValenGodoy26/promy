import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth";
import {
  confirmEmailChangeRequest,
  forgotPasswordRequest,
  requestEmailVerificationRequest,
  resetPasswordRequest,
  verifyEmailRequest,
} from "../../lib/api";
import { PromyMark, PromyWordmark } from "../../components/Logo";
import { IconActivity, IconAlert, IconArrowRight, IconCheck, IconTag } from "../../components/Icons";

type AlertTone = "danger" | "success";

const PASSWORD_REQUIREMENTS =
  "Mínimo 8 caracteres, una mayúscula, una minúscula y un número.";

function validatePasswordPolicy(password: string) {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!/[A-Z]/.test(password)) {
    return "La contraseña debe incluir al menos una mayúscula.";
  }
  if (!/[a-z]/.test(password)) {
    return "La contraseña debe incluir al menos una minúscula.";
  }
  if (!/\d/.test(password)) {
    return "La contraseña debe incluir al menos un número.";
  }
  return null;
}

function AuthActionLayout({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
}) {
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
            Cuentas listas para <em>operar</em>
          </h2>
          <p className="auth-brand-copy">
            El acceso del panel y la operación de promociones dependen de un correo real y una
            recuperación de cuenta confiable.
          </p>

          <div className="auth-brand-highlights">
            <div className="auth-brand-highlight">
              <div className="auth-brand-highlight-icon">
                <IconCheck size={14} />
              </div>
              <span>Verificación por email</span>
            </div>
            <div className="auth-brand-highlight">
              <div className="auth-brand-highlight-icon">
                <IconTag size={14} />
              </div>
              <span>Recuperación segura</span>
            </div>
            <div className="auth-brand-highlight">
              <div className="auth-brand-highlight-icon">
                <IconActivity size={14} />
              </div>
              <span>Panel listo para operar</span>
            </div>
          </div>
        </div>

        <div className="auth-brand-footer">PROMY · CONCORDIA · v0.1</div>
        <div className="auth-brand-decor auth-brand-decor-1" />
        <div className="auth-brand-decor auth-brand-decor-2" />
        <div className="auth-brand-decor auth-brand-decor-3">P</div>
      </aside>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-form-eyebrow">{eyebrow}</div>
          <h1 className="auth-form-title">{title}</h1>
          <p className="auth-form-subtitle">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

function AuthAlert({
  tone,
  children,
}: {
  tone: AlertTone;
  children: ReactNode;
}) {
  return (
    <div className={`auth-alert ${tone === "danger" ? "auth-alert-danger" : "auth-alert-success"}`}>
      <IconAlert size={14} />
      <span>{children}</span>
    </div>
  );
}

function PreviewLinkCard({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <div className="auth-preview-card">
      <div className="auth-preview-label">{label}</div>
      <a className="auth-preview-link" href={href}>
        {href}
      </a>
    </div>
  );
}

function VerifyResendForm({
  initialEmail,
}: {
  initialEmail?: string;
}) {
  const [email, setEmail] = useState(initialEmail || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewLink, setPreviewLink] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && !loading;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setPreviewLink(null);

      const response = await requestEmailVerificationRequest(email.trim());
      setSuccess(response.message || "Si el email existe, reenviamos un nuevo enlace de verificación.");
      setPreviewLink(response.verification?.link || null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos reenviar el email de verificación.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form className="auth-form-body" onSubmit={handleSubmit}>
        <div>
          <label className="auth-field-label">Email</label>
          <input
            className="auth-field-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vos@tunegocio.com"
            autoComplete="email"
          />
        </div>

        {success ? <AuthAlert tone="success">{success}</AuthAlert> : null}
        {error ? <AuthAlert tone="danger">{error}</AuthAlert> : null}

        <button className="auth-submit" disabled={!canSubmit} type="submit">
          {loading ? "Enviando..." : "Reenviar email de verificación"}
          {!loading && <IconArrowRight size={15} />}
        </button>
      </form>

      {previewLink ? (
        <PreviewLinkCard
          label="Enlace de desarrollo"
          href={previewLink}
        />
      ) : null}
    </>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { clearAuthNotice, refreshSession } = useAuth();
  const token = searchParams.get("token")?.trim() || "";
  const email = searchParams.get("email")?.trim() || "";
  const verificationAttemptedRef = useRef(false);
  const [loading, setLoading] = useState(Boolean(token));
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || verificationAttemptedRef.current) {
      setLoading(false);
      return;
    }

    verificationAttemptedRef.current = true;

    const verify = async () => {
      try {
        const response = await verifyEmailRequest(token);
        setSuccess(response.message || "Tu email quedó verificado correctamente.");
        setError(null);
        clearAuthNotice();
        await refreshSession().catch(() => null);
      } catch (verifyError) {
        setError(
          verifyError instanceof Error
            ? verifyError.message
            : "No pudimos verificar tu email con este enlace.",
        );
      } finally {
        setLoading(false);
      }
    };

    void verify();
  }, [clearAuthNotice, refreshSession, token]);

  const subtitle = useMemo(() => {
    if (token) {
      return "Validamos el enlace que te mandamos por correo para que puedas operar tu cuenta sin bloqueos.";
    }

    return "Si tu enlace venció o no llegó, podés pedir uno nuevo desde acá.";
  }, [token]);

  return (
    <AuthActionLayout
      eyebrow="Verificación de email"
      title={
        <>
          Activá tu cuenta <em>PROMY</em>
        </>
      }
      subtitle={subtitle}
    >
      {loading ? <AuthAlert tone="success">Estamos verificando tu email, un segundo...</AuthAlert> : null}
      {success ? <AuthAlert tone="success">{success}</AuthAlert> : null}
      {error ? <AuthAlert tone="danger">{error}</AuthAlert> : null}

      {success ? (
        <div className="auth-action-stack">
          <Link className="auth-submit" to="/login" style={{ textDecoration: "none" }}>
            Ir al login
            <IconArrowRight size={15} />
          </Link>
        </div>
      ) : null}

      {!success && !loading ? (
        <>
          <div className="auth-divider">
            <span className="auth-divider-text">¿Necesitás un enlace nuevo?</span>
          </div>
          <VerifyResendForm initialEmail={email} />
        </>
      ) : null}
    </AuthActionLayout>
  );
}

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email")?.trim() || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewLink, setPreviewLink] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && !loading;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setPreviewLink(null);

      const response = await forgotPasswordRequest(email.trim());
      setSuccess(
        response.message || "Si el email existe, enviamos instrucciones para recuperar tu contraseña.",
      );
      setPreviewLink(response.reset?.link || null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos iniciar la recuperación de contraseña.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthActionLayout
      eyebrow="Recuperar cuenta"
      title={
        <>
          Recuperá tu <em>contraseña</em>
        </>
      }
      subtitle="Te enviamos un enlace para que vuelvas a entrar al panel sin depender de soporte."
    >
      <form className="auth-form-body" onSubmit={handleSubmit}>
        <div>
          <label className="auth-field-label">Email</label>
          <input
            className="auth-field-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vos@tunegocio.com"
            autoComplete="email"
          />
        </div>

        {success ? <AuthAlert tone="success">{success}</AuthAlert> : null}
        {error ? <AuthAlert tone="danger">{error}</AuthAlert> : null}

        <button className="auth-submit" disabled={!canSubmit} type="submit">
          {loading ? "Enviando..." : "Enviar enlace de recuperación"}
          {!loading && <IconArrowRight size={15} />}
        </button>
      </form>

      {previewLink ? (
        <PreviewLinkCard
          label="Enlace de desarrollo"
          href={previewLink}
        />
      ) : null}

      <div className="auth-inline-actions auth-inline-actions-start">
        <Link className="auth-text-link" to="/login">
          Volver al login
        </Link>
      </div>
    </AuthActionLayout>
  );
}

export function ConfirmEmailChangePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const verificationAttemptedRef = useRef(false);
  const [loading, setLoading] = useState(Boolean(token));
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || verificationAttemptedRef.current) {
      setLoading(false);
      return;
    }

    verificationAttemptedRef.current = true;

    const confirm = async () => {
      try {
        const response = await confirmEmailChangeRequest(token);
        setSuccess(
          response.message ||
            "Tu email se actualizo correctamente. Vuelve a ingresar con el nuevo correo.",
        );
        setError(null);
      } catch (confirmError) {
        setError(
          confirmError instanceof Error
            ? confirmError.message
            : "No pudimos confirmar el cambio de email con este enlace.",
        );
      } finally {
        setLoading(false);
      }
    };

    void confirm();
  }, [token]);

  return (
    <AuthActionLayout
      eyebrow="Cambio de email"
      title={
        <>
          Confirmá tu <em>nuevo email</em>
        </>
      }
      subtitle="Aplicamos el cambio solo cuando el nuevo correo queda verificado. Después tendrás que volver a ingresar con esa dirección."
    >
      {loading ? <AuthAlert tone="success">Estamos confirmando el nuevo email, un segundo...</AuthAlert> : null}
      {success ? <AuthAlert tone="success">{success}</AuthAlert> : null}
      {error ? <AuthAlert tone="danger">{error}</AuthAlert> : null}

      {success ? (
        <div className="auth-action-stack">
          <Link className="auth-submit" to="/login" style={{ textDecoration: "none" }}>
            Ir al login
            <IconArrowRight size={15} />
          </Link>
        </div>
      ) : null}

      {!token && !loading ? (
        <AuthAlert tone="danger">Este enlace no incluye un token valido para confirmar el cambio.</AuthAlert>
      ) : null}
    </AuthActionLayout>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const passwordError = useMemo(() => {
    if (!password && !passwordRepeat) {
      return null;
    }
    const policyError = validatePasswordPolicy(password);
    if (policyError) return policyError;
    if (password !== passwordRepeat) {
      return "Las contraseñas no coinciden.";
    }
    return null;
  }, [password, passwordRepeat]);

  const canSubmit = Boolean(token) && password.length > 0 && passwordRepeat.length > 0 && !passwordError && !loading;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await resetPasswordRequest(token, password);
      setSuccess(response.message || "Tu contraseña se actualizó correctamente.");
      setPassword("");
      setPasswordRepeat("");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "No pudimos actualizar tu contraseña.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthActionLayout
      eyebrow="Nueva contraseña"
      title={
        <>
          Definí un acceso <em>nuevo</em>
        </>
      }
      subtitle="Usá una contraseña fuerte para volver al panel de comercio o administración."
    >
      {!token ? (
        <>
          <AuthAlert tone="danger">
            El enlace de recuperación no tiene un token válido. Pedí uno nuevo para continuar.
          </AuthAlert>
          <Link className="auth-submit" to="/forgot-password" style={{ textDecoration: "none" }}>
            Pedir enlace nuevo
            <IconArrowRight size={15} />
          </Link>
        </>
      ) : success ? (
        <div className="auth-action-stack">
          <AuthAlert tone="success">{success}</AuthAlert>
          <Link className="auth-submit" to="/login" style={{ textDecoration: "none" }}>
            Volver al login
            <IconArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <form className="auth-form-body" onSubmit={handleSubmit}>
          <div>
            <label className="auth-field-label">Nueva contraseña</label>
            <p className="auth-field-hint">{PASSWORD_REQUIREMENTS}</p>
            <input
              className="auth-field-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="auth-field-label">Repetí la contraseña</label>
            <input
              className="auth-field-input"
              type="password"
              value={passwordRepeat}
              onChange={(event) => setPasswordRepeat(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          {passwordError ? <AuthAlert tone="danger">{passwordError}</AuthAlert> : null}
          {error ? <AuthAlert tone="danger">{error}</AuthAlert> : null}

          <button className="auth-submit" disabled={!canSubmit} type="submit">
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
            {!loading && <IconArrowRight size={15} />}
          </button>
        </form>
      )}
    </AuthActionLayout>
  );
}
