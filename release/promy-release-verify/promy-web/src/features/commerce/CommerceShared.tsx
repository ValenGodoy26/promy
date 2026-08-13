import React from "react";
import { Link } from "react-router-dom";
import {
  IconAlert,
  IconClock,
} from "../../components/Icons";
import type {
  CommerceManagedProfile,
  CreateCommercePromotionInput,
  PromotionStatus,
  PromotionType,
  UpdateCommercePromotionInput,
  UpdateMyCommerceInput,
  ValidationMethod,
} from "../../types/api";

export type PromotionFormState = {
  title: string;
  description: string;
  conditions: string;
  discountValue: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  imageUrl: string;
  promotionType: PromotionType;
  validationMethod: ValidationMethod;
  status: PromotionStatus;
};

export type CommerceProfileFormState = {
  name: string;
  shortDescription: string;
  description: string;
  address: string;
  phone: string;
  instagram: string;
  logoUrl: string;
  coverUrl: string;
  cityId: string;
  categoryId: string;
  latitude: string;
  longitude: string;
};

export function CommerceOnboardingPanel({
  commerce,
  compact = false,
}: {
  commerce: CommerceManagedProfile;
  compact?: boolean;
}) {
  if (commerce.status === "APPROVED") {
    return null;
  }

  const tone =
    commerce.status === "REJECTED"
      ? "danger"
      : commerce.status === "INACTIVE"
      ? "info"
      : "warning";

  const icon =
    commerce.status === "REJECTED" ? (
      <IconAlert size={14} className="alert-icon" />
    ) : (
      <IconClock size={14} className="alert-icon" />
    );

  return (
    <div className={`commerce-onboarding commerce-onboarding-${tone}${compact ? " is-compact" : ""}`}>
      <div className={`alert alert-${tone}`}>
        {icon}
        <div className="commerce-onboarding-copy">
          <strong>{getCommerceStatusHeadline(commerce.status)}</strong>
          <span>{getCommerceStatusMessage(commerce.status)}</span>
        </div>
      </div>

      <div className="commerce-onboarding-grid">
        <div className="commerce-onboarding-card">
          <span className="commerce-onboarding-label">Estado actual</span>
          <strong>{getStatusLabel(commerce.status)}</strong>
        </div>
        <div className="commerce-onboarding-card">
          <span className="commerce-onboarding-label">Que podes hacer ahora</span>
          <strong>{getCommerceAllowedActionLabel(commerce.status)}</strong>
        </div>
        <div className="commerce-onboarding-card commerce-onboarding-card-wide">
          <span className="commerce-onboarding-label">Observacion del equipo</span>
          <strong>
            {commerce.moderationNote || "Todavia no hay observaciones. Si falta algo, lo vas a ver reflejado aca."}
          </strong>
        </div>
      </div>
    </div>
  );
}

