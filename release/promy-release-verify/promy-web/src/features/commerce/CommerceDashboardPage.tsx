import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchCommerceDashboard } from "../../lib/api";
import type { CommerceDashboardResponse, CommerceManagedProfile } from "../../types/api";
import { buildClientAppRoute, buildCommerceDeepLink } from "../../lib/clientLinks";
import { useLiveRefresh } from "../../lib/live";
import { IconActivity, IconAlert } from "../../components/Icons";
import {
  CommerceOnboardingPanel,
  CommerceStatusNotices,
  DataCard,
  getStatusLabel,
  LoadingBlock,
  PageHeader,
  StatCard,
  StatusBadge,
} from "./CommerceShared";

export function CommerceDashboardPage({
  commerce,
  error,
  realtimeVersion,
}: {
  commerce: CommerceManagedProfile | null;
  error: string | null;
  realtimeVersion: number;
}) {
  const { session, withSession } = useAuth();
  const [data, setData] = useState<CommerceDashboardResponse["dashboard"] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const response = await withSession((s) => fetchCommerceDashboard(s));
    setData(response.dashboard);
    setLoadError(null);
  }, [withSession]);

  useEffect(() => {
    void loadDashboard().catch((loadDashboardError) =>
      setLoadError(
        loadDashboardError instanceof Error
          ? loadDashboardError.message
          : "No pudimos cargar el panel.",
      ),
    );
  }, [loadDashboard, realtimeVersion]);

  useLiveRefresh(
    () =>
      loadDashboard().catch((loadDashboardError) =>
        setLoadError(
          loadDashboardError instanceof Error
            ? loadDashboardError.message
            : "No pudimos refrescar el panel.",
        ),
      ),
    { intervalMs: 30000 },
  );

  return (
    <>
      <PageHeader
        kicker="/ Commerce · Panel principal"
        title="Dashboard"
        meta={
          <span className="page-meta-item">
            <IconActivity size={12} /> En tiempo real
          </span>
        }
      />

      <div className="main-content">
        {commerce ? (
          <div className="commerce-strip">
            <div className="commerce-strip-main">
              <div className="commerce-strip-icon">
                {commerce.name?.[0]?.toUpperCase() || "C"}
              </div>
              <div className="commerce-strip-text">
                <h3>{commerce.name}</h3>
                <p>
                  {(commerce.category?.name || "Comercio") + " · " + (commerce.city?.name || "Ciudad")}
                </p>
              </div>
            </div>
            <div className="commerce-strip-meta">
              <StatusBadge status={commerce.status} />
              <span className="commerce-strip-slug">/{commerce.slug}</span>
              <Link
                to={buildClientAppRoute({
                  target: buildCommerceDeepLink(commerce.id),
                  title: "Abrir comercio en la app",
                  description: "Vista cliente del local para validar como se ve en mobile.",
                })}
                className="btn btn-secondary btn-sm"
              >
                Ver en app
              </Link>
            </div>
          </div>
        ) : null}

        {commerce ? <CommerceOnboardingPanel commerce={commerce} /> : null}
        {commerce ? (
          <CommerceStatusNotices
            commerce={commerce}
            email={session?.user.email}
            emailVerifiedAt={session?.user.emailVerifiedAt}
          />
        ) : null}

        {error ? (
          <div className="alert alert-danger">
            <IconAlert size={14} className="alert-icon" /> <span>{error}</span>
          </div>
        ) : null}

        {loadError ? (
          <div className="alert alert-danger">
            <IconAlert size={14} className="alert-icon" /> <span>{loadError}</span>
          </div>
        ) : null}

        {!data && !loadError ? (
          <LoadingBlock title="Cargando dashboard" text="Trayendo métricas del comercio." />
        ) : null}

        {data ? (
          <>
            <div className="stats-grid">
              <StatCard
                label="Comercios"
                value={data.metrics.commerces.total}
                sub={`${data.metrics.commerces.approved} aprobados`}
              />
              <StatCard
                label="Promos visibles"
                value={data.metrics.promotions.approvedVisible}
                sub={`${data.metrics.promotions.total} totales`}
              />
              <StatCard
                label="Canjes exitosos"
                value={data.metrics.redemptions.success}
                sub={`${data.metrics.redemptions.total} totales`}
              />
              <StatCard
                label="En revision"
                value={data.metrics.promotions.pendingReview}
                sub={`${data.metrics.promotions.draft} borradores · ${data.metrics.promotions.rejected} rechazadas`}
                accentRed={data.metrics.promotions.pendingReview > 0 || data.metrics.promotions.rejected > 0}
              />
            </div>

            <div className="content-grid">
              <DataCard
                title="Comercios asociados"
                items={data.commerces.map((managedCommerce) => ({
                  title: managedCommerce.name,
                  meta: `${managedCommerce.city?.name || "Ciudad"} · ${getStatusLabel(managedCommerce.status)}`,
                }))}
              />
              <DataCard
                title="Promociones recientes"
                items={data.recentPromotions.map((promotion) => ({
                  title: promotion.title,
                  meta: `${getStatusLabel(promotion.status)} · ${promotion.commerce.name}`,
                }))}
              />
              <DataCard
                title="Canjes recientes"
                items={data.recentRedemptions.map((redemption) => ({
                  title: redemption.promotion.title,
                  meta: `${redemption.user.fullName} · ${getStatusLabel(redemption.status)}`,
                }))}
              />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
