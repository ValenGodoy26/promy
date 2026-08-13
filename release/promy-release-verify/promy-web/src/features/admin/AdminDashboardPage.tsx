import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchAdminAuditLogs, fetchAdminDashboard } from "../../lib/api";
import type { AdminAuditLogItem, AdminDashboardResponse } from "../../types/api";
import { IconActivity, IconAlert, IconShield } from "../../components/Icons";
import {
  Alert,
  AuditTimelineCard,
  buildCityCoverage,
  DataCard,
  formatShortDate,
  getStatusLabel,
  LoadingBlock,
  MiniBarsCard,
  MiniSignalCard,
  PageHeader,
  StatCard,
  StatusBadge,
} from "./AdminShared";

export function AdminDashboardPage({
  tabs,
  realtimeVersion,
}: {
  tabs: Array<{ to: string; label: string; end?: boolean }>;
  realtimeVersion: number;
}) {
  const { withSession } = useAuth();
  const [data, setData] = useState<AdminDashboardResponse["dashboard"] | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      withSession((s) => fetchAdminDashboard(s)),
      withSession((s) => fetchAdminAuditLogs(s, { limit: 8 })),
    ])
      .then(([dashboardResponse, auditResponse]) => {
        setData(dashboardResponse.dashboard);
        setAuditLogs(auditResponse.auditLogs);
        setError(null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar admin.");
      });
  }, [realtimeVersion, withSession]);

  const dateLabel = formatShortDate(new Date().toISOString());
  const reviewedCommerces = data
    ? data.metrics.commerces.approved + data.metrics.commerces.rejected
    : 0;
  const cityCoverage = data
    ? buildCityCoverage(data.recentCommerces.map((commerce) => commerce.city.name))
    : [];

  return (
    <>
      <PageHeader
        kicker="Admin / Vista general"
        title="Dashboard"
        tabs={tabs}
        meta={
          <>
            <span className="page-meta-item">
              <IconActivity size={12} /> En vivo
            </span>
            <span className="page-meta-item">{dateLabel}</span>
          </>
        }
      />

      <div className="main-content">
        {!data && !error ? (
          <LoadingBlock title="Cargando dashboard" text="Trayendo métricas globales." />
        ) : null}

        {error ? <Alert tone="danger" message={error} /> : null}

        {data ? (
          <>
            {data.metrics.business.incidentsOpen > 0 ? (
              <div className="admin-alert-strip">
                <div className="admin-alert-icon">
                  <IconAlert size={18} />
                </div>
                <div>
                  <h3>{data.metrics.business.incidentsOpen} incidencias abiertas</h3>
                  <p>
                    Revisá comercios pendientes, promociones rechazadas o canjes fallidos antes de
                    seguir operando.
                  </p>
                </div>
                <NavLink to="/admin/audit" className="admin-alert-link">
                  Ver auditoría
                </NavLink>
              </div>
            ) : (
              <div className="commerce-strip">
                <div className="commerce-strip-main">
                  <div className="commerce-strip-icon">
                    <IconShield size={18} />
                  </div>
                  <div className="commerce-strip-text">
                    <h3>Backoffice PROMY</h3>
                    <p>Moderación, auditoría y métricas operativas de toda la plataforma</p>
                  </div>
                </div>
                <div className="commerce-strip-meta">
                  <StatusBadge status={data.metrics.commerces.pending > 0 ? "PENDING" : "ACTIVE"} />
                  <span className="commerce-strip-slug">Sin incidencias críticas abiertas</span>
                </div>
              </div>
            )}

            <div className="stats-grid admin-stats-grid">
              <StatCard
                label="Usuarios"
                value={data.metrics.users.total}
                sub={`${data.metrics.users.active} activos · ${data.metrics.users.clients} clientes`}
                trend={`+${data.metrics.users.active} activos`}
              />
              <StatCard
                label="Comercios"
                value={data.metrics.commerces.total}
                sub={`${data.metrics.commerces.approved} aprobados · ${data.metrics.commerces.pending} pendientes`}
                accentRed={data.metrics.commerces.pending > 0}
                priority={data.metrics.commerces.pending > 0 ? "critical" : "normal"}
                trend={`${data.metrics.commerces.pending} por revisar`}
              />
              <StatCard
                label="Promos visibles"
                value={data.metrics.promotions.approvedVisible}
                sub={`${data.metrics.promotions.total} totales · ${data.metrics.promotions.pendingReview} en revisión`}
                accentRed={data.metrics.promotions.pendingReview > 0}
                trend={`${data.metrics.promotions.pendingReview} en revisión`}
              />
              <StatCard
                label="Canjes"
                value={data.metrics.redemptions.total}
                sub={`${data.metrics.redemptions.success} exitosos · ${data.metrics.redemptions.failed} fallidos`}
                trend={`${data.metrics.business.successfulRedemptionsLast30Days} en 30 días`}
              />
              <StatCard
                label="Aprobación"
                value={`${data.metrics.business.approvalRate}%`}
                sub={`${data.metrics.commerces.approved}/${reviewedCommerces || 0} revisados · ${data.metrics.commerces.pending} pendientes aparte`}
              />
              <StatCard
                label="Éxito de canjes"
                value={`${data.metrics.business.redemptionSuccessRate}%`}
                sub="sobre redemptions totales"
              />
              <StatCard
                label="Clientes activos 30d"
                value={data.metrics.business.monthlyActiveClients}
                sub={`${data.metrics.business.successfulRedemptionsLast30Days} canjes exitosos`}
              />
              <StatCard
                label="Comercios en mapa"
                value={data.metrics.business.mapReadyCommerces}
                sub={
                  data.metrics.business.approvedMissingCoordinates > 0
                    ? `Faltan coordenadas en ${data.metrics.business.approvedMissingCoordinates}`
                    : "Todos los aprobados ya están en el mapa"
                }
                accentRed={data.metrics.business.approvedMissingCoordinates > 0}
                priority="small"
              />
              <StatCard
                label="Incidencias abiertas"
                value={data.metrics.business.incidentsOpen}
                sub={`${data.metrics.business.failedRedemptionsLast30Days} fallos en 30 días`}
                accentRed={data.metrics.business.incidentsOpen > 0}
                priority="critical"
              />
            </div>

            <div className="dashboard-viz-grid">
              <MiniBarsCard
                title="Top categorías por canjes"
                items={data.leaderboards.topCommerces.map((commerce) => ({
                  label: commerce.name,
                  value: commerce.redemptionsCount,
                }))}
                emptyMessage="Todavía no hay canjes suficientes."
              />
              <MiniBarsCard
                title="Comercios por ciudad"
                items={cityCoverage}
                emptyMessage="Sin comercios recientes."
              />
              <MiniSignalCard
                title="Loop de canjes"
                success={data.metrics.redemptions.success}
                failed={data.metrics.redemptions.failed}
              />
            </div>

            <div className="content-grid main-side">
              <AuditTimelineCard
                title="Actividad reciente"
                subtitle="Últimas acciones administrativas registradas"
                logs={auditLogs}
                emptyMessage="Todavía no hay movimientos de auditoría."
              />
              <DataCard
                title="Comercios recientes"
                items={data.recentCommerces.map((commerce) => ({
                  title: commerce.name,
                  meta: `${getStatusLabel(commerce.status)} · ${commerce.owner.fullName}`,
                }))}
              />
            </div>

            <div className="content-grid main-side" style={{ marginTop: 18 }}>
              <DataCard
                title="Top comercios por canjes"
                items={data.leaderboards.topCommerces.map((commerce) => ({
                  title: commerce.name,
                  meta: `${commerce.redemptionsCount} canjes · ${commerce.promotionsCount} promos · ${commerce.cityName}`,
                }))}
              />
              <DataCard
                title="Top promociones usadas"
                items={data.leaderboards.topPromotions.map((promotion) => ({
                  title: promotion.title,
                  meta: `${promotion.redemptionsCount} canjes · ${promotion.commerce.name}`,
                }))}
              />
            </div>

            <div className="content-grid main-side" style={{ marginTop: 18 }}>
              <DataCard
                title="Incidentes recientes"
                items={data.recentIncidents.map((incident) => ({
                  title: incident.title,
                  meta: `${incident.kind === "COMMERCE" ? "Comercio" : "Promoción"} · ${getStatusLabel(
                    incident.status,
                  )}${incident.note ? ` · ${incident.note}` : ""}`,
                }))}
              />
              <DataCard
                title="Backoffice"
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
                    title: "Clientes activos mensuales",
                    meta: `${data.metrics.business.monthlyActiveClients} usuarios con canje exitoso en 30 días`,
                  },
                ]}
              />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
