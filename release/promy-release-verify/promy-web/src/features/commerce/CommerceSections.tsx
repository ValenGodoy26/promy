import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchCommercePromotions } from "../../lib/api";
import { buildClientAppRoute, buildPromotionDeepLink } from "../../lib/clientLinks";
import { useLiveRefresh } from "../../lib/live";
import type { CommerceManagedProfile, CommerceManagedPromotion } from "../../types/api";
import { IconAlert, IconClock, IconEdit, IconPlus, IconTag } from "../../components/Icons";
import {
  CommerceOnboardingPanel,
  CommerceStatusNotices,
  DataCard,
  getCommerceBlockedActionLabel,
  getPromotionTypeLabel,
  LoadingBlock,
  PageHeader,
  StatusBadge,
} from "./CommerceShared";

export { CommerceDashboardPage } from "./CommerceDashboardPage";
export { CommerceProfilePage } from "./CommerceProfilePage";
export { CommercePromotionEditorPage } from "./CommercePromotionEditorPage";
export { CommerceRedemptionsPage } from "./CommerceRedemptionsPage";

export type CommerceTab = { to: string; label: string; end?: boolean };

export function CommercePromotionsPage({
  commerce,
  realtimeVersion,
}: {
  commerce: CommerceManagedProfile | null;
  realtimeVersion: number;
}) {
  const { session, withSession } = useAuth();
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<CommerceManagedPromotion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "visible" | "review" | "draft" | "incidents">(
    "all",
  );

  const loadPromotions = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await withSession((s) => fetchCommercePromotions(s));
      setPromotions(response.promotions);
      setError(null);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [withSession]);

  useEffect(() => {
    void loadPromotions().catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar promociones."),
    );
  }, [loadPromotions, realtimeVersion]);

  useLiveRefresh(
    () =>
      loadPromotions(true).catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "No pudimos refrescar promociones."),
      ),
    { intervalMs: 30000 },
  );

  const visible = useMemo(() => {
    if (filter === "visible") {
      return promotions.filter((promotion) => promotion.status === "APPROVED_VISIBLE");
    }
    if (filter === "review") {
      return promotions.filter((promotion) => promotion.status === "PENDING_REVIEW");
    }
    if (filter === "draft") {
      return promotions.filter((promotion) => promotion.status === "DRAFT");
    }
    if (filter === "incidents") {
      return promotions.filter((promotion) => promotion.status === "REJECTED" || promotion.status === "EXPIRED");
    }
    return promotions;
  }, [filter, promotions]);

  const canCreate = commerce?.status === "APPROVED";
  const pendingReviewCount = promotions.filter((promotion) => promotion.status === "PENDING_REVIEW").length;

  return (
    <>
      <PageHeader
        kicker="/ Commerce · Gestión"
        title="Promociones"
        titleAccent="del comercio"
      />

      <div className="main-content">
        {commerce ? <CommerceOnboardingPanel commerce={commerce} compact /> : null}
        {commerce ? (
          <CommerceStatusNotices
            commerce={commerce}
            email={session?.user.email}
            emailVerifiedAt={session?.user.emailVerifiedAt}
          />
        ) : null}

        {pendingReviewCount > 0 ? (
          <div className="alert alert-warning">
            <IconClock size={14} className="alert-icon" />
            <span>
              {pendingReviewCount === 1
                ? "Tenes 1 promocion en revision. Todavia no aparece en la app hasta que el admin la apruebe."
                : `Tenes ${pendingReviewCount} promociones en revision. Todavia no aparecen en la app hasta que el admin las apruebe.`}
            </span>
          </div>
        ) : null}

        <div className="toolbar">
          <div className="chip-row">
            <button
              type="button"
              className={filter === "all" ? "chip is-active" : "chip"}
              onClick={() => setFilter("all")}
            >
              Todas ({promotions.length})
            </button>
            <button
              type="button"
              className={filter === "visible" ? "chip is-active" : "chip"}
              onClick={() => setFilter("visible")}
            >
              Visibles
            </button>
            <button
              type="button"
              className={filter === "review" ? "chip is-active" : "chip"}
              onClick={() => setFilter("review")}
            >
              Revision
            </button>
            <button
              type="button"
              className={filter === "draft" ? "chip is-active" : "chip"}
              onClick={() => setFilter("draft")}
            >
              Borradores
            </button>
            <button
              type="button"
              className={filter === "incidents" ? "chip is-active" : "chip"}
              onClick={() => setFilter("incidents")}
            >
              Observadas
            </button>
          </div>
          <div className="toolbar-end">
            {!canCreate ? (
              <span className="summary-count">{getCommerceBlockedActionLabel(commerce?.status)}</span>
            ) : null}
            <button
              className="btn btn-primary"
              onClick={() => navigate("/commerce/promotions/new")}
              type="button"
              disabled={!canCreate}
              title={canCreate ? undefined : "Tu comercio debe estar aprobado para crear promos."}
            >
              <IconPlus size={14} /> Nueva promo
            </button>
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger">
            <IconAlert size={14} className="alert-icon" /> <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock title="Cargando promociones" text="Trayendo tus promos activas." />
        ) : visible.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", padding: 48 }}>
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>Todavia no hay promos</h3>
            <p className="muted" style={{ fontSize: 13 }}>
              Crea tu primera promocion para empezar a recibir canjes.
            </p>
            {canCreate && (
              <button
                className="btn btn-primary"
                onClick={() => navigate("/commerce/promotions/new")}
                type="button"
                style={{ marginTop: 20 }}
              >
                <IconPlus size={14} /> Crear primera promo
              </button>
            )}
          </div>
        ) : (
          <div className="promo-grid">
            {visible.map((promotion) => (
              <article className="promo-card" key={promotion.id}>
                <div className="promo-card-head">
                  <StatusBadge status={promotion.status} />
                  <span className="promo-card-type">{getPromotionTypeLabel(promotion.promotionType)}</span>
                </div>
                <div>
                  <div className="promo-card-title">{promotion.title}</div>
                  <p className="promo-card-desc">{promotion.description}</p>
                </div>
                <div className="promo-card-meta">
                  <span className="promo-card-meta-item">
                    <IconTag size={12} />
                    <span className="promo-card-meta-value">
                      {promotion.discountValue != null
                        ? promotion.promotionType === "FIXED_AMOUNT"
                          ? `$${promotion.discountValue.toLocaleString("es-AR")}`
                          : `${promotion.discountValue}%`
                        : "Sin dto."}
                    </span>
                  </span>
                  {promotion.startTime && promotion.endTime ? (
                    <span className="promo-card-meta-item">
                      <IconClock size={12} />
                      <span className="promo-card-meta-value">{promotion.startTime}–{promotion.endTime}</span>
                    </span>
                  ) : null}
                </div>
                <div className="promo-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/commerce/promotions/${promotion.id}`)}
                    type="button"
                    style={{ width: "100%" }}
                  >
                    <IconEdit size={12} /> Editar
                  </button>
                  <Link
                    to={buildClientAppRoute({
                      target: buildPromotionDeepLink(promotion.id),
                      title: "Abrir promo en la app",
                      description: `Vista cliente de ${promotion.title}.`,
                    })}
                    className="btn btn-ghost btn-sm"
                    style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
                  >
                    Ver en app
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