export function CommerceStatusNotices({
  commerce,
  email,
  emailVerifiedAt,
  showProfileLink = true,
}: {
  commerce: CommerceManagedProfile;
  email?: string | null;
  emailVerifiedAt?: string | null;
  showProfileLink?: boolean;
}) {
  const isEmailVerified = Boolean(emailVerifiedAt);
  const isMissingCoordinates =
    commerce.latitude == null ||
    commerce.longitude == null ||
    !Number.isFinite(commerce.latitude) ||
    !Number.isFinite(commerce.longitude);

  return (
    <div className="commerce-status-notices">
      {!isEmailVerified ? (
        <div className="alert alert-warning">
          <IconAlert size={14} className="alert-icon" />
          <div>
            <strong>Te falta verificar tu email.</strong>
            <div>
              Revisá tu correo para activar la cuenta. Hasta verificarlo, algunas acciones del
              panel pueden quedar bloqueadas.
            </div>
            <Link
              className="alert-action-link"
              to={`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            >
              Pedir o usar enlace de verificación
            </Link>
          </div>
        </div>
      ) : null}

      {commerce.status === "PENDING" ? (
        <div className="alert alert-warning">
          <IconClock size={14} className="alert-icon" />
          <div>
            <strong>Tu comercio está pendiente de aprobación.</strong>
            <div>
              Podés completar el perfil y preparar contenido, pero las promociones no se publican
              hasta que el admin apruebe el comercio.
            </div>
          </div>
        </div>
      ) : null}

      {commerce.status === "APPROVED" && isMissingCoordinates ? (
        <div className="alert alert-warning">
          <IconAlert size={14} className="alert-icon" />
          <div>
            <strong>Tu comercio no aparece en el mapa porque faltan coordenadas.</strong>
            <div>
              Cargá latitud y longitud en el perfil para que los clientes te encuentren en la app.
            </div>
            {showProfileLink ? (
              <Link className="alert-action-link" to="/commerce/profile">
                Completar coordenadas
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  titleAccent,
  meta,
}: {
  kicker: string;
  title: string;
  titleAccent?: string;
  meta?: React.ReactNode;
}) {
  return (
    <header className="main-header">
      <div className="page-title-row">
        <div>
          <div className="page-kicker">{kicker}</div>
          <h1 className="page-title">
            {title} {titleAccent && <i>{titleAccent}</i>}
          </h1>
        </div>
        {meta && <div className="page-meta">{meta}</div>}
      </div>
    </header>
  );
}

export function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  inputMode,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
}) {
  return (
    <div className={`field ${className || ""}`}>
      <label className="field-label">{label}</label>
      {multiline ? (
        <textarea
          className="field-textarea"
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="field-input"
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <div className={`field ${className || ""}`}>
      <label className="field-label">{label}</label>
      <select
        className="field-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "APPROVED" || status === "APPROVED_VISIBLE" || status === "SUCCESS"
      ? "success"
      : status === "PENDING" || status === "PENDING_REVIEW"
      ? "warning"
      : status === "REJECTED" || status === "FAILED"
      ? "danger"
      : "neutral";
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" />
      {getStatusLabel(status)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accentRed = false,
}: {
  label: string;
  value: number;
  sub?: string;
  accentRed?: boolean;
}) {
  return (
    <article className={accentRed ? "stat-card is-accent-red" : "stat-card"}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub ? <div className="stat-value-sub">{sub}</div> : null}
    </article>
  );
}

export function DataCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; meta: string }>;
}) {
  return (
    <article className="panel">
      <div className="panel-heading">
        <div className="panel-heading-stack">
          <h2>{title}</h2>
        </div>
      </div>
      <div className="data-list">
        {items.length ? (
          items.map((item, i) => (
            <div className="data-item" key={`${item.title}-${i}`}>
              <div className="data-item-main">
                <div className="data-item-title">{item.title}</div>
                <div className="data-item-meta">{item.meta}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="data-empty">Sin datos para mostrar.</div>
        )}
      </div>
    </article>
  );
}

export function LoadingBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="loading-state">
      <h3>
        {title}
        <span className="loading-dots">
          <span /><span /><span />
        </span>
      </h3>
      <p>{text}</p>
    </div>
  );
}

export function normalizeCommercePayload(form: CommerceProfileFormState): UpdateMyCommerceInput {
  const payload: UpdateMyCommerceInput = {};
  const clearableTextFields: Array<
    keyof Pick<
      UpdateMyCommerceInput,
      "shortDescription" | "description" | "phone" | "instagram" | "logoUrl" | "coverUrl"
    >
  > = ["shortDescription", "description", "phone", "instagram", "logoUrl", "coverUrl"];

  if (form.name.trim()) {
    payload.name = form.name.trim();
  }

  if (form.address.trim()) {
    payload.address = form.address.trim();
  }

  clearableTextFields.forEach((key) => {
    const normalized = form[key].trim();
    payload[key] = normalized || null;
  });

  if (form.cityId.trim()) {
    const parsedCityId = Number(form.cityId.trim());
    if (Number.isFinite(parsedCityId)) {
      payload.cityId = parsedCityId;
    }
  }

  if (form.categoryId.trim()) {
    const parsedCategoryId = Number(form.categoryId.trim());
    if (Number.isFinite(parsedCategoryId)) {
      payload.categoryId = parsedCategoryId;
    }
  }

  const normalizedLatitude = form.latitude.trim();
  const normalizedLongitude = form.longitude.trim();

  if (!normalizedLatitude && !normalizedLongitude) {
    payload.latitude = null;
    payload.longitude = null;
    return payload;
  }

  const parsedLatitude = Number(normalizedLatitude.replace(",", "."));
  const parsedLongitude = Number(normalizedLongitude.replace(",", "."));

  if (Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)) {
    payload.latitude = parsedLatitude;
    payload.longitude = parsedLongitude;
  }

  return payload;
}

export function validatePromotionForm(form: PromotionFormState): string[] {
  const errors: string[] = [];

  if (form.title.trim().length < 3) {
    errors.push("El título debe tener al menos 3 caracteres.");
  }
  if (form.description.trim().length < 3) {
    errors.push("La descripción debe tener al menos 3 caracteres.");
  }

  if (form.promotionType === "PERCENTAGE") {
    const value = Number(form.discountValue.replace(",", "."));
    if (!Number.isFinite(value) || value < 1 || value > 95) {
      errors.push("El descuento debe ser un número entre 1 y 95.");
    }
  }

  if (form.imageUrl.trim()) {
    try {
      new URL(form.imageUrl.trim());
    } catch {
      errors.push("La imagen debe ser una URL válida.");
    }
  }

  if (form.startDate && form.endDate && form.startDate > form.endDate) {
    errors.push("La fecha fin no puede ser anterior a la fecha inicio.");
  }

  if (form.startTime && form.endTime && form.startTime >= form.endTime) {
    errors.push("La hora fin debe ser posterior a la hora inicio.");
  }

  return errors;
}

export function buildPromotionPayload(
  form: PromotionFormState,
  options: { isEdit: true },
): UpdateCommercePromotionInput;
export function buildPromotionPayload(
  form: PromotionFormState,
  options: { isEdit: false },
): CreateCommercePromotionInput;
export function buildPromotionPayload(
  form: PromotionFormState,
  options: { isEdit: boolean },
): CreateCommercePromotionInput | UpdateCommercePromotionInput {
  const discount = form.discountValue.trim() ? Number(form.discountValue.replace(",", ".")) : null;
  const emptyValue = options.isEdit ? null : undefined;

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    validationMethod: form.validationMethod,
    conditions: form.conditions.trim() || emptyValue,
    discountValue: Number.isFinite(discount as number) ? (discount as number) : null,
    startDate: form.startDate
      ? new Date(`${form.startDate}T00:00:00.000Z`).toISOString()
      : emptyValue,
    endDate: form.endDate
      ? new Date(`${form.endDate}T00:00:00.000Z`).toISOString()
      : emptyValue,
    startTime: form.startTime.trim() || emptyValue,
    endTime: form.endTime.trim() || emptyValue,
    imageUrl: form.imageUrl.trim() || emptyValue,
    promotionType: form.promotionType,
    status: form.status,
  };
}

export function getPromotionWorkflowGuidance(input: {
  isEdit: boolean;
  currentStatus: PromotionStatus;
  selectedStatus: PromotionStatus;
  moderationNote?: string | null;
}) {
  if (!input.isEdit) {
    return input.selectedStatus === "PENDING_REVIEW"
      ? {
          tone: "warning" as const,
          title: "Lista para revision",
          body: "Cuando guardes esta promo se envia al equipo admin y no se muestra en la app hasta quedar aprobada.",
          note: null,
        }
      : {
          tone: "info" as const,
          title: "Borrador privado",
          body: "La promo queda solo para tu panel. No aparece en mapa, busqueda ni catalogo publico.",
          note: null,
        };
  }

  if (
    input.currentStatus === "APPROVED_VISIBLE" ||
    input.currentStatus === "REJECTED" ||
    input.currentStatus === "EXPIRED"
  ) {
    return {
      tone: input.currentStatus === "APPROVED_VISIBLE" ? ("info" as const) : ("warning" as const),
      title:
        input.currentStatus === "APPROVED_VISIBLE"
          ? "Editar vuelve a revision"
          : "Correccion con nuevo control",
      body:
        "Si guardas cambios de contenido sobre esta promo, PROMY la devuelve automaticamente a revision antes de volver a publicarse.",
      note: input.moderationNote
        ? `Observacion actual del equipo: ${input.moderationNote}`
        : null,
    };
  }

  if (input.currentStatus === "PENDING_REVIEW") {
    return {
      tone: "warning" as const,
      title: "En revision administrativa",
      body: "La promo ya esta enviada. Si la dejas en este estado, solo queda esperar decision de admin.",
      note: null,
    };
  }

  return {
    tone: input.selectedStatus === "PENDING_REVIEW" ? ("warning" as const) : ("info" as const),
    title: input.selectedStatus === "PENDING_REVIEW" ? "Enviar a revision" : "Seguir en borrador",
    body:
      input.selectedStatus === "PENDING_REVIEW"
        ? "Al guardar, la promo pasa al circuito de moderacion y sigue oculta hasta aprobacion admin."
        : "Al guardar, la promo sigue en borrador y todavia no entra al flujo publico.",
    note: null,
  };
}

export function getStatusLabel(status: string) {
  return status === "APPROVED"
    ? "Aprobado"
    : status === "PENDING"
    ? "Pendiente"
    : status === "DRAFT"
    ? "Borrador"
    : status === "PENDING_REVIEW"
    ? "En revision"
    : status === "APPROVED_VISIBLE"
    ? "Visible"
    : status === "REJECTED"
    ? "Rechazado"
    : status === "INACTIVE"
    ? "Inactivo"
    : status === "ACTIVE"
    ? "Activa"
    : status === "SUCCESS"
    ? "Exitoso"
    : status === "FAILED"
    ? "Fallido"
    : status === "EXPIRED"
    ? "Expirada"
    : status;
}

export function getPromotionTypeLabel(type: PromotionType) {
  return type === "PERCENTAGE"
    ? "Descuento"
    : type === "SPECIAL_COMBO"
    ? "Combo"
    : type === "BENEFIT"
    ? "Beneficio"
    : type === "FIXED_AMOUNT"
    ? "Monto fijo"
    : type === "TIME_SLOT"
    ? "Franja horaria"
    : type === "DAY_PROMO"
    ? "Día promo"
    : (type as string);
}

export function getCommerceStatusHeadline(status?: string | null) {
  if (status === "PENDING") return "Tu comercio esta en revision";
  if (status === "REJECTED") return "Tu alta necesita correcciones";
  if (status === "INACTIVE") return "Tu comercio esta inactivo";
  return "Estado del comercio";
}

export function getCommerceStatusMessage(status?: string | null) {
  if (status === "PENDING") {
    return "Ya recibimos el alta. Mientras revisamos la informacion, podes completar y ajustar el perfil del negocio.";
  }
  if (status === "REJECTED") {
    return "El equipo encontro algo para corregir antes de habilitar la operacion. Revisa la observacion, actualiza los datos y volve a consultar con admin.";
  }
  if (status === "INACTIVE") {
    return "El negocio existe en la plataforma, pero no está habilitado para operar promociones o cambios sensibles hasta nueva activacion.";
  }
  return "Tu comercio esta listo para operar.";
}

export function getCommerceAllowedActionLabel(status?: string | null) {
  if (status === "PENDING") return "Editar perfil y preparar contenido";
  if (status === "REJECTED") return "Corregir datos del negocio";
  if (status === "INACTIVE") return "Consultar con soporte o admin";
  return "Operar normalmente";
}

export function getCommerceBlockedActionLabel(status?: string | null) {
  if (status === "PENDING") {
    return "Pendiente de aprobacion: aun no podes publicar promociones.";
  }
  if (status === "REJECTED") {
    return "Alta rechazada: corregi el perfil antes de volver a operar.";
  }
  if (status === "INACTIVE") {
    return "Comercio inactivo: la operacion esta pausada.";
  }
  return "Operacion disponible";
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function normalizeValidationCode(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").trim();
}

type BrowserBarcodeDetector = {
  detect: (
    source: HTMLVideoElement,
  ) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BrowserBarcodeDetector;

export function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  return typeof window !== "undefined" && "BarcodeDetector" in window
    ? ((window as Window & { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector ?? null)
    : null;
}
