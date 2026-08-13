import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import type { AdminAuditLogItem } from "../../types/api";
import { IconAlert, IconCheck, IconSearch } from "../../components/Icons";

export function PageHeader({
  kicker,
  title,
  titleAccent,
  meta,
  tabs,
}: {
  kicker: string;
  title: string;
  titleAccent?: string;
  meta?: React.ReactNode;
  tabs?: Array<{ to: string; label: string; end?: boolean }>;
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
        {meta ? <div className="page-meta">{meta}</div> : null}
      </div>
      {tabs ? (
        <nav className="subnav">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                isActive ? "subnav-link is-active" : "subnav-link"
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function Toolbar({
  search,
  onSearchChange,
  placeholder,
  countLabel,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  countLabel: string;
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-start">
        <div className="search-input-wrap">
          <IconSearch size={14} className="search-input-icon" />
          <input
            type="search"
            className="search-input"
            placeholder={placeholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>
      <div className="toolbar-end">
        <div className="summary-count">{countLabel}</div>
      </div>
    </div>
  );
}

export function FilterChips({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="chip-row" style={{ marginBottom: 16 }}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={value === option.id ? "chip is-active" : "chip"}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ModerationModal({
  open,
  title,
  description,
  defaultNote,
  requireNote,
  confirmLabel,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  defaultNote: string;
  requireNote: boolean;
  confirmLabel: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState(defaultNote);
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNote(defaultNote);
      setValidation(null);
    }
  }, [defaultNote, open]);

  if (!open) return null;

  const handleSubmit = () => {
    const trimmed = note.trim();
    if (requireNote && trimmed.length < 8) {
      setValidation("Agregá una observación clara para dejar trazabilidad.");
      return;
    }

    onSubmit(note);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="page-kicker">Moderación</div>
        <h2>{title}</h2>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
          {description}
        </p>

        <div className="modal-body">
          <div className="field">
            <label className="field-label">Observación interna</label>
            <textarea
              className="field-textarea"
              placeholder="Dejá una nota para el equipo o para futuras revisiones..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        {validation ? <Alert tone="danger" message={validation} style={{ marginTop: 12 }} /> : null}

        <div className="modal-footer">
          <button className="btn btn-ghost" type="button" disabled={loading} onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "Guardando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuditTimelineCard({
  title,
  subtitle,
  logs,
  emptyMessage,
  inline = false,
}: {
  title: string;
  subtitle: string;
  logs: AdminAuditLogItem[];
  emptyMessage: string;
  inline?: boolean;
}) {
  return (
    <article className={inline ? "audit-card" : "panel"}>
      <div className="page-kicker">Auditoría</div>
      <h2 style={{ fontSize: inline ? 16 : 18, fontWeight: 500, marginTop: 6 }}>{title}</h2>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
        {subtitle}
      </p>

      {logs.length ? (
        <div className="audit-list">
          {logs.map((log) => (
            <div key={log.id} className="audit-item">
              <div className="audit-head">
                <span className="audit-action">{getAuditActionLabel(log.action)}</span>
                <span className="audit-date">{formatDate(log.createdAt)}</span>
              </div>
              <p className="audit-target">
                {log.targetType === "COMMERCE"
                  ? log.commerce?.name || `Comercio #${log.targetId}`
                  : log.promotion?.title || `Promoción #${log.targetId}`}
              </p>
              <p className="audit-user">
                {log.adminUser.fullName} · {log.adminUser.email}
              </p>
              {log.note ? <p className="audit-note">{log.note}</p> : null}
              {log.metadata ? (
                <div className="audit-meta">
                  {log.metadata.previousStatus ? (
                    <span>Antes: {getStatusLabel(String(log.metadata.previousStatus))}</span>
                  ) : null}
                  {log.metadata.nextStatus ? (
                    <span>→ Ahora: {getStatusLabel(String(log.metadata.nextStatus))}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="data-empty">{emptyMessage}</div>
      )}
    </article>
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

export function MiniBadge({
  tone,
  label,
}: {
  tone: "success" | "warning" | "neutral";
  label: string;
}) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

export function StatCard({
  label,
  value,
  sub,
  accentRed = false,
  trend,
  priority = "normal",
}: {
  label: string;
  value: number | string;
  sub?: string;
  accentRed?: boolean;
  trend?: string;
  priority?: "normal" | "critical" | "small";
}) {
  const isCriticalAlert = accentRed && priority === "critical";
  return (
    <article
      className={[
        "stat-card",
        accentRed ? "is-accent-red" : "",
        isCriticalAlert ? "is-critical" : "",
        priority === "small" ? "is-small" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isCriticalAlert ? <div className="stat-card-alert-bar" /> : null}
      <div className="stat-label">{label}</div>
      <div className={isCriticalAlert ? "stat-value stat-value-alert" : "stat-value"}>{value}</div>
      {sub ? <div className="stat-value-sub">{sub}</div> : null}
      {trend ? (
        <div className={isCriticalAlert ? "stat-trend stat-trend-alert" : "stat-trend"}>
          {trend}
        </div>
      ) : null}
    </article>
  );
}

export function MiniBarsCard({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  emptyMessage: string;
}) {
  const visibleItems = items.filter((item) => item.value > 0).slice(0, 5);
  const maxValue = Math.max(...visibleItems.map((item) => item.value), 1);

  return (
    <article className="dashboard-viz-card">
      <div className="panel-heading">
        <div className="panel-heading-stack">
          <h2>{title}</h2>
          <p>Lectura rápida para priorizar operación.</p>
        </div>
      </div>
      {visibleItems.length ? (
        <div className="mini-bars">
          {visibleItems.map((item) => (
            <div className="mini-bar-row" key={item.label}>
              <div className="mini-bar-top">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="mini-bar-track">
                <span style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="data-empty">{emptyMessage}</div>
      )}
    </article>
  );
}

export function MiniSignalCard({
  title,
  success,
  failed,
}: {
  title: string;
  success: number;
  failed: number;
}) {
  const total = success + failed;
  const successRate = total ? Math.round((success / total) * 100) : 0;

  return (
    <article className="dashboard-viz-card dashboard-signal-card">
      <div>
        <div className="panel-heading">
          <div className="panel-heading-stack">
            <h2>{title}</h2>
            <p>Canjes exitosos vs. fallidos.</p>
          </div>
        </div>
        <div className="signal-ring" style={{ ["--rate" as string]: `${successRate}%` }}>
          <span>{successRate}%</span>
        </div>
      </div>
      <div className="signal-legend">
        <span><i className="legend-dot success" /> {success} exitosos</span>
        <span><i className="legend-dot danger" /> {failed} fallidos</span>
      </div>
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
          items.map((item, index) => (
            <div className="data-item" key={`${item.title}-${index}`}>
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

export function buildCityCoverage(cityNames: string[]) {
  const counts = cityNames.reduce<Record<string, number>>((acc, cityName) => {
    acc[cityName] = (acc[cityName] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-row-label">{label}</span>
      <span className="detail-row-value">{value}</span>
    </div>
  );
}

export function formatMissingFields(fields: string[]) {
  if (!fields.length) return "Sin faltantes";

  return fields.map(getMissingFieldLabel).join(" · ");
}

export function LoadingBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="loading-state">
      <h3>
        {title}
        <span className="loading-dots">
          <span />
          <span />
          <span />
        </span>
      </h3>
      <p>{text}</p>
    </div>
  );
}

export function Alert({
  tone,
  message,
  style,
}: {
  tone: "success" | "danger";
  message: string;
  style?: React.CSSProperties;
}) {
  const Icon = tone === "success" ? IconCheck : IconAlert;
  return (
    <div className={`alert alert-${tone}`} style={style}>
      <Icon size={14} className="alert-icon" />
      <span>{message}</span>
    </div>
  );
}

export function getStatusLabel(status: string) {
  return status === "APPROVED"
    ? "Aprobado"
    : status === "PENDING"
    ? "Pendiente"
    : status === "DRAFT"
    ? "Borrador"
    : status === "PENDING_REVIEW"
    ? "En revisión"
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

export function getPromotionTypeLabel(type: string) {
  return type === "PERCENTAGE"
    ? "Porcentaje"
    : type === "FIXED_AMOUNT"
    ? "Monto fijo"
    : type === "BENEFIT"
    ? "Beneficio"
    : type === "TIME_SLOT"
    ? "Franja horaria"
    : type === "DAY_PROMO"
    ? "Día promo"
    : type === "SPECIAL_COMBO"
    ? "Combo"
    : type;
}

export function getMissingFieldLabel(field: string) {
  return field === "address"
    ? "direccion"
    : field === "coordinates"
    ? "coordenadas"
    : field === "shortDescription"
    ? "descripcion corta"
    : field === "description"
    ? "descripcion"
    : field === "phone"
    ? "telefono"
    : field === "instagram"
    ? "instagram"
    : field === "logo"
    ? "logo"
    : field === "cover"
    ? "portada"
    : field === "categoryInactive"
    ? "categoria inactiva"
    : field === "cityInactive"
    ? "ciudad inactiva"
    : field === "status"
    ? "estado no aprobado"
    : field;
}

export function getAuditActionLabel(action: string) {
  return action === "UPDATE_COMMERCE_STATUS"
    ? "Cambio de estado · Comercio"
    : action === "UPDATE_PROMOTION_STATUS"
    ? "Cambio de estado · Promoción"
    : action;
}

export function getCommerceModalTitle(next?: string) {
  return next === "APPROVED"
    ? "Aprobar comercio"
    : next === "REJECTED"
    ? "Rechazar comercio"
    : next === "INACTIVE"
    ? "Inactivar comercio"
    : "Actualizar comercio";
}

export function getPromotionModalTitle(next?: string) {
  return next === "APPROVED_VISIBLE"
    ? "Aprobar y publicar promoción"
    : next === "PENDING_REVIEW"
    ? "Enviar promoción a revisión"
    : next === "REJECTED"
    ? "Rechazar promoción"
    : next === "EXPIRED"
    ? "Expirar promoción"
    : "Actualizar promoción";
}

export function getAvailablePromotionTransitions(status: string) {
  if (status === "DRAFT") {
    return [];
  }

  if (status === "PENDING_REVIEW") {
    return ["APPROVED_VISIBLE", "REJECTED", "EXPIRED"];
  }

  if (status === "APPROVED_VISIBLE") {
    return ["PENDING_REVIEW", "REJECTED", "EXPIRED"];
  }

  if (status === "REJECTED") {
    return ["PENDING_REVIEW", "APPROVED_VISIBLE"];
  }

  if (status === "EXPIRED") {
    return ["PENDING_REVIEW"];
  }

  return [];
}

export function getConfirmLabel(next?: string) {
  return next === "APPROVED" || next === "APPROVED_VISIBLE"
    ? "Confirmar"
    : next === "REJECTED"
    ? "Rechazar"
    : next === "PENDING_REVIEW"
    ? "Mandar a revisión"
    : next === "EXPIRED"
    ? "Expirar"
    : "Guardar";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDiscount(value: number | null | undefined, promotionType: string) {
  if (typeof value !== "number") return "No aplica";
  return promotionType === "FIXED_AMOUNT" ? `$${value}` : `${value}%`;
}
