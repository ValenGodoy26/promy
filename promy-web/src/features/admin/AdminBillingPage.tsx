import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../auth";
import { IconAlert, IconCalendar, IconCheck, IconReceipt, IconX } from "../../components/Icons";
import { ensureAdminMercadoPagoPlan, fetchAdminBillingSubscription, fetchAdminBillingSubscriptions, fetchAdminBillingSettings, grantAdminComplimentaryCoverage, reconcileAdminBillingSubscription, registerAdminManualPayment, revokeAdminComplimentaryCoverage, updateAdminBillingSettings } from "../../lib/api";
import { getUserFacingErrorMessage } from "../../lib/httpErrors";
import type { AdminBillingCommerceSubscription, AdminBillingSubscriptionDetailResponse, AdminBillingSubscriptionFilter, AdminBillingSubscriptionsResponse, AdminBillingSettings, BillingMode } from "../../types/api";
import { AdminPageFrame, Alert, ConfirmDialog, LoadingBlock } from "./AdminShared";
import { formatBillingMoney, getBillingModePresentation, getMercadoPagoPlanPresentation, parseMonthlyPrice, toLocalDateTimeInput } from "./adminBilling";
import { adminBillingSubscriptionFilters, formatAdminBillingDate, formatAdminBillingProvider, getAdminBillingCoverageLabel, getAdminBillingSubscriptionPresentation, truncateOperationalId } from "./adminBillingSubscriptions";

type BillingSupportAction = "grant" | "revoke" | "manual";

