import { useCallback, useEffect, useRef, useState } from "react";
import type { CommerceSubscription } from "../../types/api";
import { IconAlert, IconCheck, IconClock, IconX } from "../../components/Icons";
import { getMercadoPagoPublicKey, loadMercadoPagoSdk, type MercadoPagoCardForm } from "./mercadoPagoSdk";
import {
  getSubscriptionConfirmation,
  pollSubscriptionConfirmation,
  submitSubscriptionEnrollment,
  SubscriptionPaymentAttempt,
  type SubscriptionPaymentPhase,
} from "./subscriptionPayment";

type SubscriptionPaymentDialogProps = {
  subscription: CommerceSubscription;
  price: string;
  cardholderEmail: string;
  onClose: () => void;
  onEnroll: (cardToken: string) => Promise<void>;
  onReadSubscription: () => Promise<CommerceSubscription>;
  onSubscriptionChange: (subscription: CommerceSubscription) => void;
};

const secureFieldIds = ["commerce-payment-card-number", "commerce-payment-expiration", "commerce-payment-security-code"];

export function SubscriptionPaymentDialog({
  subscription,
  price,
  cardholderEmail,
  onClose,
  onEnroll,
  onReadSubscription,
  onSubscriptionChange,
}: SubscriptionPaymentDialogProps) {
  const publicKey = getMercadoPagoPublicKey();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<MercadoPagoCardForm | null>(null);
  const attemptRef = useRef(new SubscriptionPaymentAttempt());
  const pollAbortRef = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<SubscriptionPaymentPhase>("LOADING_SDK");
  const [message, setMessage] = useState("Estamos preparando el formulario de pago seguro.");

  const setAttemptPhase = useCallback(() => setPhase(attemptRef.current.currentPhase), []);

  const confirmSubscription = useCallback(async (poll: boolean) => {
    attemptRef.current.markConfirming();
    setAttemptPhase();
    setMessage("Estamos confirmando tu suscripción…");
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;
    try {
      const latest = poll
        ? await pollSubscriptionConfirmation(onReadSubscription, { signal: controller.signal })
        : await onReadSubscription();
      if (controller.signal.aborted) return;
      onSubscriptionChange(latest);
      const confirmation = getSubscriptionConfirmation(latest);
      setMessage(confirmation.description);
      if (confirmation.state === "success") attemptRef.current.markSuccess();
      else if (confirmation.state === "pending") attemptRef.current.markPending();
      else attemptRef.current.markError();
      setAttemptPhase();
    } catch {
      if (controller.signal.aborted) return;
      attemptRef.current.markAmbiguous();
      setAttemptPhase();
      setMessage("No pudimos confirmar el resultado. Actualizá el estado antes de intentar nuevamente.");
    }
  }, [onReadSubscription, onSubscriptionChange, setAttemptPhase]);

  const handleCardSubmit = useCallback(async (cardForm: MercadoPagoCardForm | null, event: SubmitEvent) => {
    event.preventDefault();
    if (!cardForm || attemptRef.current.currentPhase !== "READY") return;
    setPhase("TOKENIZING");
    setMessage("Estamos validando los datos de tu tarjeta.");
    const result = await submitSubscriptionEnrollment({
      attempt: attemptRef.current,
      tokenize: async () => cardForm.getCardFormData().token,
      enroll: onEnroll,
      onPhaseChange: setAttemptPhase,
    });
    setAttemptPhase();
    if (result.outcome === "blocked") return;
    if (result.outcome === "tokenization_error") {
      setMessage("No pudimos validar los datos de la tarjeta. Revisalos e intentá nuevamente.");
      return;
    }
    if (result.outcome === "ambiguous") {
      setMessage("No pudimos confirmar el resultado. Actualizá el estado antes de intentar nuevamente.");
      return;
    }
    if (result.outcome === "error") {
      setMessage("No pudimos completar la activación. Revisá los datos o intentá nuevamente más tarde.");
      return;
    }
    await confirmSubscription(true);
  }, [confirmSubscription, onEnroll, setAttemptPhase]);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !["TOKENIZING", "SUBMITTING", "CONFIRMING"].includes(attemptRef.current.currentPhase)) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    attemptRef.current = new SubscriptionPaymentAttempt();
    pollAbortRef.current?.abort();
    if (!publicKey) {
      attemptRef.current.markError();
      setAttemptPhase();
      setMessage("No pudimos iniciar el pago seguro. Intentá nuevamente más tarde.");
      return;
    }

    let disposed = false;
    let cardForm: MercadoPagoCardForm | null = null;
    setPhase("LOADING_SDK");
    setMessage("Estamos preparando el formulario de pago seguro.");
    void loadMercadoPagoSdk().then((MercadoPago) => {
      if (disposed) return;
      const mercadoPago = new MercadoPago(publicKey, { locale: "es-AR" });
      cardForm = mercadoPago.cardForm({
        amount: subscription.monthlyPrice!,
        iframe: true,
        form: {
          id: "commerce-subscription-payment-form",
          cardNumber: { id: secureFieldIds[0] },
          expirationDate: { id: secureFieldIds[1] },
          securityCode: { id: secureFieldIds[2] },
          cardholderName: { id: "commerce-payment-cardholder-name" },
          cardholderEmail: { id: "commerce-payment-cardholder-email" },
          identificationType: { id: "commerce-payment-identification-type" },
          identificationNumber: { id: "commerce-payment-identification-number" },
          issuer: { id: "commerce-payment-issuer" },
          installments: { id: "commerce-payment-installments" },
        },
        callbacks: {
          onFormMounted: (error) => {
            if (disposed) return;
            if (error) {
              attemptRef.current.markError();
              setAttemptPhase();
              setMessage("Mercado Pago no pudo inicializar el formulario. Intentá nuevamente más tarde.");
              return;
            }
            window.requestAnimationFrame(() => {
              if (disposed) return;
              const mounted = secureFieldIds.every((id) => document.getElementById(id)?.querySelector("iframe"));
              if (!mounted) {
                attemptRef.current.markError();
                setAttemptPhase();
                setMessage("Mercado Pago no pudo inicializar el formulario. Intentá nuevamente más tarde.");
                return;
              }
              attemptRef.current.markReady();
              setAttemptPhase();
              setMessage("Completá los datos de la tarjeta para continuar.");
            });
          },
          onSubmit: (event) => { void handleCardSubmit(cardForm, event); },
        },
      });
      formRef.current = cardForm;
    }).catch(() => {
      if (disposed) return;
      attemptRef.current.markError();
      setAttemptPhase();
      setMessage("Mercado Pago no pudo inicializar el formulario. Intentá nuevamente más tarde.");
    });

    return () => {
      disposed = true;
      pollAbortRef.current?.abort();
      formRef.current?.unmount?.();
      formRef.current = null;
    };
  }, [handleCardSubmit, publicKey, setAttemptPhase, subscription.monthlyPrice]);

  const busy = ["TOKENIZING", "SUBMITTING", "CONFIRMING"].includes(phase);
  const confirmation = phase === "SUCCESS" || phase === "PENDING" || phase === "ERROR"
    ? getSubscriptionConfirmation(subscription)
    : null;

  return (
    <div className="commerce-subscription-dialog-backdrop" role="presentation">
      <section className="commerce-subscription-dialog commerce-subscription-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="subscription-payment-title">
        <button ref={closeButtonRef} className="commerce-subscription-dialog-close" type="button" aria-label="Cerrar" onClick={onClose} disabled={busy}><IconX size={17} /></button>
        <span className="commerce-subscription-payment-kicker">Pago seguro</span>
        <h2 id="subscription-payment-title">Activar suscripción</h2>
        <p className="commerce-subscription-payment-intro">Completá los datos de pago para activar el acceso de tu negocio a PROMY.</p>
        <p className="commerce-subscription-payment-price">Plan PROMY · <strong>{price} / mes</strong></p>

        {phase === "SUCCESS" ? <PaymentResult icon={<IconCheck size={18} />} title="Suscripción activada" message="Tu acceso a PROMY está activo." actionLabel="Listo" onAction={onClose} /> : null}
        {phase === "PENDING" ? <PaymentResult icon={<IconClock size={18} />} title="Estamos esperando la confirmación del pago." message={message} actionLabel="Actualizar estado" onAction={() => void confirmSubscription(false)} /> : null}
        {phase === "AMBIGUOUS" ? <PaymentResult icon={<IconAlert size={18} />} title="No pudimos confirmar el resultado." message={message} actionLabel="Actualizar estado" onAction={() => void confirmSubscription(false)} /> : null}

        {phase !== "SUCCESS" && phase !== "PENDING" && phase !== "AMBIGUOUS" ? <form id="commerce-subscription-payment-form" className="commerce-subscription-payment-form" noValidate>
          <div className="commerce-subscription-payment-status" role="status" aria-live="polite">{message}</div>
          <div className="commerce-subscription-payment-fields">
            <label>Número de tarjeta<div id={secureFieldIds[0]} className="commerce-subscription-secure-field" aria-label="Número de tarjeta" /></label>
            <div className="commerce-subscription-payment-row"><label>Vencimiento<div id={secureFieldIds[1]} className="commerce-subscription-secure-field" aria-label="Vencimiento" /></label><label>Código de seguridad<div id={secureFieldIds[2]} className="commerce-subscription-secure-field" aria-label="Código de seguridad" /></label></div>
            <label>Nombre del titular<input id="commerce-payment-cardholder-name" className="field-input" type="text" autoComplete="cc-name" disabled={busy} /></label>
            <label>Email asociado<input id="commerce-payment-cardholder-email" className="field-input" type="email" defaultValue={cardholderEmail} autoComplete="email" disabled={busy} /></label>
            <div className="commerce-subscription-payment-row"><label>Tipo de documento<select id="commerce-payment-identification-type" className="field-select" disabled={busy} /></label><label>Número de documento<input id="commerce-payment-identification-number" className="field-input" type="text" inputMode="numeric" disabled={busy} /></label></div>
            <div className="commerce-subscription-payment-row"><label>Entidad emisora<select id="commerce-payment-issuer" className="field-select" disabled={busy} /></label><label>Cuotas<select id="commerce-payment-installments" className="field-select" disabled={busy} /></label></div>
          </div>
          {phase === "ERROR" ? <div className="commerce-subscription-payment-error" role="alert"><IconAlert size={16} />{confirmation?.state === "attention" ? confirmation.title : message}</div> : null}
          <div className="commerce-subscription-payment-buttons">
            <button className="btn btn-primary" type="submit" disabled={phase !== "READY"}>{["TOKENIZING", "SUBMITTING", "CONFIRMING"].includes(phase) ? "Procesando…" : "Activar suscripción"}</button>
            <button className="btn btn-secondary" type="button" onClick={onClose} disabled={busy}>Cancelar</button>
          </div>
          {phase === "ERROR" ? <button className="btn btn-secondary" type="button" onClick={() => { attemptRef.current.markReady(); setAttemptPhase(); setMessage("Completá los datos de la tarjeta para continuar."); }}>Intentar nuevamente</button> : null}
        </form> : null}
      </section>
    </div>
  );
}

function PaymentResult({ icon, title, message, actionLabel, onAction }: { icon: React.ReactNode; title: string; message: string; actionLabel: string; onAction: () => void }) {
  return <div className="commerce-subscription-payment-result" role="status" aria-live="polite"><span>{icon}</span><div><strong>{title}</strong><p>{message}</p></div><button className="btn btn-secondary" type="button" onClick={onAction}>{actionLabel}</button></div>;
}
