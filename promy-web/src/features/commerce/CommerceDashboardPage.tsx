import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchCommerceDashboard } from "../../lib/api";
import type { CommerceDashboardResponse, CommerceManagedProfile } from "../../types/api";
import { useLiveRefresh } from "../../lib/live";
import { getUserFacingErrorMessage } from "../../lib/httpErrors";
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconPlus,
  IconReceipt,
} from "../../components/Icons";
import { LoadingBlock, getStatusLabel } from "./CommerceShared";

function formatActivityDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function getFriendlyCommerceStatus(status?: string | null) {
  if (status === "APPROVED") return "Visible en PROMY";
  if (status === "PENDING") return "En revisión";
  if (status === "REJECTED") return "Necesita cambios";
  if (status === "INACTIVE") return "Pausado";
  return getStatusLabel(status || "");
}

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
      setLoadError(getUserFacingErrorMessage(loadDashboardError, "load")),
    );
  }, [loadDashboard, realtimeVersion]);

  useLiveRefresh(
    () =>
      loadDashboard().catch((loadDashboardError) =>
        setLoadError(getUserFacingErrorMessage(loadDashboardError, "load")),
      ),
    { intervalMs: 30000 },
  );

  const activePromotion = useMemo(
    () => data?.recentPromotions.find((promotion) => promotion.status === "APPROVED_VISIBLE") ?? null,
    [data],
  );

  const shortCommerceName = useMemo(() => {
    const source = commerce?.name?.trim() || session?.user.fullName?.trim() || "tu negocio";
    return source.split(/\s+/)[0] || source;
  }, [commerce?.name, session?.user.fullName]);

  const attentionNotice = useMemo(() => {
    if (commerce?.status === "PENDING") {
      return {
        title: "Estamos revisando tu negocio",
        text: "Podés revisar tus datos mientras termina la aprobación.",
        action: "Ver mi negocio",
        to: "/commerce/profile",
        tone: "pending",
      };
    }

    if (commerce?.status === "REJECTED") {
      return {
        title: "Hay información para corregir",
        text: "Revisá la observación de PROMY y actualizá los datos necesarios.",
        action: "Ver qué corregir",
        to: "/commerce/profile",
        tone: "danger",
      };
    }

    if (commerce?.status === "INACTIVE") {
      return {
        title: "Tu negocio está pausado",
        text: "Revisá tu información para saber cómo volver a activarlo.",
        action: "Ver mi negocio",
        to: "/commerce/profile",
        tone: "pending",
      };
    }

    if (commerce?.status === "APPROVED" && missingCoordinates) {
      return {
        title: "Falta ubicar tu negocio",
        text: "Completá la ubicación para que tus clientes puedan encontrarte mejor.",
        action: "Completar ubicación",
        to: "/commerce/profile",
        tone: "pending",
      };
    }

    return null;
  }, [commerce?.status, missingCoordinates]);

  return (
    <>
      <header className="commerce-simple-header">
        <div className="commerce-simple-header-inner">
          <div>
            <div className="commerce-simple-eyebrow">Inicio</div>
            <h1>Hola, {shortCommerceName}</h1>
          </div>
          {commerce ? (
            <div className={`commerce-simple-status status-${commerce.status.toLowerCase()}`}>
              <span className="commerce-simple-status-dot" />
              {getFriendlyCommerceStatus(commerce.status)}
            </div>
          ) : null}
        </div>
      </header>

      <div className="main-content commerce-simple-content">
        {error ? (
          <div className="alert alert-danger">
            <IconAlert size={14} className="alert-icon" /> <span>{error}</span>
          </div>
        ) : null}

        {loadError ? (
          <div className="commerce-simple-retry">
            <div className="alert alert-danger">
              <IconAlert size={14} className="alert-icon" /> <span>{loadError}</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() =>
                void loadDashboard().catch((loadDashboardError) =>
                  setLoadError(getUserFacingErrorMessage(loadDashboardError, "load")),
                )
              }
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!data && !loadError ? (
          <LoadingBlock title="Cargando" text="Un momento, estamos preparando tu inicio." />
        ) : null}

        {data ? (
          <>
            {attentionNotice ? (
              <section className={`commerce-simple-notice is-${attentionNotice.tone}`}>
                <div>
                  <strong>{attentionNotice.title}</strong>
                  <span>{attentionNotice.text}</span>
                </div>
                <Link to={attentionNotice.to}>
                  {attentionNotice.action} <IconArrowRight size={14} />
                </Link>
              </section>
            ) : null}

            <section className="commerce-simple-actions" aria-label="Acciones principales">
              <Link className="commerce-simple-action is-primary" to="/commerce/redemptions">
                <span className="commerce-simple-action-icon"><IconReceipt size={18} /></span>
                <strong>Validar canje</strong>
                <IconArrowRight size={16} />
              </Link>
              <Link className="commerce-simple-action" to="/commerce/promotions/new">
                <span className="commerce-simple-action-icon"><IconPlus size={18} /></span>
                <strong>Nueva promoción</strong>
                <IconArrowRight size={16} />
              </Link>
            </section>

            <section className="commerce-simple-grid">
              <article className="commerce-simple-block">
                <div className="commerce-simple-block-head">
                  <h2>Promoción activa</h2>
                  <Link to="/commerce/promotions">Ver promociones</Link>
                </div>

                {activePromotion ? (
                  <Link
                    className="commerce-simple-promo-row"
                    to={`/commerce/promotions/${activePromotion.id}`}
                  >
                    <div>
                      <strong>{activePromotion.title}</strong>
                    </div>
                    <IconArrowRight size={16} />
                  </Link>
                ) : (
                  <div className="commerce-simple-empty">
                    <strong>No tenés una promoción activa.</strong>
                    <Link to="/commerce/promotions/new">Crear una promoción</Link>
                  </div>
                )}
              </article>

              <article className="commerce-simple-block">
                <div className="commerce-simple-block-head">
                  <h2>Actividad reciente</h2>
                  <Link to="/commerce/redemptions">Ver canjes</Link>
                </div>

                {data.recentRedemptions.length ? (
                  <div className="commerce-simple-activity-list">
                    {data.recentRedemptions.slice(0, 3).map((redemption) => (
                      <div className="commerce-simple-activity-row" key={redemption.id}>
                        <span className="commerce-simple-activity-icon"><IconCheck size={14} /></span>
                        <div>
                          <strong>{redemption.promotion.title}</strong>
                          <span>
                            {redemption.user?.fullName || "Cliente"}
                            {formatActivityDate(redemption.redeemedAt || redemption.createdAt)
                              ? ` · ${formatActivityDate(redemption.redeemedAt || redemption.createdAt)}`
                              : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="commerce-simple-empty">
                    <strong>Todavía no hubo canjes.</strong>
                    <span>Cuando llegue el primero, va a aparecer acá.</span>
                  </div>
                )}
              </article>
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}
