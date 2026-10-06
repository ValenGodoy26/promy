import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../auth";
import { IconAlert, IconCheck, IconClock, IconX } from "../../components/Icons";
import {
  cancelCommerceSubscription,
  enrollCommerceSubscription,
  fetchCommerceSubscription,
  refreshCommerceSubscription,
} from "../../lib/api";
import { getUserFacingErrorMessage } from "../../lib/httpErrors";
import { useLiveRefresh } from "../../lib/live";
import type { CommerceSubscription } from "../../types/api";
import { LoadingBlock } from "./CommerceShared";
import { SubscriptionPaymentDialog } from "./SubscriptionPaymentDialog";
import { formatBillingDate, formatMoneyARS, getSubscriptionPaymentAction, getSubscriptionPresentation, hasSubscriptionPrice, isBetaSubscriptionAccess, shouldShowSubscriptionActionPanel } from "./commerceSubscription";

export function CommerceSubscriptionPage({ realtimeVersion }: { realtimeVersion: number }) {
  const { session, withSession } = useAuth();
  const [subscription, setSubscription] = useState<CommerceSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const paymentTriggerRef = useRef<HTMLButtonElement>(null);

  const loadSubscription = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await withSession((session) => fetchCommerceSubscription(session));
      setSubscription(response.subscription);
      setError(null);
      return response.subscription;
    } catch (loadError) {
      setError(getUserFacingErrorMessage(loadError, "load"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [withSession]);

  useEffect(() => { void loadSubscription(); }, [loadSubscription, realtimeVersion]);
  useLiveRefresh(() => { void loadSubscription(true); }, { intervalMs: 45_000 });

  const refreshStatus = async () => {
    try {
      setRefreshing(true);
      setActionError(null);
      const response = await withSession((session) => refreshCommerceSubscription(session));
      setSubscription(response.subscription);
    } catch (refreshError) {
      setActionError(getUserFacingErrorMessage(refreshError, "load"));
    } finally {
      setRefreshing(false);
    }
  };

  const cancelAtPeriodEnd = async () => {
    try {
      setCancelling(true);
      setActionError(null);
      const response = await withSession((session) => cancelCommerceSubscription(session));
      setSubscription(response.subscription);
      setShowCancelDialog(false);
    } catch (cancelError) {
      setActionError(getUserFacingErrorMessage(cancelError, "load"));
    } finally {
      setCancelling(false);
    }
  };

  const enrollSubscription = useCallback(async (cardToken: string) => {
    await withSession((currentSession) => enrollCommerceSubscription(currentSession, cardToken));
  }, [withSession]);

  const closePaymentDialog = useCallback(() => {
    setShowPaymentDialog(false);
    window.setTimeout(() => paymentTriggerRef.current?.focus(), 0);
  }, []);

  if (loading && !subscription) {
    return <div className="commerce-subscription-page"><SubscriptionSkeleton /></div>;
  }

  if (error && !subscription) {
    return (
      <div className="commerce-subscription-page commerce-subscription-page--state">
        <div className="commerce-subscription-error" role="alert">
          <IconAlert size={17} />
          <div><strong>No pudimos cargar el estado de tu suscripción.</strong><span>{error}</span></div>
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => void loadSubscription()}>Reintentar</button>
      </div>
    );
  }

  if (!subscription) return null;

  const presentation = getSubscriptionPresentation(subscription);
  const price = formatMoneyARS(subscription.monthlyPrice, subscription.currency);
  const periodEnd = formatBillingDate(subscription.periodEnd);
  const graceEnd = formatBillingDate(subscription.graceEndsAt);
  const isBeta = presentation.tone === "beta";
  const isBetaAccess = isBetaSubscriptionAccess(subscription);
  const showActionPanel = shouldShowSubscriptionActionPanel(subscription);
  const paymentAction = getSubscriptionPaymentAction(subscription);
  const hasPaymentPrice = hasSubscriptionPrice(subscription);
  const hasMercadoPagoAccess = subscription.coverageSource === "MERCADO_PAGO" && !isBeta;
  const canCancel = hasMercadoPagoAccess && ["ACTIVE", "PAST_DUE"].includes(subscription.status) && !subscription.cancelAtPeriodEnd;
  const canRefresh = hasMercadoPagoAccess && subscription.billingMode !== "OFF";

  return (
    <div className="commerce-subscription-page">
      <header className="commerce-subscription-header">
        <div><span>Cuenta del negocio</span><h1>Suscripción</h1><p>Administrá el acceso de tu negocio a PROMY.</p></div>
      </header>

      {error ? <div className="commerce-subscription-inline-error" role="status">No pudimos actualizar la información automáticamente. Mostramos el último estado disponible.</div> : null}
      {actionError ? <div className="commerce-subscription-inline-error" role="alert">{actionError}</div> : null}

      <section className={`commerce-subscription-hero is-${presentation.tone}`} aria-label="Estado de suscripción">
        <div className="commerce-subscription-hero-main">
          <div className="commerce-subscription-plan-mark"><IconClock size={19} /></div>
          <div><span className={`commerce-subscription-badge is-${presentation.tone}`}>{presentation.label}</span><p className="commerce-subscription-plan-label">Plan PROMY</p><h2>{presentation.heading}</h2><p>{presentation.description}</p></div>
        </div>
        <div className={`commerce-subscription-price${isBetaAccess ? " is-secondary" : ""}`}>
          {price ? <><strong>{isBeta ? "Precio previsto" : "Precio mensual"}</strong><span>{price} <small>/ mes</small></span></> : <><strong>Precio</strong><span className="is-muted">Aún no definido</span></>}
          {isBeta ? <em>No se está cobrando actualmente.</em> : null}
        </div>
      </section>

      <div className="commerce-subscription-grid">
        <section className="commerce-subscription-card commerce-subscription-details">
          <div className="commerce-subscription-card-head"><div><span>Estado de acceso</span><h2>Detalles de tu suscripción</h2></div></div>
          <dl>
            <div><dt>Estado</dt><dd>{presentation.label}</dd></div>
            {isBetaAccess ? <><div><dt>Acceso</dt><dd>Completo</dd></div><div><dt>Cobro actual</dt><dd>Sin cobros</dd></div></> : <>
              {subscription.cancelAtPeriodEnd && periodEnd ? <div><dt>Acceso disponible hasta</dt><dd>{periodEnd}</dd></div> : null}
              {!subscription.cancelAtPeriodEnd && subscription.status === "PAST_DUE" && graceEnd ? <div><dt>Acceso disponible hasta</dt><dd>{graceEnd}</dd></div> : null}
              {!subscription.cancelAtPeriodEnd && subscription.status !== "PAST_DUE" && periodEnd ? <div><dt>Cobertura hasta</dt><dd>{periodEnd}</dd></div> : null}
              {subscription.coverageSource === "COMPLIMENTARY" ? <div><dt>Beneficio</dt><dd>{periodEnd ? `Disponible hasta ${periodEnd}` : "Sin fecha de finalización"}</dd></div> : null}
              {hasMercadoPagoAccess ? <div><dt>Medio de pago</dt><dd>Mercado Pago</dd></div> : null}
            </>}
          </dl>
        </section>

        <section className="commerce-subscription-card commerce-subscription-includes">
          <div className="commerce-subscription-card-head"><div><span>Plan PROMY</span><h2>¿Qué incluye?</h2></div></div>
          <ul><li><IconCheck size={15} /> Publicar promociones</li><li><IconCheck size={15} /> Validar canjes</li><li><IconCheck size={15} /> Estadísticas</li><li><IconCheck size={15} /> Presencia en PROMY</li></ul>
        </section>
      </div>

      {subscription.status === "PAST_DUE" && graceEnd ? <aside className="commerce-subscription-notice is-warning"><IconAlert size={17} /><div><strong>No pudimos confirmar el último pago.</strong><span>Tenés acceso hasta el {graceEnd}.</span></div></aside> : null}
      {subscription.status === "SUSPENDED" ? <aside className="commerce-subscription-notice is-danger"><IconAlert size={17} /><div><strong>Tu suscripción necesita regularizarse.</strong><span>Podés entrar al panel, pero algunas acciones quedan pausadas.</span></div></aside> : null}
      {subscription.cancelAtPeriodEnd && periodEnd ? <aside className="commerce-subscription-notice is-warning"><IconClock size={17} /><div><strong>Tu suscripción seguirá activa hasta el {periodEnd}.</strong><span>La cancelación no es inmediata.</span></div></aside> : null}

      {showActionPanel ? <section className="commerce-subscription-actions">
        <div><span>Acciones</span><h2>{paymentAction?.heading ?? "Administrá tu suscripción"}</h2><p>{paymentAction?.description ?? "Podés consultar el estado actualizado de tu acceso desde acá."}</p></div>
        <div className="commerce-subscription-actions-buttons">
          {canRefresh ? <button className="btn btn-secondary" type="button" onClick={() => void refreshStatus()} disabled={refreshing}>{refreshing ? "Actualizando..." : "Actualizar estado"}</button> : null}
          {paymentAction ? <div className="commerce-subscription-payment-action"><button ref={paymentTriggerRef} className="btn btn-primary" type="button" onClick={() => setShowPaymentDialog(true)} disabled={!hasPaymentPrice}>{paymentAction.label}</button>{!hasPaymentPrice ? <span>El precio de la suscripción todavía no está disponible.</span> : null}</div> : null}
          {canCancel ? <button className="commerce-subscription-cancel" type="button" onClick={() => setShowCancelDialog(true)}>Cancelar suscripción</button> : null}
        </div>
      </section> : null}

      {showPaymentDialog && paymentAction && hasPaymentPrice && price ? <SubscriptionPaymentDialog subscription={subscription} price={price} cardholderEmail={session?.user.email ?? ""} onClose={closePaymentDialog} onEnroll={enrollSubscription} onReadSubscription={async () => { const next = await loadSubscription(true); if (!next) throw new Error("subscription_unavailable"); return next; }} onSubscriptionChange={setSubscription} /> : null}
      {showCancelDialog ? <SubscriptionDialog title="Cancelar al finalizar el período" onClose={() => !cancelling && setShowCancelDialog(false)}><p>Tu negocio seguirá con acceso hasta {periodEnd || "el cierre del período actual"}. Después de confirmar, no se generarán nuevas renovaciones.</p><div className="commerce-subscription-dialog-actions"><button className="btn btn-secondary" type="button" disabled={cancelling} onClick={() => setShowCancelDialog(false)}>Volver</button><button className="btn btn-danger" type="button" disabled={cancelling} onClick={() => void cancelAtPeriodEnd()}>{cancelling ? "Cancelando..." : "Confirmar cancelación"}</button></div></SubscriptionDialog> : null}
    </div>
  );
}

function SubscriptionDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="commerce-subscription-dialog-backdrop" role="presentation"><section className="commerce-subscription-dialog" role="dialog" aria-modal="true" aria-labelledby="subscription-dialog-title"><button className="commerce-subscription-dialog-close" type="button" aria-label="Cerrar" onClick={onClose}><IconX size={17} /></button><h2 id="subscription-dialog-title">{title}</h2>{children}</section></div>;
}

function SubscriptionSkeleton() {
  return <div className="commerce-subscription-skeleton" aria-label="Cargando suscripción"><div className="commerce-subscription-skeleton-head" /><div className="commerce-subscription-skeleton-hero" /><div className="commerce-subscription-skeleton-grid"><div /><div /></div></div>;
}
