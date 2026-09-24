import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth";
import {
  IconAlert,
  IconArrowLeft,
  IconCalendar,
  IconClock,
  IconMapPin,
  IconTag,
} from "../../components/Icons";
import { fetchCommercePromotions, fetchMyCommerce } from "../../lib/api";
import type { CommerceManagedProfile, CommerceManagedPromotion } from "../../types/api";
import { LoadingBlock } from "./CommerceShared";

function getPromotionOfferLabel(promotion: CommerceManagedPromotion) {
  if (promotion.promotionType === "PERCENTAGE" && typeof promotion.discountValue === "number") {
    return `${promotion.discountValue}% OFF`;
  }
  if (promotion.promotionType === "FIXED_AMOUNT" && typeof promotion.discountValue === "number") {
    return `$${promotion.discountValue.toLocaleString("es-AR")} OFF`;
  }
  if (promotion.promotionType === "SPECIAL_COMBO") return "Combo especial";
  if (promotion.promotionType === "BENEFIT") return "Beneficio";
  if (promotion.promotionType === "TIME_SLOT") return "Promo por horario";
  if (promotion.promotionType === "DAY_PROMO") return "Promo del día";
  return "Promoción";
}

function getPromotionStatusMeta(status?: string) {
  if (status === "APPROVED_VISIBLE") return { label: "Visible en PROMY", tone: "approved" };
  if (status === "PENDING_REVIEW") return { label: "En revisión", tone: "review" };
  if (status === "DRAFT") return { label: "Borrador", tone: "draft" };
  if (status === "REJECTED") return { label: "Necesita cambios", tone: "rejected" };
  if (status === "EXPIRED") return { label: "Finalizada", tone: "expired" };
  return { label: "Vista previa", tone: "draft" };
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const raw = value.slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return raw;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function buildValidityLabel(promotion: CommerceManagedPromotion) {
  const start = formatDate(promotion.startDate);
  const end = formatDate(promotion.endDate);
  if (start && end) return `${start} — ${end}`;
  if (start) return `Desde ${start}`;
  if (end) return `Hasta ${end}`;
  return "Sin fecha de finalización definida";
}

function buildScheduleLabel(promotion: CommerceManagedPromotion) {
  if (promotion.startTime && promotion.endTime) {
    return `${promotion.startTime} — ${promotion.endTime}`;
  }
  if (promotion.schedules?.length) {
    return "Disponible en horarios seleccionados";
  }
  return "Disponible durante el horario del comercio";
}

export function CommercePromotionPreviewPage() {
  const { withSession } = useAuth();
  const params = useParams();
  const promotionId = Number(params.promotionId);
  const [commerce, setCommerce] = useState<CommerceManagedProfile | null>(null);
  const [promotion, setPromotion] = useState<CommerceManagedPromotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!Number.isFinite(promotionId)) {
      setError("La promoción seleccionada no es válida.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [profileResponse, promotionsResponse] = await Promise.all([
        withSession((session) => fetchMyCommerce(session)),
        withSession((session) => fetchCommercePromotions(session)),
      ]);
      const found = promotionsResponse.promotions.find((item) => item.id === promotionId) || null;
      setCommerce(profileResponse.commerce);
      setPromotion(found);
      setError(found ? null : "No encontramos la promoción seleccionada.");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar la vista previa de la promoción.",
      );
    } finally {
      setLoading(false);
    }
  }, [promotionId, withSession]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const status = useMemo(
    () => getPromotionStatusMeta(promotion?.status),
    [promotion?.status],
  );

  if (loading) {
    return (
      <div className="commerce-client-preview-shell">
        <LoadingBlock
          title="Cargando vista previa"
          text="Preparando la promoción como la verá un cliente."
        />
      </div>
    );
  }

  return (
    <div className="commerce-client-preview-shell commerce-promotion-preview-shell">
      <div className="commerce-client-preview-toolbar">
        <div>
          <Link to="/commerce/promotions" className="commerce-client-preview-back">
            <IconArrowLeft size={15} /> Volver a Promociones
          </Link>
          <div className="commerce-client-preview-kicker">VISTA COMO CLIENTE</div>
          <h1>Así se ve tu promoción</h1>
          <p>Vista previa de la versión guardada, sin cambiar tu sesión de comercio.</p>
        </div>
        {promotion ? (
          <span className={`commerce-promotion-preview-status is-${status.tone}`}>
            {status.label}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="alert alert-danger commerce-client-preview-alert">
          <IconAlert size={14} className="alert-icon" /> <span>{error}</span>
        </div>
      ) : null}

      {promotion && commerce ? (
        <div className="commerce-client-preview-stage">
          <div className="commerce-client-preview-device commerce-promotion-preview-device">
            <div className="commerce-client-preview-mobile-topbar">
              <span>PROMY</span>
              <span>Detalle de promoción</span>
            </div>

            <div className="commerce-promotion-preview-hero">
              {promotion.imageUrl ? (
                <img src={promotion.imageUrl} alt={`Imagen de ${promotion.title}`} />
              ) : (
                <div className="commerce-promotion-preview-hero-fallback" aria-hidden="true">
                  <IconTag size={34} />
                </div>
              )}
              <span className="commerce-promotion-preview-offer">
                {getPromotionOfferLabel(promotion)}
              </span>
            </div>

            <div className="commerce-promotion-preview-body">
              <div className="commerce-promotion-preview-commerce">
                <div className="commerce-promotion-preview-commerce-logo">
                  {commerce.logoUrl ? (
                    <img src={commerce.logoUrl} alt="" />
                  ) : (
                    <span>{commerce.name?.trim()?.[0]?.toUpperCase() || "P"}</span>
                  )}
                </div>
                <div>
                  <strong>{commerce.name}</strong>
                  <span>
                    <IconMapPin size={13} /> {commerce.address || commerce.city?.name || "Concordia"}
                  </span>
                </div>
              </div>

              <div className="commerce-promotion-preview-heading">
                <span>{commerce.category?.name || "Beneficio local"}</span>
                <h2>{promotion.title}</h2>
                <p>{promotion.description}</p>
              </div>

              <div className="commerce-promotion-preview-details">
                <div>
                  <IconCalendar size={16} />
                  <span>
                    <small>Vigencia</small>
                    <strong>{buildValidityLabel(promotion)}</strong>
                  </span>
                </div>
                <div>
                  <IconClock size={16} />
                  <span>
                    <small>Horario</small>
                    <strong>{buildScheduleLabel(promotion)}</strong>
                  </span>
                </div>
              </div>

              {promotion.conditions?.trim() ? (
                <section className="commerce-promotion-preview-conditions">
                  <span>CONDICIONES</span>
                  <p>{promotion.conditions}</p>
                </section>
              ) : null}

              <button className="commerce-promotion-preview-cta" type="button" disabled>
                Canjear beneficio
              </button>
              <p className="commerce-promotion-preview-helper">
                El botón es ilustrativo en esta vista previa.
              </p>
            </div>
          </div>

          <aside className="commerce-client-preview-note">
            <div className="commerce-client-preview-note-kicker">PREVIEW</div>
            <h2>{promotion.status === "APPROVED_VISIBLE" ? "Así la ve el cliente" : "Todavía no está publicada"}</h2>
            <p>
              {promotion.status === "APPROVED_VISIBLE"
                ? "Esta promoción está activa. La vista usa los mismos datos guardados que recibe el cliente."
                : "Podés revisar cómo queda antes de publicarla. La vista previa no cambia el estado de la promoción ni tu sesión."}
            </p>
            <Link to={`/commerce/promotions/${promotion.id}`} className="btn btn-secondary">
              Volver a editar
            </Link>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
