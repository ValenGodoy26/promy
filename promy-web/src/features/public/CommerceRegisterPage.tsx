import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { fetchCategories, fetchCities, registerCommerceRequest } from "../../lib/api";
import { getUserFacingErrorMessage } from "../../lib/httpErrors";
import type { PublicCategory } from "../../types/api";
import { PromyMark } from "../../components/Logo";
import { IconArrowRight, IconCheck, IconStore } from "../../components/Icons";
import { getCommercePhoneError } from "../commerce/commerceRules";

type StepKey = "access" | "owner" | "commerce" | "details";

const STEPS: { key: StepKey; label: string; helper: string }[] = [
  { key: "access", label: "Acceso", helper: "Tu email y una contraseña" },
  { key: "owner", label: "Tus datos", helper: "Datos de contacto" },
  { key: "commerce", label: "Tu comercio", helper: "Información del comercio" },
  { key: "details", label: "Contanos más", helper: "Últimos detalles" },
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

function normalizeDevelopmentVerificationLink(link: string | null) {
  if (!link || !import.meta.env.DEV || typeof window === "undefined") return link;

  try {
    const url = new URL(link);
    const isLocalHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.startsWith("192.168.") ||
      url.hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);

    if (!isLocalHost) return link;
    return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return link;
  }
}

export default function CommerceRegisterPage() {
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [verificationPreviewLink, setVerificationPreviewLink] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogRetryNonce, setCatalogRetryNonce] = useState(0);

  // Concordia and the category catalog are only needed on step 3. Loading them lazily keeps
  // an unrelated catalog/network issue from interrupting the access step.
  useEffect(() => {
    if (stepIdx !== 2 || catalogLoaded) return;

    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);

    Promise.all([fetchCities(), fetchCategories()])
      .then(([citiesRes, catsRes]) => {
        if (cancelled) return;

        const availableCities = citiesRes.cities ?? [];
        const concordia =
          availableCities.find((city) => city.slug === "concordia") ??
          availableCities.find((city) => city.name.trim().toLowerCase() === "concordia") ??
          (availableCities.length === 1 ? availableCities[0] : undefined);
        const activeCategories = (catsRes.categories ?? []).filter((category) => category.isActive !== false);

        if (!concordia) {
          throw new Error("No pudimos preparar Concordia para el registro.");
        }
        if (activeCategories.length === 0) {
          throw new Error("No pudimos cargar las categorías.");
        }

        setForm((prev) => ({ ...prev, cityId: String(concordia.id) }));
        setErrors((prev) => ({ ...prev, cityId: undefined }));
        setCategories(activeCategories);
        setCatalogLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        const fallback = "No pudimos cargar las categorías. Revisá tu conexión o volvé a intentar.";
        const message =
          error instanceof Error && error.message.includes("Concordia")
            ? error.message
            : getUserFacingErrorMessage(error, "load");
        setCatalogError(message === "No pudimos cargar la información. Intentá nuevamente." ? fallback : message);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stepIdx, catalogLoaded, catalogRetryNonce]);

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
      const phoneError = getCommercePhoneError(form.phone);
      if (phoneError) next.phone = phoneError;
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
      setVerificationPreviewLink(
        normalizeDevelopmentVerificationLink(response.verification?.link || null),
      );
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
              Recibimos tu solicitud. Verificá tu email para continuar. Después revisaremos los
              datos de tu comercio y te avisaremos cuando esté aprobado.
            </p>
            {verificationPreviewLink ? (
              <div className="register-dev-access" role="note">
                <div className="auth-preview-label">Acceso de desarrollo</div>
                <span>Podés abrir la verificación directamente desde este entorno local.</span>
              </div>
            ) : (
              <p className="register-form-fineprint register-success-email">
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
            <div>
              <div className="register-aside-eyebrow">Bienvenido</div>
              <h1 className="register-aside-title">
                Prepará tu comercio para <em>PROMY</em>.
              </h1>
            </div>
          </div>

          <ul className="register-aside-bullets">
            <li>
              <span className="register-aside-bullet-icon"><IconCheck size={14} /></span>
              <div>
                <strong>Empezá en pocos pasos</strong>
                <p>Creá tu cuenta, completá tu comercio y envialo a revisión.</p>
              </div>
            </li>
            <li>
              <span className="register-aside-bullet-icon"><IconCheck size={14} /></span>
              <div>
                <strong>Aparecé cerca de tus clientes</strong>
                <p>Tu local en el mapa, con tus promociones visibles para gente del barrio.</p>
              </div>
            </li>
            <li>
              <span className="register-aside-bullet-icon"><IconCheck size={14} /></span>
              <div>
                <strong>Métricas que sirven</strong>
                <p>Conocé qué promociones reciben más vistas, interés y canjes.</p>
              </div>
            </li>
          </ul>
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
                categories={categories}
                catalogLoading={catalogLoading}
                catalogError={catalogError}
                onRetryCatalog={() => {
                  setCatalogLoaded(false);
                  setCatalogRetryNonce((value) => value + 1);
                }}
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

            <div className={`register-form-actions ${isFirstStep ? "is-first-step" : ""}`}>
              {!isFirstStep ? (
                <button
                  type="button"
                  className="landing-btn landing-btn-ghost"
                  disabled={submitting}
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                >
                  Volver
                </button>
              ) : null}
              <button
                type="submit"
                className="landing-btn landing-btn-primary"
                disabled={
                  submitting ||
                  (currentStep.key === "commerce" && (catalogLoading || Boolean(catalogError)))
                }
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
        fieldId="register-email"
        label="Email"
        hint="Usalo para iniciar sesión y recibir avisos."
        error={errors.email}
      >
        <input
          id="register-email"
          name="email"
          type="email"
          className={`register-input ${errors.email ? "is-error" : ""}`}
          placeholder="vos@tunegocio.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          autoComplete="email"
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "register-email-error" : "register-email-hint"}
        />
      </Field>

      <Field fieldId="register-password" label="Contraseña" hint={PASSWORD_REQUIREMENTS} error={errors.password}>
        <input
          id="register-password"
          name="password"
          type="password"
          className={`register-input ${errors.password ? "is-error" : ""}`}
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "register-password-error" : "register-password-hint"}
        />
      </Field>

      <Field fieldId="register-password-repeat" label="Repetí la contraseña" error={errors.passwordRepeat}>
        <input
          id="register-password-repeat"
          name="passwordRepeat"
          type="password"
          className={`register-input ${errors.passwordRepeat ? "is-error" : ""}`}
          placeholder="••••••••"
          value={form.passwordRepeat}
          onChange={(e) => update("passwordRepeat", e.target.value)}
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.passwordRepeat)}
          aria-describedby={errors.passwordRepeat ? "register-password-repeat-error" : undefined}
        />
      </Field>
    </div>
  );
}

