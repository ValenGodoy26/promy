import React from "react";
import { IconAlert, IconCheck, IconClock, IconEye, IconHash } from "../../components/Icons";

type CommerceRedemptionValidatorProps = {
  validationCode: string;
  pendingCount: number;
  successCount: number;
  validating: boolean;
  readingClipboard: boolean;
  scannerOpen: boolean;
  scannerStarting: boolean;
  scannerActive: boolean;
  scannerError: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onValidationCodeChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onPasteAndValidate: () => void;
  onOpenScanner: () => void;
  onCloseScanner: () => void;
};

export function CommerceRedemptionValidator({
  validationCode,
  pendingCount,
  successCount,
  validating,
  readingClipboard,
  scannerOpen,
  scannerStarting,
  scannerActive,
  scannerError,
  videoRef,
  inputRef,
  onValidationCodeChange,
  onSubmit,
  onPasteAndValidate,
  onOpenScanner,
  onCloseScanner,
}: CommerceRedemptionValidatorProps) {
  return (
    <>
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-heading">
          <div className="panel-heading-stack">
            <h2>Validar canje en mostrador</h2>
            <p>
              Ingresa, pega o escanea el codigo que te muestra el cliente para confirmar el uso de
              la promo.
            </p>
          </div>
        </div>

        <div className="redeem-validate-tips">
          <span className="summary-count">
            <IconClock size={12} /> {pendingCount} pendientes
          </span>
          <span className="summary-count">
            <IconCheck size={12} /> {successCount} confirmados
          </span>
          <span className="summary-count">
            <IconHash size={12} /> Compatible con lector y Enter automatico
          </span>
        </div>

        <form className="redeem-validate-form" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            className="field-input redeem-validate-input redeem-validate-input-hero"
            value={validationCode}
            onChange={(event) => onValidationCodeChange(event.target.value)}
            placeholder="PROMY-ABCD1234"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn btn-primary btn-xl" type="submit" disabled={validating}>
            {validating ? "Validando..." : "Validar codigo"}
          </button>
          <button
            className="btn btn-ghost btn-lg"
            type="button"
            disabled={readingClipboard || validating}
            onClick={onPasteAndValidate}
          >
            {readingClipboard ? "Leyendo..." : "Pegar y validar"}
          </button>
          <button
            className="btn btn-ghost btn-lg"
            type="button"
            disabled={validating || readingClipboard}
            onClick={onOpenScanner}
          >
            <IconEye size={14} /> Escanear con camara
          </button>
        </form>
      </section>

      {scannerOpen ? (
        <div className="modal-backdrop" onClick={onCloseScanner}>
          <div className="modal scanner-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-heading">
              <div className="panel-heading-stack">
                <h2>Escanear codigo</h2>
                <p>Apunta la camara al QR o codigo del cliente. Se valida automaticamente al detectarlo.</p>
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
                <div className="alert alert-info" style={{ marginTop: 14 }}>
                  <IconClock size={14} className="alert-icon" /> <span>Abriendo camara...</span>
                </div>
              ) : null}

              {scannerActive ? (
                <div className="scanner-help">
                  Cuando PROMY detecte el codigo, lo valida y te devuelve el foco al mostrador.
                </div>
              ) : null}

              {scannerError ? (
                <div className="alert alert-warning" style={{ marginTop: 14 }}>
                  <IconAlert size={14} className="alert-icon" /> <span>{scannerError}</span>
                </div>
              ) : null}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" type="button" onClick={onCloseScanner}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
