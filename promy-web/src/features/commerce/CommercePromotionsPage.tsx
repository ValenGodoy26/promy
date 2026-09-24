import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth";
import { fetchCommercePromotions } from "../../lib/api";
import { getUserFacingErrorMessage } from "../../lib/httpErrors";
import { useLiveRefresh } from "../../lib/live";
import type { CommerceManagedProfile, CommerceManagedPromotion } from "../../types/api";
import { IconAlert, IconArrowRight, IconEdit, IconPlus } from "../../components/Icons";
import { getCommerceBlockedActionLabel, LoadingBlock } from "./CommerceShared";

type PromotionFilter = "all" | "active" | "review" | "draft" | "changes" | "finished";

function getPromotionOfferLabel(promotion: CommerceManagedPromotion) {
  if (promotion.promotionType === "PERCENTAGE" && typeof promotion.discountValue === "number") {
    return `${promotion.discountValue}% de descuento`;
  }

  if (promotion.promotionType === "FIXED_AMOUNT" && typeof promotion.discountValue === "number") {
    return `$${promotion.discountValue.toLocaleString("es-AR")} de descuento`;
  }

  if (promotion.promotionType === "SPECIAL_COMBO") return "Combo especial";
  if (promotion.promotionType === "BENEFIT") return "Beneficio especial";
  if (promotion.promotionType === "TIME_SLOT") return "Promoción por horario";
  if (promotion.promotionType === "DAY_PROMO") return "Promoción por día";

  return "Promoción";
}

function getPromotionStatusMeta(promotion: CommerceManagedPromotion) {
  if (promotion.status === "APPROVED_VISIBLE") {
    return {
      label: "Activa",
      tone: "success",
      message: "Visible en PROMY",
    } as const;
  }

  if (promotion.status === "PENDING_REVIEW") {
    return {
      label: "En revisión",
      tone: "warning",
      message: "La estamos revisando. Te avisaremos cuando esté publicada.",
    } as const;
  }

  if (promotion.status === "DRAFT") {
    return {
      label: "Borrador",
      tone: "neutral",
      message: "Todavía no la ven tus clientes.",
    } as const;
  }

  if (promotion.status === "REJECTED") {
    return {
      label: "Necesita un cambio",
      tone: "danger",
      message:
        promotion.moderationNote?.trim() ||
        "Revisá la observación de PROMY, corregila y volvé a enviarla.",
    } as const;
  }

  if (promotion.status === "EXPIRED") {
    return {
      label: "Finalizada",
      tone: "neutral",
      message: "Ya terminó y dejó de mostrarse a clientes.",
    } as const;
  }

  return {
    label: "No disponible",
    tone: "neutral",
    message: "Revisá la promoción para ver su estado actual.",
  } as const;
}

function matchesFilter(promotion: CommerceManagedPromotion, filter: PromotionFilter) {
  if (filter === "active") return promotion.status === "APPROVED_VISIBLE";
  if (filter === "review") return promotion.status === "PENDING_REVIEW";
  if (filter === "draft") return promotion.status === "DRAFT";
  if (filter === "changes") return promotion.status === "REJECTED";
  if (filter === "finished") return promotion.status === "EXPIRED";
  return true;
}

