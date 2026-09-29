import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth";
import { IconAlert, IconCalendar, IconCheck, IconReceipt } from "../../components/Icons";
import { ensureAdminMercadoPagoPlan, fetchAdminBillingSettings, updateAdminBillingSettings } from "../../lib/api";
import { getUserFacingErrorMessage } from "../../lib/httpErrors";
import type { AdminBillingSettings, BillingMode } from "../../types/api";
import { Alert, ConfirmDialog, LoadingBlock, PageHeader } from "./AdminShared";
import { formatBillingMoney, getBillingModePresentation, getMercadoPagoPlanPresentation, parseMonthlyPrice, toLocalDateTimeInput } from "./adminBilling";

type AdminTab = { to: string; label: string; end?: boolean };

export function AdminBillingPage({ tabs }: { tabs: AdminTab[] }) {
  const { withSession } = useAuth();
  const [settings, setSettings] = useState<AdminBillingSettings | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [startsAtInput, setStartsAtInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"price" | "schedule" | "mode" | "plan" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showActivationConfirm, setShowActivationConfirm] = useState(false);

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
    <PageHeader kicker="Super admin / Configuración" title="Billing" tabs={tabs} />
    <main className="main-content admin-billing-page">
      <div className="admin-billing-heading"><p>Configurá cómo funcionan las suscripciones de los comercios en PROMY.</p></div>
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
    </main>
    <ConfirmDialog open={showActivationConfirm} title="Activar cobros" description="Al activar Billing, los comercios alcanzados por la política vigente podrán comenzar el proceso de suscripción." confirmLabel={saving === "mode" ? "Activando..." : "Confirmar activación"} tone="danger" onClose={() => setShowActivationConfirm(false)} onConfirm={activateBilling}>
      <dl className="modal-confirmation-summary">
        <div><dt>Precio mensual</dt><dd>{formatBillingMoney(parseMonthlyPrice(priceInput).value ?? settings?.monthlyPrice, settings?.currency)}</dd></div>
        <div><dt>Fecha efectiva</dt><dd>{settings?.billingStartsAt ? formatBillingDateTime(settings.billingStartsAt) : "Al confirmar la activación"}</dd></div>
      </dl>
    </ConfirmDialog>
  </>;
}

function currencySymbol(currency: string) { return currency === "ARS" ? "$" : currency; }

function formatBillingDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
