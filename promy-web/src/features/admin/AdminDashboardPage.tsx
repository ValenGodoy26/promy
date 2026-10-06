import React, { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchAdminAuditLogs, fetchAdminDashboard } from "../../lib/api";
import type { AdminAuditLogItem, AdminDashboardResponse } from "../../types/api";
import { getUserFacingErrorMessage } from "../../lib/httpErrors";
import { IconActivity, IconAlert, IconShield } from "../../components/Icons";
import {
  AdminErrorState,
  AuditTimelineCard,
  buildCityCoverage,
  DataCard,
  formatShortDate,
  getStatusLabel,
  LoadingBlock,
  MiniBarsCard,
  MiniSignalCard,
  AdminPageFrame,
  StatusBadge,
} from "./AdminShared";

export function AdminDashboardPage({
  realtimeVersion,
}: {
  realtimeVersion: number;
}) {
  const { withSession } = useAuth();
  const [data, setData] = useState<AdminDashboardResponse["dashboard"] | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const [dashboardResponse, auditResponse] = await Promise.all([
      withSession((s) => fetchAdminDashboard(s)),
      withSession((s) => fetchAdminAuditLogs(s, { limit: 8 })),
    ]);
    setData(dashboardResponse.dashboard);
    setAuditLogs(auditResponse.auditLogs);
    setError(null);
  }, [withSession]);

  useEffect(() => {
    void loadDashboard().catch((loadError) => {
      setError(getUserFacingErrorMessage(loadError, "load"));
    });
  }, [loadDashboard, realtimeVersion]);

  const dateLabel = formatShortDate(new Date().toISOString());
  const reviewedCommerces = data
    ? data.metrics.commerces.approved + data.metrics.commerces.rejected
    : 0;
  const cityCoverage = data
    ? buildCityCoverage(data.recentCommerces.map((commerce) => commerce.city.name))
    : [];

  return (
    <>
      <AdminPageFrame
        kicker="Admin / Vista general"
        title="Dashboard"
        description="Prioridades, señales operativas y actividad reciente de PROMY."
        meta={
          <>
            <span className="page-meta-item">
              <IconActivity size={12} /> En vivo
            </span>
            <span className="page-meta-item">{dateLabel}</span>
          </>
        }
      />

      <div className="main-content admin-dashboard-page">
        {!data && !error ? (
          <LoadingBlock title="Cargando dashboard" text="Trayendo métricas globales." />
        ) : null}

        {error ? (
          <AdminErrorState
            message={error}
            onRetry={() => void loadDashboard().catch((loadError) => setError(getUserFacingErrorMessage(loadError, "load")))}
          />
        ) : null}

        {data ? (
          <>
            {data.metrics.business.incidentsOpen > 0 ? (
              <div className="admin-alert-strip admin-dashboard-alert">
                <div className="admin-alert-icon">
                  <IconAlert size={18} />
                </div>
                <div>
                  <h3>{data.metrics.business.incidentsOpen} incidencias abiertas</h3>
                  <p>Hay señales que conviene revisar antes de seguir operando.</p>
                </div>
                <NavLink to="/admin/audit" className="admin-alert-link">
                  Ver auditoría
                </NavLink>
              </div>
            ) : (
              <div className="commerce-strip admin-dashboard-alert">
                <div className="commerce-strip-main">
                  <div className="commerce-strip-icon">
                    <IconShield size={18} />
                  </div>
                  <div className="commerce-strip-text">
                    <h3>Operación estable</h3>
                    <p>No hay incidencias críticas abiertas en este momento.</p>
                  </div>
                </div>
                <div className="commerce-strip-meta">
                  <StatusBadge status={data.metrics.commerces.pending > 0 ? "PENDING" : "ACTIVE"} />
                  <span className="commerce-strip-slug">Backoffice PROMY</span>
                </div>
              </div>
            )}

            <section className="admin-dashboard-section" aria-labelledby="admin-dashboard-priorities-title">
              <div className="admin-dashboard-section-heading">
                <div>
                  <span className="page-kicker">Prioridades</span>
                  <h2 id="admin-dashboard-priorities-title">Qué necesita atención</h2>
                </div>
                <span className="admin-dashboard-section-note">Colas y excepciones operativas</span>
              </div>
              <div className="admin-dashboard-priority-grid">
                <PriorityItem
                  label="Comercios por revisar"
                  value={data.metrics.commerces.pending}
                  detail={`${data.metrics.commerces.approved} aprobados de ${data.metrics.commerces.total}`}
                  to="/admin/commerces"
                  tone={data.metrics.commerces.pending > 0 ? "warning" : "neutral"}
                />
                <PriorityItem
                  label="Promos en revisión"
                  value={data.metrics.promotions.pendingReview}
                  detail={`${data.metrics.promotions.approvedVisible} visibles de ${data.metrics.promotions.total}`}
                  to="/admin/promotions"
                  tone={data.metrics.promotions.pendingReview > 0 ? "warning" : "neutral"}
                />
                <PriorityItem
                  label="Incidencias abiertas"
                  value={data.metrics.business.incidentsOpen}
                  detail={`${data.metrics.business.failedRedemptionsLast30Days} fallos de canje en 30 días`}
                  to="/admin/audit"
                  tone={data.metrics.business.incidentsOpen > 0 ? "danger" : "neutral"}
                />
                <PriorityItem
                  label="Aprobados sin coordenadas"
                  value={data.metrics.business.approvedMissingCoordinates}
                  detail={`${data.metrics.business.mapReadyCommerces} comercios listos en mapa`}
                  to="/admin/commerces"
                  tone={data.metrics.business.approvedMissingCoordinates > 0 ? "warning" : "neutral"}
                />
              </div>
            </section>

            <section className="admin-dashboard-section admin-dashboard-overview" aria-labelledby="admin-dashboard-overview-title">
              <div className="admin-dashboard-section-heading">
                <div>
                  <span className="page-kicker">Resumen</span>
                  <h2 id="admin-dashboard-overview-title">Pulso de la plataforma</h2>
                </div>
              </div>
              <div className="admin-dashboard-kpi-strip">
                <CompactMetric
                  label="Usuarios"
                  value={data.metrics.users.total}
                  detail={`${data.metrics.users.active} activos · ${data.metrics.users.clients} clientes`}
                />
                <CompactMetric
                  label="Canjes"
                  value={data.metrics.redemptions.total}
                  detail={`${data.metrics.redemptions.success} exitosos · ${data.metrics.redemptions.failed} fallidos`}
                />
                <CompactMetric
                  label="Aprobación"
                  value={`${data.metrics.business.approvalRate}%`}
                  detail={`${data.metrics.commerces.approved}/${reviewedCommerces || 0} revisados`}
                />
                <CompactMetric
                  label="Éxito de canjes"
                  value={`${data.metrics.business.redemptionSuccessRate}%`}
                  detail="sobre canjes totales"
                />
                <CompactMetric
                  label="Clientes activos 30d"
                  value={data.metrics.business.monthlyActiveClients}
                  detail={`${data.metrics.business.successfulRedemptionsLast30Days} canjes exitosos`}
                />
              </div>
            </section>

            <section className="admin-dashboard-section" aria-labelledby="admin-dashboard-signals-title">
              <div className="admin-dashboard-section-heading">
                <div>
                  <span className="page-kicker">Actividad</span>
                  <h2 id="admin-dashboard-signals-title">Señales de uso</h2>
                </div>
                <span className="admin-dashboard-section-note">Lectura secundaria, sin competir con las prioridades</span>
              </div>
              <div className="dashboard-viz-grid admin-dashboard-viz-grid">
                <MiniBarsCard
                  title="Comercios con más canjes"
                  items={data.leaderboards.topCommerces.map((commerce) => ({
                    label: commerce.name,
                    value: commerce.redemptionsCount,
                  }))}
                  emptyMessage="Todavía no hay canjes suficientes."
                />
                <MiniBarsCard
                  title="Comercios recientes por ciudad"
                  items={cityCoverage}
                  emptyMessage="No hay comercios recientes en el período informado."
                />
                <MiniSignalCard
                  title="Loop de canjes"
                  success={data.metrics.redemptions.success}
                  failed={data.metrics.redemptions.failed}
                />
              </div>
            </section>

            <section className="admin-dashboard-section" aria-labelledby="admin-dashboard-activity-title">
              <div className="admin-dashboard-section-heading">
                <div>
                  <span className="page-kicker">Backoffice</span>
                  <h2 id="admin-dashboard-activity-title">Actividad y contexto</h2>
                </div>
              </div>
              <div className="content-grid main-side admin-dashboard-activity-grid">
                <AuditTimelineCard
                  title="Actividad reciente"
                  subtitle="Últimas acciones administrativas registradas"
                  logs={auditLogs}
                  emptyMessage="Todavía no hay movimientos de auditoría."
                  compact
                />
                <DataCard
                  title="Incidentes recientes"
                  items={data.recentIncidents.map((incident) => ({
                    title: incident.title,
                    meta: `${incident.kind === "COMMERCE" ? "Comercio" : "Promoción"} · ${getStatusLabel(
                      incident.status,
                    )}${incident.note ? ` · ${incident.note}` : ""}`,
                  }))}
                />
              </div>
              <div className="content-grid admin-dashboard-context-grid">
                <DataCard
                  title="Comercios recientes"
                  items={data.recentCommerces.map((commerce) => ({
                    title: commerce.name,
                    meta: `${getStatusLabel(commerce.status)} · ${commerce.owner.fullName}`,
                  }))}
                />
                <DataCard
                  title="Top promociones usadas"
                  items={data.leaderboards.topPromotions.map((promotion) => ({
                    title: promotion.title,
                    meta: `${promotion.redemptionsCount} canjes · ${promotion.commerce.name}`,
                  }))}
                />
                <DataCard
                  title="Seguimiento operativo"
                  items={[
                    {
                      title: "Comercios dormidos",
                      meta: `${data.metrics.business.dormantApprovedCommerces} aprobados sin actividad reciente`,
                    },
                    {
                      title: "Aprobados sin promos",
                      meta: `${data.metrics.business.approvedWithoutPromotions} comercios listos pero vacíos`,
                    },
                    {
                      title: "Comercios en mapa",
                      meta: `${data.metrics.business.mapReadyCommerces} listos para descubrimiento`,
                    },
                  ]}
                />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}

function PriorityItem({
  label,
  value,
  detail,
  to,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  to: string;
  tone: "neutral" | "warning" | "danger";
}) {
  return (
    <article className={`admin-dashboard-priority-item is-${tone}`}>
      <div className="admin-dashboard-priority-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <NavLink to={to} className="admin-dashboard-priority-link">
        Revisar
      </NavLink>
    </article>
  );
}

function CompactMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="admin-dashboard-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