export function AdminBillingPage() {
  const { withSession } = useAuth();
  const [settings, setSettings] = useState<AdminBillingSettings | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [startsAtInput, setStartsAtInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"price" | "schedule" | "mode" | "plan" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showActivationConfirm, setShowActivationConfirm] = useState(false);
  const [subscriptions, setSubscriptions] = useState<AdminBillingSubscriptionsResponse | null>(null);
  const [subscriptionFilter, setSubscriptionFilter] = useState<AdminBillingSubscriptionFilter>("ALL");
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [appliedSubscriptionSearch, setAppliedSubscriptionSearch] = useState("");
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
  const [subscriptionDetail, setSubscriptionDetail] = useState<AdminBillingSubscriptionDetailResponse["subscription"] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [supportAction, setSupportAction] = useState<BillingSupportAction | null>(null);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await withSession((session) => fetchAdminBillingSettings(session));
      setSettings(response.settings);
      setPriceInput(response.settings.monthlyPrice ?? "");
      setStartsAtInput(toLocalDateTimeInput(response.settings.billingStartsAt));
      setError(null);
    } catch (loadError) {
      setError(getUserFacingErrorMessage(loadError, "load"));
    } finally {
      setLoading(false);
    }
  }, [withSession]);

  useEffect(() => { void load(); }, [load]);

  const loadSubscriptions = useCallback(async () => {
    try {
      setSubscriptionsLoading(true);
      const response = await withSession((session) => fetchAdminBillingSubscriptions(session, {
        page: subscriptionPage,
        limit: 25,
        filter: subscriptionFilter,
        search: appliedSubscriptionSearch,
      }));
      setSubscriptions(response);
      setSubscriptionsError(null);
    } catch (loadError) {
      setSubscriptionsError(getUserFacingErrorMessage(loadError, "load"));
    } finally {
      setSubscriptionsLoading(false);
    }
  }, [appliedSubscriptionSearch, subscriptionFilter, subscriptionPage, withSession]);

  useEffect(() => { void loadSubscriptions(); }, [loadSubscriptions]);

  const openSubscriptionDetail = async (commerceId: number) => {
    try {
      setDetailLoading(true);
      setDetailError(null);
      setSubscriptionDetail(null);
      const response = await withSession((session) => fetchAdminBillingSubscription(session, commerceId));
      setSubscriptionDetail(response.subscription);
    } catch (loadError) {
      setDetailError(getUserFacingErrorMessage(loadError, "load"));
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshBillingSupport = async (commerceId: number) => {
    await Promise.all([loadSubscriptions(), openSubscriptionDetail(commerceId)]);
  };

  const observeRemoteSubscription = async () => {
    if (!subscriptionDetail) return;
    try {
      setReconciling(true);
      setReconciliationError(null);
      await withSession((session) => reconcileAdminBillingSubscription(session, subscriptionDetail.commerce.id));
      await openSubscriptionDetail(subscriptionDetail.commerce.id);
    } catch (actionError) {
      setReconciliationError(getUserFacingErrorMessage(actionError, "action"));
    } finally {
      setReconciling(false);
    }
  };

  const grantComplimentary = async (body: { reason: string; endsAt: string | null }) => {
    if (!subscriptionDetail) return;
    try {
      setSupportSubmitting(true);
      setSupportError(null);
      await withSession((session) => grantAdminComplimentaryCoverage(session, subscriptionDetail.commerce.id, body));
      setSupportAction(null);
      setFeedback("Acceso bonificado otorgado");
      await refreshBillingSupport(subscriptionDetail.commerce.id);
    } catch (actionError) {
      setSupportError(getUserFacingErrorMessage(actionError, "action"));
    } finally {
      setSupportSubmitting(false);
    }
  };

  const revokeComplimentary = async (body: { grantId: number; reason: string }) => {
    if (!subscriptionDetail) return;
    try {
      setSupportSubmitting(true);
      setSupportError(null);
      await withSession((session) => revokeAdminComplimentaryCoverage(session, subscriptionDetail.commerce.id, body));
      setSupportAction(null);
      setFeedback("Bonificación finalizada");
      await refreshBillingSupport(subscriptionDetail.commerce.id);
    } catch (actionError) {
      setSupportError(getUserFacingErrorMessage(actionError, "action"));
    } finally {
      setSupportSubmitting(false);
    }
  };

  const registerManualPayment = async (body: { amount: number; currency: "ARS"; paidAt: string; periodStart: string; periodEnd: string; reference: string; note?: string; idempotencyKey: string }) => {
    if (!subscriptionDetail) return;
    try {
      setSupportSubmitting(true);
      setSupportError(null);
      await withSession((session) => registerAdminManualPayment(session, subscriptionDetail.commerce.id, body));
      setSupportAction(null);
      setFeedback("Pago manual registrado");
      await refreshBillingSupport(subscriptionDetail.commerce.id);
    } catch (actionError) {
      setSupportError(getUserFacingErrorMessage(actionError, "action"));
    } finally {
      setSupportSubmitting(false);
    }
  };

  const presentation = settings ? getBillingModePresentation(settings.mode) : null;
  const plan = settings ? getMercadoPagoPlanPresentation(settings) : null;
  const localTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "hora local", []);

  const persist = async (kind: NonNullable<typeof saving>, body: { mode: BillingMode; monthlyPrice?: number | null; billingStartsAt?: string | null }, success: string) => {
    try {
      setSaving(kind);
      setFeedback(null);
      setError(null);
      const response = await withSession((session) => updateAdminBillingSettings(session, body));
      setSettings(response.settings);
      setPriceInput(response.settings.monthlyPrice ?? "");
      setStartsAtInput(toLocalDateTimeInput(response.settings.billingStartsAt));
      setFeedback(success);
    } catch (saveError) {
      setError(getUserFacingErrorMessage(saveError, "action"));
    } finally {
      setSaving(null);
    }
  };

  const savePrice = () => {
    if (!settings) return;
    const parsed = parseMonthlyPrice(priceInput);
    if (parsed.error || parsed.value === null) { setError(parsed.error); return; }
    void persist("price", { mode: settings.mode, monthlyPrice: parsed.value, billingStartsAt: settings.billingStartsAt }, "Precio actualizado");
  };

  const scheduleBilling = () => {
    if (!settings) return;
    const parsed = parseMonthlyPrice(priceInput);
    const start = new Date(startsAtInput);
    if (parsed.error || parsed.value === null) { setError(parsed.error); return; }
    if (!startsAtInput || Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) { setError("Elegí una fecha futura para programar el inicio."); return; }
    void persist("schedule", { mode: "SCHEDULED", monthlyPrice: parsed.value, billingStartsAt: start.toISOString() }, "Inicio de cobros programado");
  };

  const activateBilling = () => {
    if (!settings) return;
    const parsed = parseMonthlyPrice(priceInput);
    if (parsed.error || parsed.value === null) { setError(parsed.error); setShowActivationConfirm(false); return; }
    setShowActivationConfirm(false);
    void persist("mode", { mode: "ON", monthlyPrice: parsed.value, billingStartsAt: null }, "Billing activado");
  };

  const disableBilling = () => {
    if (!settings) return;
    void persist("mode", { mode: "OFF", billingStartsAt: null }, "Billing desactivado");
  };

  const verifyPlan = () => {
    void (async () => {
      try {
        setSaving("plan");
        setFeedback(null);
        setError(null);
        const response = await withSession((session) => ensureAdminMercadoPagoPlan(session));
        setSettings(response.settings);
        setFeedback("Plan de Mercado Pago verificado");
      } catch (planError) {
        setError(getUserFacingErrorMessage(planError, "action"));
      } finally {
        setSaving(null);
      }
    })();
  };

  return <>
    <AdminPageFrame
      kicker="Super admin / Configuración"
      title="Billing"
      description="Configurá las suscripciones de comercios y consultá su cobertura operativa."
    />
    <main className="main-content admin-billing-page">
      {loading ? <LoadingBlock title="Cargando Billing" text="Preparando la configuración global." /> : null}
      {error ? <Alert tone="danger" message={error === "No pudimos completar la solicitud." ? "No pudimos cargar la configuración de Billing." : error} /> : null}
      {feedback ? <Alert tone="success" message={feedback} /> : null}
      {!loading && error && !settings ? <button className="btn btn-secondary btn-sm" type="button" onClick={() => void load()}>Reintentar</button> : null}
      {settings && presentation && plan ? <div className="admin-billing-grid">
        <section className="panel admin-billing-card admin-billing-status-card">
          <div className="admin-billing-card-heading"><div><span className="page-kicker">Estado global</span><h2>Estado de Billing</h2></div><span className={`badge badge-${presentation.tone}`}><span className="badge-dot" />{presentation.label}</span></div>
          <p className="muted">{presentation.description}</p>
          <div className="admin-billing-actions">
            {settings.mode !== "ON" ? <button className="btn btn-primary" type="button" disabled={saving !== null} onClick={() => setShowActivationConfirm(true)}>Activar cobros</button> : null}
            {settings.mode !== "OFF" ? <button className="btn btn-secondary" type="button" disabled={saving !== null} onClick={disableBilling}>{saving === "mode" ? "Guardando..." : "Desactivar Billing"}</button> : null}
          </div>
        </section>

        <section className="panel admin-billing-card">
          <div className="admin-billing-card-heading"><div><span className="page-kicker">Configuración actual</span><h2>Resumen operativo</h2></div><IconReceipt size={18} /></div>
          <dl className="admin-billing-summary"><div><dt>Billing</dt><dd>{presentation.label}</dd></div><div><dt>Precio</dt><dd>{formatBillingMoney(settings.monthlyPrice, settings.currency)}{settings.monthlyPrice ? " / mes" : ""}</dd></div><div><dt>Moneda</dt><dd>{settings.currency || "No configurado"}</dd></div><div><dt>Inicio</dt><dd>{settings.billingStartsAt ? formatBillingDateTime(settings.billingStartsAt) : "No programado"}</dd></div><div><dt>Mercado Pago</dt><dd>{plan.label}</dd></div></dl>
        </section>

        <section className="panel admin-billing-card">
          <div className="admin-billing-card-heading"><div><span className="page-kicker">Precio mensual</span><h2>Valor de suscripción</h2></div></div>
          <p className="muted">Usá el importe que recibirán los comercios cuando Billing esté activo.</p>
          <label className="field-label" htmlFor="billing-monthly-price">Precio mensual ({settings.currency})</label>
          <div className="admin-billing-price-input"><span>{currencySymbol(settings.currency)}</span><input id="billing-monthly-price" className="field-input" inputMode="decimal" value={priceInput} onChange={(event) => setPriceInput(event.target.value)} aria-describedby="billing-price-help" /></div>
          <p id="billing-price-help" className="form-hint">Monto positivo, con hasta dos decimales.</p>
          <button className="btn btn-secondary" type="button" disabled={saving !== null} onClick={savePrice}>{saving === "price" ? "Guardando..." : "Guardar precio"}</button>
        </section>

        <section className="panel admin-billing-card">
          <div className="admin-billing-card-heading"><div><span className="page-kicker">Inicio de cobros</span><h2>Programación</h2></div><IconCalendar size={18} /></div>
          <p className="muted">Programá el inicio sin activar cobros ahora. Hora local del navegador: {localTimezone}.</p>
          <label className="field-label" htmlFor="billing-starts-at">Inicio programado</label>
          <input id="billing-starts-at" className="field-input" type="datetime-local" value={startsAtInput} onChange={(event) => setStartsAtInput(event.target.value)} />
          <div className="admin-billing-actions"><button className="btn btn-secondary" type="button" disabled={saving !== null} onClick={scheduleBilling}>{saving === "schedule" ? "Guardando..." : "Programar inicio"}</button>{settings.mode === "SCHEDULED" ? <button className="btn btn-ghost" type="button" disabled={saving !== null} onClick={disableBilling}>Cancelar programación</button> : null}</div>
        </section>

        <section className="panel admin-billing-card admin-billing-mercado-pago">
          <div className="admin-billing-card-heading"><div><span className="page-kicker">Proveedor</span><h2>Mercado Pago</h2></div><IconCheck size={18} /></div>
          <dl className="admin-billing-summary"><div><dt>Estado del plan</dt><dd>{plan.label}</dd></div><div><dt>Plan remoto</dt><dd className="admin-billing-plan-id">{plan.planId}</dd></div><div><dt>Precio</dt><dd>{formatBillingMoney(settings.monthlyPrice, settings.currency)}</dd></div><div><dt>Frecuencia</dt><dd>Mensual</dd></div><div><dt>Moneda</dt><dd>{settings.currency || "No configurado"}</dd></div></dl>
          <p className="form-hint">La verificación consulta el proveedor sólo al confirmar esta acción.</p>
          <button className="btn btn-secondary" type="button" disabled={saving !== null || !settings.monthlyPrice} onClick={verifyPlan}>{saving === "plan" ? "Verificando..." : settings.mercadoPagoPlanId ? "Verificar plan de Mercado Pago" : "Configurar plan de Mercado Pago"}</button>
        </section>
      </div> : null}
      <section className="panel admin-billing-subscriptions" aria-labelledby="admin-billing-subscriptions-title">
        <div className="admin-billing-subscriptions-heading">
          <div><span className="page-kicker">Gestión y soporte</span><h2 id="admin-billing-subscriptions-title">Suscripciones por comercio</h2><p className="muted">Consultá el estado y la cobertura actual de cada comercio. Las acciones administrativas se realizan desde el detalle.</p></div>
        </div>
        <form className="admin-billing-subscriptions-search" onSubmit={(event) => { event.preventDefault(); setSubscriptionPage(1); setAppliedSubscriptionSearch(subscriptionSearch); }}>
          <label className="field-label" htmlFor="admin-billing-subscription-search">Buscar comercio</label>
          <div><input id="admin-billing-subscription-search" className="field-input" value={subscriptionSearch} onChange={(event) => setSubscriptionSearch(event.target.value)} placeholder="Nombre, email del responsable o ID" /><button className="btn btn-secondary btn-sm" type="submit">Buscar</button></div>
        </form>
        <div className="admin-billing-subscription-filters" aria-label="Filtrar suscripciones">
          {adminBillingSubscriptionFilters.map((option) => <button key={option.value} className={`btn btn-sm ${subscriptionFilter === option.value ? "btn-primary" : "btn-ghost"}`} type="button" onClick={() => { setSubscriptionFilter(option.value); setSubscriptionPage(1); }}>{option.label}</button>)}
        </div>
        {subscriptionsLoading ? <div className="admin-billing-subscription-loading" role="status">Cargando suscripciones…</div> : null}
        {subscriptionsError ? <div className="admin-billing-subscription-error"><Alert tone="danger" message={subscriptionsError} /><button className="btn btn-secondary btn-sm" type="button" onClick={() => void loadSubscriptions()}>Reintentar</button></div> : null}
        {!subscriptionsLoading && !subscriptionsError && subscriptions ? <>
          {subscriptions.subscriptions.length === 0 ? <div className="admin-billing-subscription-empty"><strong>No encontramos suscripciones para este criterio.</strong><span>Probá otro filtro o modificá la búsqueda.</span></div> : <div className="admin-billing-subscription-table" role="table" aria-label="Suscripciones por comercio">
            <div className="admin-billing-subscription-table-head" role="row"><span>Comercio</span><span>Estado</span><span>Cobertura</span><span>Próximo fin</span><span>Origen</span><span /></div>
            {subscriptions.subscriptions.map((subscription) => <SubscriptionRow key={subscription.commerce.id} subscription={subscription} onOpen={openSubscriptionDetail} />)}
          </div>}
          {subscriptions.total > subscriptions.limit ? <div className="admin-billing-subscription-pagination"><span>Página {subscriptions.page} de {Math.max(1, Math.ceil(subscriptions.total / subscriptions.limit))} · {subscriptions.total} comercios</span><div><button className="btn btn-ghost btn-sm" type="button" disabled={subscriptions.page <= 1} onClick={() => setSubscriptionPage((current) => Math.max(1, current - 1))}>Anterior</button><button className="btn btn-secondary btn-sm" type="button" disabled={subscriptions.page >= Math.ceil(subscriptions.total / subscriptions.limit)} onClick={() => setSubscriptionPage((current) => current + 1)}>Siguiente</button></div></div> : null}
        </> : null}
      </section>
    </main>
    <AdminBillingSubscriptionDetailDialog subscription={subscriptionDetail} loading={detailLoading} error={detailError} reconciliationError={reconciliationError} reconciling={reconciling} onClose={() => { setSubscriptionDetail(null); setDetailError(null); setSupportAction(null); setSupportError(null); setReconciliationError(null); }} onSupportAction={(action) => { setSupportError(null); setSupportAction(action); }} onReconcile={() => void observeRemoteSubscription()} />
    {subscriptionDetail && supportAction ? <AdminBillingSupportActionDialog key={supportAction} action={supportAction} subscription={subscriptionDetail} submitting={supportSubmitting} error={supportError} monthlyPrice={settings?.monthlyPrice ?? null} onClose={() => { if (!supportSubmitting) { setSupportAction(null); setSupportError(null); } }} onGrant={grantComplimentary} onRevoke={revokeComplimentary} onManualPayment={registerManualPayment} /> : null}
    <ConfirmDialog open={showActivationConfirm} title="Activar cobros" description="Al activar Billing, los comercios alcanzados por la política vigente podrán comenzar el proceso de suscripción." confirmLabel={saving === "mode" ? "Activando..." : "Confirmar activación"} tone="danger" onClose={() => setShowActivationConfirm(false)} onConfirm={activateBilling}>
      <dl className="modal-confirmation-summary">
        <div><dt>Precio mensual</dt><dd>{formatBillingMoney(parseMonthlyPrice(priceInput).value ?? settings?.monthlyPrice, settings?.currency)}</dd></div>
        <div><dt>Fecha efectiva</dt><dd>{settings?.billingStartsAt ? formatBillingDateTime(settings.billingStartsAt) : "Al confirmar la activación"}</dd></div>
      </dl>
    </ConfirmDialog>
  </>;
}