function StepOwner({ form, errors, update }: StepProps) {
  return (
    <div className="register-form-grid">
      <Field
        fieldId="register-full-name"
        label="¿Cómo te llamás?"
        hint="Tu nombre y apellido, así te identificamos."
        error={errors.fullName}
      >
        <input
          id="register-full-name"
          name="fullName"
          type="text"
          className={`register-input ${errors.fullName ? "is-error" : ""}`}
          placeholder="Ana García"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          autoComplete="name"
          required
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? "register-full-name-error" : "register-full-name-hint"}
        />
      </Field>

      <Field
        fieldId="register-phone"
        label="Teléfono (opcional)"
        hint="Lo usamos sólo si necesitamos contactarte."
        error={errors.phone}
      >
        <input
          id="register-phone"
          name="phone"
          type="tel"
          className={`register-input ${errors.phone ? "is-error" : ""}`}
          placeholder="+54 9 ..."
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "register-phone-error" : "register-phone-hint"}
        />
      </Field>
    </div>
  );
}

function StepCommerce({
  form,
  errors,
  update,
  categories,
  catalogLoading,
  catalogError,
  onRetryCatalog,
}: StepProps & {
  categories: PublicCategory[];
  catalogLoading: boolean;
  catalogError: string | null;
  onRetryCatalog: () => void;
}) {
  return (
    <div className="register-form-grid">
      <Field
        fieldId="register-commerce-name"
        label="Nombre del comercio"
        hint="Como aparece en la fachada o en redes."
        error={errors.commerceName}
      >
        <input
          id="register-commerce-name"
          name="commerceName"
          type="text"
          className={`register-input ${errors.commerceName ? "is-error" : ""}`}
          placeholder="Café Matilda"
          value={form.commerceName}
          onChange={(e) => update("commerceName", e.target.value)}
          required
          aria-invalid={Boolean(errors.commerceName)}
          aria-describedby={errors.commerceName ? "register-commerce-name-error" : "register-commerce-name-hint"}
        />
      </Field>

      <Field fieldId="register-address" label="Dirección" error={errors.address}>
        <input
          id="register-address"
          name="address"
          type="text"
          className={`register-input ${errors.address ? "is-error" : ""}`}
          placeholder="Av. Siempre Viva 742"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          autoComplete="street-address"
          required
          aria-invalid={Boolean(errors.address)}
          aria-describedby={errors.address ? "register-address-error" : undefined}
        />
      </Field>

      {catalogError ? (
        <div className="register-catalog-error" role="alert">
          <div>
            <strong>No pudimos cargar las categorías.</strong>
            <span>Revisá tu conexión o volvé a intentar.</span>
          </div>
          <button type="button" className="register-retry-btn" onClick={onRetryCatalog}>
            Reintentar
          </button>
        </div>
      ) : null}

      <div className="register-form-row register-commerce-location-row">
        <div className="register-field">
          <span className="register-field-label">Ubicación</span>
          <div
            className={`register-fixed-location ${errors.cityId ? "is-error" : ""}`}
            aria-label="Ubicación fija: Concordia, Entre Ríos"
          >
            <span className="register-fixed-location-dot" aria-hidden="true" />
            <span>Concordia, Entre Ríos</span>
          </div>
          {errors.cityId ? (
            <span id="register-city-error" className="register-field-error" role="alert">
              {errors.cityId}
            </span>
          ) : null}
        </div>

        <div className="register-field">
          <label className="register-field-label" htmlFor="register-category">
            Categoría
          </label>
          <CategoryPicker
            categories={categories}
            value={form.categoryId}
            loading={catalogLoading}
            error={Boolean(errors.categoryId)}
            onChange={(value) => update("categoryId", value)}
          />
          {errors.categoryId ? (
            <span id="register-category-error" className="register-field-error" role="alert">
              {errors.categoryId}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CategoryPicker({
  categories,
  value,
  loading,
  error,
  onChange,
}: {
  categories: PublicCategory[];
  value: string;
  loading: boolean;
  error: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = categories.find((category) => String(category.id) === value);

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="register-category-picker" ref={rootRef}>
      <button
        id="register-category"
        name="categoryId"
        type="button"
        className={`register-input register-category-trigger ${error ? "is-error" : ""}`}
        disabled={loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="register-category-options"
        aria-invalid={error}
        aria-describedby={error ? "register-category-error" : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? "" : "register-category-placeholder"}>
          {loading ? "Cargando categorías..." : selected?.name ?? "Elegí una categoría"}
        </span>
        <span className={`register-category-chevron ${open ? "is-open" : ""}`} aria-hidden="true" />
      </button>

      {open && !loading ? (
        <div
          id="register-category-options"
          className="register-category-menu"
          role="listbox"
          aria-label="Categorías disponibles"
        >
          {categories.map((category) => {
            const isSelected = String(category.id) === value;
            return (
              <button
                key={category.id}
                type="button"
                className={`register-category-option ${isSelected ? "is-selected" : ""}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(String(category.id));
                  setOpen(false);
                }}
              >
                <span>{category.name}</span>
                {isSelected ? <IconCheck size={14} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}


function StepDetails({ form, errors, update }: StepProps) {
  return (
    <div className="register-form-grid">
      <Field
        fieldId="register-instagram"
        label="Instagram (opcional)"
        hint="Solo el usuario, sin la arroba."
        error={errors.instagram}
      >
        <div className="register-input-prefix">
          <span className="register-input-prefix-text">@</span>
          <input
            id="register-instagram"
            name="instagram"
            type="text"
            className={`register-input has-prefix ${errors.instagram ? "is-error" : ""}`}
            placeholder="tucomercio"
            value={form.instagram}
            onChange={(e) => update("instagram", e.target.value)}
            autoComplete="off"
            aria-invalid={Boolean(errors.instagram)}
            aria-describedby={errors.instagram ? "register-instagram-error" : "register-instagram-hint"}
          />
        </div>
      </Field>

      <Field
        fieldId="register-description"
        label="Descripción corta (opcional)"
        hint={`${form.shortDescription.length}/160 · Se muestra en tu perfil y en la app.`}
        error={errors.shortDescription}
      >
        <textarea
          id="register-description"
          name="shortDescription"
          className={`register-input register-textarea ${
            errors.shortDescription ? "is-error" : ""
          }`}
          placeholder="Café de especialidad y desayunos en pleno centro."
          value={form.shortDescription}
          onChange={(e) => update("shortDescription", e.target.value)}
          maxLength={160}
          rows={3}
          aria-invalid={Boolean(errors.shortDescription)}
          aria-describedby={errors.shortDescription ? "register-description-error" : "register-description-hint"}
        />
      </Field>

      <p className="register-form-fineprint">
        Al crear tu cuenta te enviaremos un email de verificación. Tu comercio quedará pendiente
        de revisión y te avisaremos cuando esté aprobado.
      </p>
    </div>
  );
}

/* ====================================================
   Helpers
   ==================================================== */

function Field({
  fieldId,
  label,
  hint,
  error,
  children,
}: {
  fieldId: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="register-field" htmlFor={fieldId}>
      <span className="register-field-label">{label}</span>
      {children}
      {error ? (
        <span id={`${fieldId}-error`} className="register-field-error" role="alert">{error}</span>
      ) : hint ? (
        <span id={`${fieldId}-hint`} className="register-field-hint">{hint}</span>
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