export function CommercePromotionsPage({
  commerce,
  realtimeVersion,
}: {
  commerce: CommerceManagedProfile | null;
  realtimeVersion: number;
}) {
  const { withSession } = useAuth();
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<CommerceManagedPromotion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PromotionFilter>("all");

  const loadPromotions = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const response = await withSession((session) => fetchCommercePromotions(session));
        setPromotions(response.promotions);
        setError(null);
      } catch (loadError) {
        setError(getUserFacingErrorMessage(loadError, "load"));
        throw loadError;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [withSession],
  );

  useEffect(() => {
    void loadPromotions().catch(() => undefined);
  }, [loadPromotions, realtimeVersion]);

  useLiveRefresh(
    () => loadPromotions(true).catch(() => undefined),
    { intervalMs: 30000 },
  );

  const visiblePromotions = useMemo(
    () => promotions.filter((promotion) => matchesFilter(promotion, filter)),
    [filter, promotions],
  );

  const canCreate = commerce?.status === "APPROVED";
  const isEmptyAccount = promotions.length === 0;

  const filters: Array<{ id: PromotionFilter; label: string }> = [
    { id: "all", label: "Todas" },
    { id: "active", label: "Activas" },
    { id: "review", label: "En revisión" },
    { id: "draft", label: "Borradores" },
    { id: "changes", label: "Necesitan cambios" },
    { id: "finished", label: "Finalizadas" },
  ];

  return (
    <>
      <header className="commerce-promotions-header">
        <div className="commerce-promotions-header-inner">
          <div>
            <div className="commerce-simple-eyebrow">Promociones</div>
            <h1>Tus promociones</h1>
            <p>Creá y administrá las ofertas que ven tus clientes.</p>
          </div>
          {!isEmptyAccount && canCreate ? (
            <button
              className="commerce-promotions-new"
              onClick={() => navigate("/commerce/promotions/new")}
              type="button"
            >
              <IconPlus size={16} /> Nueva promoción
            </button>
          ) : null}
        </div>
      </header>

      <div className="main-content commerce-promotions-content">
        {!canCreate && commerce ? (
          <section className="commerce-promotions-account-notice">
            <div>
              <strong>Las promociones están temporalmente bloqueadas.</strong>
              <span>{getCommerceBlockedActionLabel(commerce.status)}</span>
            </div>
            <Link to="/commerce/profile">Ver mi negocio</Link>
          </section>
        ) : null}

        {error ? (
          <section className="commerce-promotions-load-error" role="alert">
            <div className="commerce-promotions-load-error-icon">
              <IconAlert size={18} />
            </div>
            <div>
              <strong>No pudimos cargar tus promociones</strong>
              <span>{error}</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => void loadPromotions().catch(() => undefined)}
            >
              Reintentar
            </button>
          </section>
        ) : loading ? (
          <LoadingBlock title="Cargando" text="Un momento, estamos buscando tus promociones." />
        ) : isEmptyAccount ? (
          <section className="commerce-promotions-first-empty">
            <div className="commerce-promotions-first-icon">
              <IconPlus size={22} />
            </div>
            <h2>Creá tu primera promoción</h2>
            <p>Ofrecé un beneficio para empezar a llegar a clientes en PROMY.</p>
            {canCreate ? (
              <button
                className="btn btn-primary"
                onClick={() => navigate("/commerce/promotions/new")}
                type="button"
              >
                <IconPlus size={15} /> Nueva promoción
              </button>
            ) : null}
          </section>
        ) : (
          <>
            <nav className="commerce-promotions-filters" aria-label="Filtrar promociones">
              {filters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={filter === item.id ? "is-active" : ""}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {visiblePromotions.length === 0 ? (
              <section className="commerce-promotions-filter-empty">
                <strong>No hay promociones en esta sección.</strong>
                <span>Probá con otro filtro para ver el resto.</span>
              </section>
            ) : (
              <section className="commerce-promotions-list" aria-label="Tus promociones">
                {visiblePromotions.map((promotion) => {
                  const status = getPromotionStatusMeta(promotion);
                  const redemptionCount = promotion.successRedemptionsCount || 0;

                  return (
                    <article className="commerce-promotion-row" key={promotion.id}>
                      <div className="commerce-promotion-row-main">
                        <div className="commerce-promotion-row-head">
                          <h2>{promotion.title}</h2>
                          <span className={`commerce-promotion-friendly-status is-${status.tone}`}>
                            <span />
                            {status.label}
                          </span>
                        </div>

                        <div className="commerce-promotion-row-offer">
                          {getPromotionOfferLabel(promotion)}
                          {redemptionCount > 0 ? (
                            <span>
                              · {redemptionCount} {redemptionCount === 1 ? "canje" : "canjes"}
                            </span>
                          ) : null}
                        </div>

                        <p className="commerce-promotion-row-message">{status.message}</p>
                      </div>

                      <div className="commerce-promotion-row-actions">
                        <Link
                          to={`/commerce/promotions/${promotion.id}/preview`}
                          className="commerce-promotion-link"
                        >
                          Ver como cliente <IconArrowRight size={14} />
                        </Link>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/commerce/promotions/${promotion.id}`)}
                          type="button"
                        >
                          <IconEdit size={13} />
                          {promotion.status === "REJECTED" ? "Corregir" : "Editar"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