function SubscriptionRow({ subscription, onOpen }: { subscription: AdminBillingCommerceSubscription; onOpen: (commerceId: number) => void }) {
  const presentation = getAdminBillingSubscriptionPresentation(subscription);
  return <div className="admin-billing-subscription-row" role="row">
    <div data-label="Comercio"><strong>{subscription.commerce.name}</strong><span>ID {subscription.commerce.id}</span></div>
    <div data-label="Estado"><strong>{presentation.statusLabel}</strong>{presentation.cancellationLabel ? <span>{presentation.cancellationLabel}</span> : null}</div>
    <div data-label="Cobertura">{getAdminBillingCoverageLabel(subscription)}</div>
    <div data-label="Próximo fin">{formatAdminBillingDate(subscription.periodEnd)}</div>
    <div data-label="Origen">{presentation.sourceLabel ?? "No disponible"}</div>
    <div className="admin-billing-subscription-row-action"><button className="btn btn-secondary btn-sm" type="button" onClick={() => void onOpen(subscription.commerce.id)}>Ver detalle</button></div>
  </div>;
}

function AdminBillingSubscriptionDetailDialog({
  subscription,
  loading,
  error,
  reconciliationError,
  reconciling,
  onClose,
  onSupportAction,
  onReconcile,
}: {
  subscription: AdminBillingSubscriptionDetailResponse["subscription"] | null;
  loading: boolean;
  error: string | null;
  reconciliationError: string | null;
  reconciling: boolean;
  onClose: () => void;
  onSupportAction: (action: BillingSupportAction) => void;
  onReconcile: () => void;
}) {
  if (!subscription && !loading && !error) return null;
  const summary = subscription?.summary;
  const presentation = summary ? getAdminBillingSubscriptionPresentation(summary) : null;
  const remote = subscription?.subscription;
  const lastReconciliation = subscription?.reconciliation[0];
  return <div className="modal-backdrop" role="presentation" onClick={onClose}>
    <section className="modal admin-billing-subscription-detail" role="dialog" aria-modal="true" aria-labelledby="admin-billing-subscription-detail-title" onClick={(event) => event.stopPropagation()}>
      <button className="commerce-subscription-dialog-close" type="button" aria-label="Cerrar detalle" onClick={onClose}><IconX size={17} /></button>
      <span className="page-kicker">Detalle y soporte</span>
      <h2 id="admin-billing-subscription-detail-title">{subscription ? subscription.commerce.name : "Suscripción"}</h2>
      {loading ? <p className="muted">Cargando detalle…</p> : null}
      {error ? <Alert tone="danger" message={error} /> : null}
      {subscription && summary && presentation ? <dl className="admin-billing-subscription-detail-list">
        <div><dt>Commerce ID</dt><dd>{subscription.commerce.id}</dd></div>
        <div><dt>Estado</dt><dd>{presentation.statusLabel}</dd></div>
        <div><dt>Cobertura</dt><dd>{getAdminBillingCoverageLabel(summary)}</dd></div>
        <div><dt>Origen</dt><dd>{presentation.sourceLabel ?? "No disponible"}</dd></div>
        <div><dt>Inicio de período</dt><dd>{formatAdminBillingDate(summary.periodStart)}</dd></div>
        <div><dt>Fin de período</dt><dd>{formatAdminBillingDate(summary.periodEnd)}</dd></div>
        {summary.graceEndsAt ? <div><dt>Fin de gracia</dt><dd>{formatAdminBillingDate(summary.graceEndsAt)}</dd></div> : null}
        {presentation.cancellationLabel ? <div><dt>Cancelación</dt><dd>{presentation.cancellationLabel}</dd></div> : null}
        {remote ? <><div><dt>Proveedor</dt><dd>{formatAdminBillingProvider(remote.provider)}</dd></div><div><dt>Estado del proveedor</dt><dd>{remote.providerStatus ?? "No disponible"}</dd></div><div><dt>ID de suscripción</dt><dd className="admin-billing-plan-id">{truncateOperationalId(remote.providerSubscriptionId)}</dd></div><div><dt>Referencia externa</dt><dd className="admin-billing-plan-id">{truncateOperationalId(remote.providerExternalReference)}</dd></div><div><dt>Actualizado</dt><dd>{formatAdminBillingDate(remote.updatedAt)}</dd></div></> : null}
      </dl> : null}
      {subscription && remote?.provider === "mercado_pago" && remote.providerSubscriptionId ? <section className="admin-billing-support-actions" aria-labelledby="admin-billing-reconciliation-title">
        <div><span className="page-kicker">Conciliación</span><h3 id="admin-billing-reconciliation-title">Estado local y Mercado Pago</h3><p className="muted">La consulta solo compara y registra el resultado. No cambia la suscripción local ni inicia cobros.</p></div>
        {reconciliationError ? <Alert tone="danger" message={reconciliationError} /> : null}
        {lastReconciliation ? <dl className="admin-billing-subscription-detail-list admin-billing-reconciliation-list">
          <div><dt>Última consulta</dt><dd>{formatAdminBillingDate(lastReconciliation.checkedAt)}</dd></div>
          <div><dt>Resultado</dt><dd>{getReconciliationPresentation(lastReconciliation.result)}</dd></div>
          <div><dt>Estado local</dt><dd>{lastReconciliation.localProviderStatus ?? lastReconciliation.localStatus}</dd></div>
          <div><dt>Estado observado</dt><dd>{lastReconciliation.observedStatus ?? "No disponible"}</dd></div>
          {lastReconciliation.mismatchFields.length ? <div><dt>Diferencias</dt><dd>{lastReconciliation.mismatchFields.map(getReconciliationFieldLabel).join(", ")}</dd></div> : null}
          {lastReconciliation.result === "UNAVAILABLE" ? <div><dt>Disponibilidad</dt><dd>No pudimos obtener el estado remoto. Volvé a intentar más tarde.</dd></div> : null}
        </dl> : <p className="muted">Todavía no hay consultas remotas registradas.</p>}
        <div className="admin-billing-actions"><button className="btn btn-secondary" type="button" disabled={reconciling} onClick={onReconcile}>{reconciling ? "Consultando..." : "Consultar Mercado Pago"}</button></div>
      </section> : null}
      {subscription ? <section className="admin-billing-support-actions" aria-labelledby="admin-billing-support-actions-title">
        <div><span className="page-kicker">Soporte</span><h3 id="admin-billing-support-actions-title">Acciones de soporte</h3><p className="muted">Registrá coberturas administrativas sin modificar la suscripción del proveedor.</p></div>
        <div className="admin-billing-actions">
          {subscription.support.activeComplimentary ? <button className="btn btn-secondary" type="button" onClick={() => onSupportAction("revoke")}>Finalizar bonificación</button> : <button className="btn btn-secondary" type="button" onClick={() => onSupportAction("grant")}>Otorgar acceso bonificado</button>}
          <button className="btn btn-secondary" type="button" onClick={() => onSupportAction("manual")}>Registrar pago manual</button>
        </div>
      </section> : null}
      <div className="modal-footer"><button className="btn btn-secondary" type="button" onClick={onClose}>Cerrar</button></div>
    </section>
  </div>;
}

