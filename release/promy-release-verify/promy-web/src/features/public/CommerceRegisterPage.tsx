import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchCategories, fetchCities, registerCommerceRequest } from "../../lib/api";
import type { PublicCategory, PublicCity } from "../../types/api";
import { PromyMark } from "../../components/Logo";
import { IconArrowRight, IconCheck, IconStore } from "../../components/Icons";

type StepKey = "access" | "owner" | "commerce" | "details";

const STEPS: { key: StepKey; label: string; helper: string }[] = [
  { key: "access", label: "Acceso", helper: "Tu email y una contraseña" },
  { key: "owner", label: "Sobre vos", helper: "Cómo te llamamos" },
  { key: "commerce", label: "Tu comercio", helper: "Datos del local" },
  { key: "details", label: "Contanos más", helper: "Para destacarte" },
];

type FormState = {
  email: string;
  password: string;
  passwordRepeat: string;
  fullName: string;
  phone: string;
  commerceName: string;
  address: string;
  cityId: string;
  categoryId: string;
  instagram: string;
  shortDescription: string;
};

const INITIAL: FormState = {
  email: "",
  password: "",
  passwordRepeat: "",
  fullName: "",
  phone: "",
  commerceName: "",
  address: "",
  cityId: "",
  categoryId: "",
  instagram: "",
  shortDescription: "",
};

const PASSWORD_REQUIREMENTS =
  "Mínimo 8 caracteres, una mayúscula, una minúscula y un número.";

function validatePasswordPolicy(password: string) {
  if (password.length < 8) {
    return "Tiene que tener al menos 8 caracteres.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Tiene que incluir al menos una mayúscula.";
  }
  if (!/[a-z]/.test(password)) {
    return "Tiene que incluir al menos una minúscula.";
  }
  if (!/\d/.test(password)) {
    return "Tiene que incluir al menos un número.";
  }
  return null;
}

