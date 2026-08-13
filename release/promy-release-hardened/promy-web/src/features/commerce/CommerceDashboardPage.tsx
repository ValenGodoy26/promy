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
  const missingCoordinates =
    commerce?.latitude == null ||
    commerce?.longitude == null ||
    !Number.isFinite(commerce?.latitude) ||
    !Number.isFinite(commerce?.longitude);

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
            <section className="commerce-next-step panel">
              <div className="panel-heading">
                <div className="panel-heading-stack">
                  <h2>Tu siguiente paso</h2>
                  <p className="muted">
                    {commerce?.status === "PENDING"
                      ? "Completa el perfil y deja todo listo para acelerar la aprobacion del comercio."
                      : commerce?.status === "REJECTED"
                      ? "Corrige los datos marcados por el equipo antes de volver a operar con normalidad."
                      : commerce?.status === "INACTIVE"
                      ? "El comercio esta pausado. Revisa el perfil y validalo con admin antes de retomar actividad."
                      : missingCoordinates
                      ? "Tu local ya puede operar, pero sin coordenadas no entra bien en el mapa ni en el descubrimiento de clientes."
                      : data.metrics.promotions.approvedVisible === 0
                      ? "El siguiente paso es dejar al menos una promo visible para que el comercio ya se vea vivo en la app."
                      : data.metrics.redemptions.success === 0
                      ? "Tus promos ya estan visibles. Ahora conviene probar un canje real para validar la operacion completa."
                      : "Ya estas operativo. Mantene promos activas, revisa canjes y usa el panel para detectar que ajustar."}
                  </p>
                </div>
              </div>

              <div className="commerce-next-step-actions">
                {(commerce?.status === "PENDING" ||
                  commerce?.status === "REJECTED" ||
                  commerce?.status === "INACTIVE" ||
                  missingCoordinates) && (
                  <Link className="btn btn-primary btn-sm" to="/commerce/profile">
                    Completar perfil
                  </Link>
                )}
                {commerce?.status === "APPROVED" && data.metrics.promotions.approvedVisible === 0 ? (
                  <Link className="btn btn-primary btn-sm" to="/commerce/promotions/new">
                    Crear promo visible
                  </Link>
                ) : null}
                {commerce?.status === "APPROVED" && data.metrics.promotions.total > 0 ? (
                  <Link className="btn btn-secondary btn-sm" to="/commerce/promotions">
                    Revisar promociones
                  </Link>
                ) : null}
                {commerce?.status === "APPROVED" && data.metrics.redemptions.total > 0 ? (
                  <Link className="btn btn-secondary btn-sm" to="/commerce/redemptions">
                    Ver canjes
                  </Link>
                ) : null}
              </div>
            </section>

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
