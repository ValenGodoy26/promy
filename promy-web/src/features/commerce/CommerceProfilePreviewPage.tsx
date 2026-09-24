import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth";
import {
  IconAlert,
  IconArrowLeft,
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

function getCommerceVisibility(status?: string) {
  if (status === "APPROVED") return "Visible en PROMY";
  if (status === "INACTIVE") return "Comercio pausado";
  if (status === "PENDING") return "En revisión";
  if (status === "REJECTED") return "Necesita cambios";
  return "Vista previa";
}

export function CommerceProfilePreviewPage() {
  const { withSession } = useAuth();
  const [commerce, setCommerce] = useState<CommerceManagedProfile | null>(null);
  const [promotions, setPromotions] = useState<CommerceManagedPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const [profileResponse, promotionsResponse] = await Promise.all([
        withSession((session) => fetchMyCommerce(session)),
        withSession((session) => fetchCommercePromotions(session)),
      ]);
      setCommerce(profileResponse.commerce);
      setPromotions(promotionsResponse.promotions);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar la vista previa del comercio.",
      );
    } finally {
      setLoading(false);
    }
  }, [withSession]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const activePromotions = useMemo(
    () => promotions.filter((promotion) => promotion.status === "APPROVED_VISIBLE"),
    [promotions],
  );

  const description =
    commerce?.shortDescription?.trim() ||
    commerce?.description?.trim() ||
    "Este comercio todavía no agregó una descripción.";

  if (loading) {
    return (
      <div className="commerce-client-preview-shell commerce-profile-client-preview">
        <LoadingBlock title="Cargando vista previa" text="Preparando el perfil como lo verá un cliente." />
      </div>
    );
  }

  return (
    <div className="commerce-client-preview-shell commerce-profile-client-preview">
      <div className="commerce-client-preview-toolbar">
        <div>
          <Link to="/commerce/profile" className="commerce-client-preview-back">
            <IconArrowLeft size={15} /> Volver a Mi negocio
          </Link>
          <div className="commerce-client-preview-kicker">VISTA COMO CLIENTE</div>
          <h1>Así se ve tu negocio</h1>
          <p>Vista previa con la información guardada y las promociones que están activas.</p>
        </div>
        {commerce ? (
          <span className={`commerce-client-preview-status is-${commerce.status?.toLowerCase() || "unknown"}`}>
            {getCommerceVisibility(commerce.status)}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="alert alert-danger commerce-client-preview-alert">
          <IconAlert size={14} className="alert-icon" /> <span>{error}</span>
        </div>
      ) : null}

      {commerce ? (
        <>
          <div className="commerce-profile-preview-session-note" role="note">
            <span>PREVIEW</span>
            <p>Estás viendo tu perfil como cliente. Tu sesión de comercio sigue activa.</p>
            <Link to="/commerce/profile">Volver a editar</Link>
          </div>

          <div className="commerce-client-preview-stage commerce-profile-preview-stage">
            <div className="commerce-client-preview-device commerce-profile-preview-device">
              <div className="commerce-client-preview-mobile-topbar">
                <span>PROMY</span>
                <span>Perfil</span>
              </div>

              <div className="commerce-client-preview-cover">
                {commerce.coverUrl ? (
                  <img src={commerce.coverUrl} alt={`Portada de ${commerce.name}`} />
                ) : (
                  <div className="commerce-client-preview-cover-fallback commerce-profile-preview-placeholder" aria-label="Sin portada cargada">
                    <span>Portada</span>
                  </div>
                )}
              </div>

              <div className="commerce-client-preview-body">
                <div className="commerce-client-preview-identity">
                  <div className="commerce-client-preview-logo">
                    {commerce.logoUrl ? (
                      <img src={commerce.logoUrl} alt={`Logo de ${commerce.name}`} />
                    ) : (
                      <span className="commerce-profile-preview-logo-placeholder">Logo</span>
                    )}
                  </div>
                  <div className="commerce-client-preview-name-block">
                    <span>{commerce.category?.name || "Comercio"}</span>
                    <h2>{commerce.name}</h2>
                    {commerce.address ? (
                      <p><IconMapPin size={14} /> {commerce.address}</p>
                    ) : commerce.city?.name ? (
                      <p><IconMapPin size={14} /> {commerce.city.name}</p>
                    ) : null}
                  </div>
                </div>

                <section className="commerce-client-preview-about">
                  <h3>Sobre este lugar</h3>
                  <p>{description}</p>
                </section>

                <section className="commerce-client-preview-promos">
                  <div className="commerce-client-preview-section-head">
                    <div>
                      <span>BENEFICIOS</span>
                      <h3>Promociones activas</h3>
                    </div>
                    <strong>{activePromotions.length}</strong>
                  </div>

                  {activePromotions.length > 0 ? (
                    <div className="commerce-client-preview-promo-list">
                      {activePromotions.slice(0, 4).map((promotion) => (
                        <article key={promotion.id} className="commerce-client-preview-promo-card">
                          <div className="commerce-client-preview-promo-image">
                            {promotion.imageUrl ? (
                              <img src={promotion.imageUrl} alt="" />
                            ) : (
                              <div className="commerce-profile-preview-promo-placeholder">
                                <IconTag size={21} />
                                <span>Imagen de la promoción</span>
                              </div>
                            )}
                          </div>
                          <div className="commerce-client-preview-promo-copy">
                            <span>{getPromotionOfferLabel(promotion)}</span>
                            <h4>{promotion.title}</h4>
                            <p>{promotion.description}</p>
                            <Link
                              to={`/commerce/promotions/${promotion.id}/preview`}
                              className="commerce-profile-preview-promo-cta"
                            >
                              Ver promoción
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="commerce-client-preview-empty">
                      <IconTag size={20} />
                      <div>
                        <strong>Sin promociones activas</strong>
                        <span>Cuando publiques una promoción aprobada, va a aparecer acá.</span>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