export default function CommerceRegisterPage() {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [verificationPreviewLink, setVerificationPreviewLink] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const [cities, setCities] = useState<PublicCity[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Load cities + categories on mount
  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    Promise.all([fetchCities(), fetchCategories()])
      .then(([citiesRes, catsRes]) => {
        if (cancelled) return;
        setCities(citiesRes.cities ?? []);
        setCategories((catsRes.categories ?? []).filter((c) => c.isActive !== false));
      })
      .catch(() => {
        if (cancelled) return;
        setGlobalError(
          "No pudimos cargar las ciudades y categorías. Probá refrescar la página.",
        );
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentStep = STEPS[stepIdx];
  const isLastStep = stepIdx === STEPS.length - 1;
  const isFirstStep = stepIdx === 0;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setGlobalError(null);
  };

  function validateStep(step: StepKey): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (step === "access") {
      if (!form.email.trim()) next.email = "Necesitamos tu email.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        next.email = "Ese email no parece válido.";
      if (!form.password) next.password = "Elegí una contraseña.";
      else {
        const passwordError = validatePasswordPolicy(form.password);
        if (passwordError) next.password = passwordError;
      }
      if (form.password !== form.passwordRepeat)
        next.passwordRepeat = "Las contraseñas no coinciden.";
    }
    if (step === "owner") {
      if (!form.fullName.trim()) next.fullName = "Decinos cómo te llamás.";
      else if (form.fullName.trim().length < 2)
        next.fullName = "Nombre demasiado corto.";
    }
    if (step === "commerce") {
      if (!form.commerceName.trim())
        next.commerceName = "Necesitamos el nombre del local.";
      if (!form.address.trim()) next.address = "Indicá la dirección.";
      if (!form.cityId) next.cityId = "Seleccioná la ciudad.";
      if (!form.categoryId) next.categoryId = "Elegí una categoría.";
    }
    if (step === "details") {
      if (form.instagram && form.instagram.includes(" "))
        next.instagram = "Sin espacios, solo el usuario.";
      if (form.shortDescription && form.shortDescription.length > 160)
        next.shortDescription = "Máximo 160 caracteres.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext(e: FormEvent) {
    e.preventDefault();
    if (!validateStep(currentStep.key)) return;
    if (!isLastStep) {
      setStepIdx((i) => i + 1);
      return;
    }
    if (!acceptedLegal) {
      setGlobalError("Tenés que aceptar los Términos y la Política de privacidad para crear la cuenta.");
      return;
    }
    void submit();
  }

  async function submit() {
    setSubmitting(true);
    setGlobalError(null);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        commerceName: form.commerceName.trim(),
        shortDescription: form.shortDescription.trim() || undefined,
        address: form.address.trim(),
        cityId: Number(form.cityId),
        categoryId: Number(form.categoryId),
        instagram: form.instagram.trim().replace(/^@/, "") || undefined,
      };
      const response = await registerCommerceRequest(payload);
      setSubmittedEmail(payload.email);
      setVerificationPreviewLink(response.verification?.link || null);
      setCompleted(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No pudimos crear tu cuenta. Probá de nuevo.";
      setGlobalError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen — after submit
  if (completed) {
    return (
      <div className="public-page register-page">
        <PublicTopbar />
        <main className="register-success">
          <div className="register-success-card">
            <div className="register-success-icon">
              <IconCheck size={28} />
            </div>
            <h1>¡Listo, tu comercio está en camino!</h1>
            <p>
              Recibimos tu solicitud y nuestro equipo va a revisarla en las próximas horas.
              Te avisamos por email cuando esté aprobada y puedas empezar a cargar promos.
            </p>
            {verificationPreviewLink ? (
              <div className="auth-preview-card" style={{ marginTop: 18, textAlign: "left" }}>
                <div className="auth-preview-label">Enlace de verificación en desarrollo</div>
                <a className="auth-preview-link" href={verificationPreviewLink}>
                  {verificationPreviewLink}
                </a>
              </div>
            ) : (
              <p className="register-form-fineprint" style={{ marginTop: 14 }}>
                Te mandamos un email a <strong>{submittedEmail || form.email.trim()}</strong> para
                verificar la cuenta antes de operar el panel.
              </p>
            )}
            <div className="register-success-actions">
              {verificationPreviewLink ? (
                <a className="landing-btn landing-btn-yellow" href={verificationPreviewLink}>
                  Verificar email ahora <IconArrowRight size={14} />
                </a>
              ) : null}
              <button
                className="landing-btn landing-btn-primary"
                onClick={() => navigate("/login")}
              >
                Ir al login <IconArrowRight size={14} />
              </button>
              <Link className="landing-btn landing-btn-ghost" to="/">
                Volver al inicio
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="public-page register-page">
      <PublicTopbar />

      <main className="register-shell">
        <aside className="register-aside">
          <div className="register-aside-brand">
            <PromyMark size="md" variant="default" />
            <div>
              <div className="register-aside-eyebrow">Bienvenido</div>
              <h1 className="register-aside-title">
                Tu comercio en PROMY en <em>5 minutos</em>.
              </h1>
            </div>
          </div>

          <ul className="register-aside-bullets">
            <li>
              <span className="register-aside-bullet-icon"><IconCheck size={14} /></span>
              <div>
                <strong>Gratis para empezar</strong>
                <p>Sin tarjeta, sin compromiso. Cargás tu comercio y listo.</p>
              </div>
            </li>
            <li>
              <span className="register-aside-bullet-icon"><IconCheck size={14} /></span>
              <div>
                <strong>Aparecé cerca de tus clientes</strong>
                <p>Tu local en el mapa, con tus promos visibles para gente del barrio.</p>
              </div>
            </li>
            <li>
              <span className="register-aside-bullet-icon"><IconCheck size={14} /></span>
              <div>
                <strong>Métricas reales</strong>
                <p>Mirá quiénes canjean, cuándo y qué promos funcionan mejor.</p>
              </div>
            </li>
          </ul>

          <div className="register-aside-footer">
            ¿Ya tenés una cuenta? <Link to="/login">Iniciá sesión</Link>
          </div>
        </aside>

        <section className="register-card">
          <header className="register-card-head">
            <ol className="register-stepper">
              {STEPS.map((step, idx) => (
                <li
                  key={step.key}
                  className={[
                    "register-stepper-item",
                    idx === stepIdx ? "is-current" : "",
                    idx < stepIdx ? "is-done" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="register-stepper-num">
                    {idx < stepIdx ? <IconCheck size={14} /> : idx + 1}
                  </span>
                  <span className="register-stepper-label">{step.label}</span>
                </li>
              ))}
            </ol>

            <div className="register-card-title-row">
              <div>
                <div className="register-card-eyebrow">
                  Paso {stepIdx + 1} de {STEPS.length}
                </div>
                <h2 className="register-card-title">{currentStep.label}</h2>
                <p className="register-card-helper">{currentStep.helper}</p>
              </div>
              <div className="register-card-icon">
                <IconStore size={18} />
              </div>
            </div>
          </header>

          <form className="register-form" onSubmit={handleNext} noValidate>
            {currentStep.key === "access" ? (
              <StepAccess form={form} errors={errors} update={update} />
            ) : null}
            {currentStep.key === "owner" ? (
              <StepOwner form={form} errors={errors} update={update} />
            ) : null}
            {currentStep.key === "commerce" ? (
              <StepCommerce
                form={form}
                errors={errors}
                update={update}
                cities={cities}
                categories={categories}
                catalogLoading={catalogLoading}
              />
            ) : null}
            {currentStep.key === "details" ? (
              <StepDetails form={form} errors={errors} update={update} />
            ) : null}

            {globalError ? (
              <div className="register-error-banner" role="alert">
                {globalError}
              </div>
            ) : null}

            {isLastStep ? (
              <label className="register-legal-check">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(event) => {
                    setAcceptedLegal(event.target.checked);
                    setGlobalError(null);
                  }}
                />
                <span>
                  Acepto los <Link to="/terms">Términos y condiciones</Link> y la{" "}
                  <Link to="/privacy">Política de privacidad</Link> de PROMY.
                </span>
              </label>
            ) : null}

            <div className="register-form-actions">
              <button
                type="button"
                className="landing-btn landing-btn-ghost"
                disabled={isFirstStep || submitting}
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              >
                Volver
              </button>
              <button
                type="submit"
                className="landing-btn landing-btn-primary"
                disabled={submitting || (currentStep.key === "commerce" && catalogLoading)}
              >
                {submitting
                  ? "Creando cuenta..."
                  : isLastStep
                    ? "Crear mi cuenta"
                    : "Continuar"}{" "}
                {!submitting ? <IconArrowRight size={14} /> : null}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

/* ====================================================
   Step components
   ==================================================== */

type StepProps = {
  form: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

function StepAccess({ form, errors, update }: StepProps) {
  return (
    <div className="register-form-grid">
      <Field
        label="Email"
        hint="Usalo para iniciar sesión y recibir avisos."
        error={errors.email}
      >
        <input
          type="email"
          className={`register-input ${errors.email ? "is-error" : ""}`}
          placeholder="vos@tunegocio.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          autoComplete="email"
          required
        />
      </Field>

      <Field label="Contraseña" hint={PASSWORD_REQUIREMENTS} error={errors.password}>
        <input
          type="password"
          className={`register-input ${errors.password ? "is-error" : ""}`}
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>

      <Field label="Repetí la contraseña" error={errors.passwordRepeat}>
        <input
          type="password"
          className={`register-input ${errors.passwordRepeat ? "is-error" : ""}`}
          placeholder="••••••••"
          value={form.passwordRepeat}
          onChange={(e) => update("passwordRepeat", e.target.value)}
          autoComplete="new-password"
          required
        />
      </Field>
    </div>
  );
}

function StepOwner({ form, errors, update }: StepProps) {
  return (
    <div className="register-form-grid">
      <Field
        label="¿Cómo te llamás?"
        hint="Tu nombre y apellido, así te identificamos."
        error={errors.fullName}
      >
        <input
          type="text"
          className={`register-input ${errors.fullName ? "is-error" : ""}`}
          placeholder="Ana García"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          autoComplete="name"
          required
        />
      </Field>

      <Field label="Teléfono (opcional)" hint="Para que podamos contactarte si hace falta.">
        <input
          type="tel"
          className="register-input"
          placeholder="+54 9 ..."
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          autoComplete="tel"
        />
      </Field>
    </div>
  );
}

function StepCommerce({
  form,
  errors,
  update,
  cities,
  categories,
  catalogLoading,
}: StepProps & {
  cities: PublicCity[];
  categories: PublicCategory[];
  catalogLoading: boolean;
}) {
  const groupedCities = useMemo(() => {
    const map = new Map<string, PublicCity[]>();
    cities.forEach((c) => {
      const list = map.get(c.province) ?? [];
      list.push(c);
      map.set(c.province, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [cities]);

  return (
    <div className="register-form-grid">
      <Field
        label="Nombre del comercio"
        hint="Como aparece en la fachada o en redes."
        error={errors.commerceName}
      >
        <input
          type="text"
          className={`register-input ${errors.commerceName ? "is-error" : ""}`}
          placeholder="Café Matilda"
          value={form.commerceName}
          onChange={(e) => update("commerceName", e.target.value)}
          required
        />
      </Field>

      <Field label="Dirección" error={errors.address}>
        <input
          type="text"
          className={`register-input ${errors.address ? "is-error" : ""}`}
          placeholder="Av. Siempre Viva 742"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          autoComplete="street-address"
          required
        />
      </Field>

      <div className="register-form-row">
        <Field label="Ciudad" error={errors.cityId}>
          <select
            className={`register-input register-select ${errors.cityId ? "is-error" : ""}`}
            value={form.cityId}
            onChange={(e) => update("cityId", e.target.value)}
            disabled={catalogLoading}
            required
          >
            <option value="">
              {catalogLoading ? "Cargando ciudades..." : "Elegí una ciudad"}
            </option>
            {groupedCities.map(([province, list]) => (
              <optgroup key={province} label={province}>
                {list.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label="Categoría" error={errors.categoryId}>
          <select
            className={`register-input register-select ${errors.categoryId ? "is-error" : ""}`}
            value={form.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            disabled={catalogLoading}
            required
          >
            <option value="">
              {catalogLoading ? "Cargando categorías..." : "Elegí una categoría"}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

function StepDetails({ form, errors, update }: StepProps) {
  return (
    <div className="register-form-grid">
      <Field
        label="Instagram (opcional)"
        hint="Solo el usuario, sin la arroba."
        error={errors.instagram}
      >
        <div className="register-input-prefix">
          <span className="register-input-prefix-text">@</span>
          <input
            type="text"
            className={`register-input has-prefix ${errors.instagram ? "is-error" : ""}`}
            placeholder="tucomercio"
            value={form.instagram}
            onChange={(e) => update("instagram", e.target.value)}
            autoComplete="off"
          />
        </div>
      </Field>

      <Field
        label="Descripción corta (opcional)"
        hint={`${form.shortDescription.length}/160 — la usamos en el listado del mapa.`}
        error={errors.shortDescription}
      >
        <textarea
          className={`register-input register-textarea ${
            errors.shortDescription ? "is-error" : ""
          }`}
          placeholder="Café de especialidad y desayunos en pleno centro."
          value={form.shortDescription}
          onChange={(e) => update("shortDescription", e.target.value)}
          maxLength={160}
          rows={3}
        />
      </Field>

      <p className="register-form-fineprint">
        Al crear tu cuenta vas a recibir un email para verificar tu dirección. Tu comercio queda
        pendiente de aprobación; cuando lo revisemos te avisamos por mail.
      </p>
    </div>
  );
}

/* ====================================================
   Helpers
   ==================================================== */

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="register-field">
      <span className="register-field-label">{label}</span>
      {children}
      {error ? (
        <span className="register-field-error">{error}</span>
      ) : hint ? (
        <span className="register-field-hint">{hint}</span>
      ) : null}
    </label>
  );
}

function PublicTopbar() {
  return (
    <header className="public-topbar">
      <Link to="/" className="public-topbar-brand">
        <PromyMark size="sm" variant="default" />
        <span className="public-topbar-wordmark">PROMY</span>
      </Link>
      <nav className="public-topbar-nav">
        <Link to="/login" className="public-topbar-link">
          Ya tengo cuenta
        </Link>
      </nav>
    </header>
  );
}
