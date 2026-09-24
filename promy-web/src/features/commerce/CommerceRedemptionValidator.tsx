import React from "react";
import { IconAlert, IconClock, IconEye, IconReceipt } from "../../components/Icons";

type CommerceRedemptionValidatorProps = {
  validationCode: string;
  validating: boolean;
  scannerOpen: boolean;
  scannerStarting: boolean;
  scannerActive: boolean;
  scannerError: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onValidationCodeChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onOpenScanner: () => void;
  onCloseScanner: () => void;
  onRetryScanner: () => void;
  onUseManualCode: () => void;
};

export function CommerceRedemptionValidator({
  validationCode,
  validating,
  scannerOpen,
  scannerStarting,
  scannerActive,
  scannerError,
  videoRef,
  inputRef,
  onValidationCodeChange,
  onSubmit,
  onOpenScanner,
  onCloseScanner,
  onRetryScanner,
  onUseManualCode,
}: CommerceRedemptionValidatorProps) {
  React.useEffect(() => {
    if (!scannerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseScanner();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCloseScanner, scannerOpen]);

  return (
    <>
      <section className="redeem-simple-workspace" aria-labelledby="redeem-simple-title">
        <div className="redeem-simple-intro">
          <span className="redeem-simple-eyebrow">Canjes</span>
          <h1 id="redeem-simple-title">Validá un canje</h1>
          <p>Escaneá el QR del cliente o ingresá el código que aparece en su teléfono.</p>
        </div>

        <button
          className="redeem-scan-action"
          type="button"
          disabled={validating}
          onClick={onOpenScanner}
        >
          <span className="redeem-scan-action-icon"><IconEye size={20} /></span>
          <span className="redeem-scan-action-copy">
            <strong>Escanear QR</strong>
            <small>Usá la cámara para validarlo en el momento</small>
          </span>
          <span className="redeem-scan-action-arrow">→</span>
        </button>

        <div className="redeem-simple-divider" aria-hidden="true">
          <span>o ingresá el código</span>
        </div>

        <form className="redeem-manual-form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="redemption-code">Código del cliente</label>
          <input
            id="redemption-code"
            name="redemptionCode"
            aria-label="Código del cliente"
            ref={inputRef}
            className="field-input redeem-manual-input"
            value={validationCode}
            onChange={(event) => onValidationCodeChange(event.target.value)}
            placeholder="Código del cliente"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn btn-primary redeem-manual-submit" type="submit" disabled={validating}>
            <IconReceipt size={16} />
            {validating ? "Validando..." : "Validar canje"}
          </button>
        </form>
      </section>

      {scannerOpen ? (
        <div className="modal-backdrop" onClick={onCloseScanner}>
          <div
            className="modal scanner-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scanner-modal-title"
          >
            <div className="panel-heading">
              <div className="panel-heading-stack">
                <h2 id="scanner-modal-title">Escanear QR</h2>
                <p>Apuntá la cámara al código del cliente. PROMY lo valida automáticamente.</p>
              </div>
            </div>

            <div className="modal-body">
              <div className="scanner-frame">
                <video ref={videoRef} className="scanner-video" muted playsInline />
                <div className="scanner-overlay">
                  <div className="scanner-target" />
                </div>
              </div>

              {scannerStarting ? (
                <div className="alert alert-info" style={{ marginTop: 14 }} role="status" aria-live="polite">
                  <IconClock size={14} className="alert-icon" /> <span>Abriendo cámara...</span>
                </div>
              ) : null}

              {scannerActive ? (
                <div className="scanner-help">
                  Mantené el QR dentro del recuadro hasta que PROMY lo detecte.
                </div>
              ) : null}

              {scannerError ? (
                <div className="alert alert-warning" style={{ marginTop: 14 }} role="alert">
                  <IconAlert size={14} className="alert-icon" /> <span>{scannerError}</span>
                </div>
              ) : null}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" type="button" onClick={onCloseScanner}>
                Cerrar
              </button>
              {scannerError ? (
                <button className="btn btn-secondary" type="button" onClick={onRetryScanner}>
                  Reintentar cámara
                </button>
              ) : null}
              <button className="btn btn-primary" type="button" onClick={onUseManualCode}>
                Ingresar código manualmente
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