function getReconciliationPresentation(result: string) {
  if (result === "MATCH") return "Coinciden";
  if (result === "MISMATCH") return "Hay diferencias";
  if (result === "UNAVAILABLE") return "Sin respuesta remota";
  return "No disponible";
}

function getReconciliationFieldLabel(field: string) {
  return ({ status: "estado", providerStatus: "estado del proveedor", plan: "plan", periodStart: "inicio de período", periodEnd: "fin de período", externalReference: "referencia externa" } as Record<string, string>)[field] ?? "dato remoto";
}

function AdminBillingSupportActionDialog({
  action,
  subscription,
  submitting,
  error,
  monthlyPrice,
  onClose,
  onGrant,
  onRevoke,
  onManualPayment,
}: {
  action: BillingSupportAction;
  subscription: AdminBillingSubscriptionDetailResponse["subscription"];
  submitting: boolean;
  error: string | null;
  monthlyPrice: string | null;
  onClose: () => void;
  onGrant: (body: { reason: string; endsAt: string | null }) => Promise<void>;
  onRevoke: (body: { grantId: number; reason: string }) => Promise<void>;
  onManualPayment: (body: { amount: number; currency: "ARS"; paidAt: string; periodStart: string; periodEnd: string; reference: string; note?: string; idempotencyKey: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [noEnd, setNoEnd] = useState(false);
  const [amount, setAmount] = useState(monthlyPrice ?? "");
  const [paidOn, setPaidOn] = useState(todayForBilling());
  const [periodStart, setPeriodStart] = useState(todayForBilling());
  const [periodEnd, setPeriodEnd] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const commerceName = subscription.commerce.name;
  const activeGrant = subscription.support.activeComplimentary;
  const title = action === "grant" ? "Otorgar acceso bonificado" : action === "revoke" ? "Finalizar bonificación" : "Registrar pago manual";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) { setFormError(action === "manual" ? "Indicá una referencia o motivo." : "Indicá el motivo."); return; }
    if (action === "grant") {
      if (!noEnd && !endsOn) { setFormError("Elegí una fecha de finalización o marcá que no tiene vencimiento."); return; }
      const endsAt = noEnd ? null : billingDateToIso(endsOn);
      if (!noEnd && (!endsAt || new Date(endsAt).getTime() <= Date.now())) { setFormError("La fecha de finalización debe ser futura."); return; }
      setFormError(null);
      await onGrant({ reason: trimmedReason, endsAt });
      return;
    }
    if (action === "revoke") {
      if (!activeGrant) { setFormError("No encontramos una bonificación activa para finalizar."); return; }
      setFormError(null);
      await onRevoke({ grantId: activeGrant.id, reason: trimmedReason });
      return;
    }
    const parsedAmount = Number(amount.replace(",", "."));
    const paidAt = billingDateToIso(paidOn);
    const startsAt = billingDateToIso(periodStart);
    const endsAt = billingDateToIso(periodEnd);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { setFormError("Indicá un importe mayor a cero."); return; }
    if (!paidAt || !startsAt || !endsAt || new Date(endsAt).getTime() <= new Date(startsAt).getTime()) { setFormError("Indicá un período de cobertura válido."); return; }
    setFormError(null);
    await onManualPayment({ amount: parsedAmount, currency: "ARS", paidAt, periodStart: startsAt, periodEnd: endsAt, reference: trimmedReason, note: note.trim() || undefined, idempotencyKey: createBillingSupportIdempotencyKey() });
  };

  return <div className="modal-backdrop admin-billing-support-backdrop" role="presentation" onClick={onClose}>
    <section className="modal admin-billing-support-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-billing-support-dialog-title" onClick={(event) => event.stopPropagation()}>
      <button className="commerce-subscription-dialog-close" type="button" aria-label="Cerrar" disabled={submitting} onClick={onClose}><IconX size={17} /></button>
      <span className="page-kicker">Soporte de billing</span>
      <h2 id="admin-billing-support-dialog-title">{title}</h2>
      <p className="muted">{action === "grant" ? "Permití que este comercio use PROMY sin un cobro durante el período indicado." : action === "revoke" ? "El comercio dejará de contar con esta cobertura cuando la finalización sea efectiva." : "Registrá un pago recibido fuera de Mercado Pago y su período de cobertura."}</p>
      <p className="admin-billing-support-commerce"><strong>Comercio</strong><span>{commerceName}</span></p>
      {error ? <Alert tone="danger" message={error} /> : null}
      {formError ? <Alert tone="danger" message={formError} /> : null}
      <form className="admin-billing-support-form" onSubmit={(event) => void submit(event)}>
        {action === "grant" ? <>
          <label className="field-label" htmlFor="billing-complimentary-end">Finalización</label>
          <input id="billing-complimentary-end" className="field-input" type="date" value={endsOn} disabled={noEnd || submitting} onChange={(event) => setEndsOn(event.target.value)} />
          <label className="admin-billing-checkbox"><input type="checkbox" checked={noEnd} disabled={submitting} onChange={(event) => setNoEnd(event.target.checked)} /> <span>Sin fecha de finalización</span></label>
        </> : null}
        {action === "manual" ? <>
          <div className="admin-billing-support-field-grid"><div><label className="field-label" htmlFor="billing-manual-amount">Importe</label><input id="billing-manual-amount" className="field-input" inputMode="decimal" value={amount} disabled={submitting} onChange={(event) => setAmount(event.target.value)} /></div><div><label className="field-label" htmlFor="billing-manual-currency">Moneda</label><input id="billing-manual-currency" className="field-input" value="ARS" readOnly /></div></div>
          <label className="field-label" htmlFor="billing-manual-paid-on">Fecha de pago</label><input id="billing-manual-paid-on" className="field-input" type="date" value={paidOn} disabled={submitting} onChange={(event) => setPaidOn(event.target.value)} />
          <div className="admin-billing-support-field-grid"><div><label className="field-label" htmlFor="billing-manual-start">Cobertura desde</label><input id="billing-manual-start" className="field-input" type="date" value={periodStart} disabled={submitting} onChange={(event) => setPeriodStart(event.target.value)} /></div><div><label className="field-label" htmlFor="billing-manual-end">Cobertura hasta</label><input id="billing-manual-end" className="field-input" type="date" value={periodEnd} disabled={submitting} onChange={(event) => setPeriodEnd(event.target.value)} /></div></div>
        </> : null}
        <label className="field-label" htmlFor="billing-support-reason">{action === "manual" ? "Referencia o motivo" : action === "revoke" ? "Motivo de finalización" : "Motivo"}</label>
        <textarea id="billing-support-reason" className="field-input" rows={3} value={reason} disabled={submitting} onChange={(event) => setReason(event.target.value)} />
        {action === "manual" ? <><label className="field-label" htmlFor="billing-manual-note">Nota interna (opcional)</label><textarea id="billing-manual-note" className="field-input" rows={2} value={note} disabled={submitting} onChange={(event) => setNote(event.target.value)} /></> : null}
        <div className="modal-footer"><button className="btn btn-secondary" type="button" disabled={submitting} onClick={onClose}>Cancelar</button><button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? "Guardando..." : action === "grant" ? "Otorgar bonificación" : action === "revoke" ? "Finalizar bonificación" : "Registrar pago"}</button></div>
      </form>
    </section>
  </div>;
}

function todayForBilling() { return new Date().toISOString().slice(0, 10); }

function billingDateToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createBillingSupportIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `admin-manual-${crypto.randomUUID()}`
    : `admin-manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function currencySymbol(currency: string) { return currency === "ARS" ? "$" : currency; }

function formatBillingDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
