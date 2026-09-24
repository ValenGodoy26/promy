import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth";
import { IconAlert } from "../../components/Icons";
import { fetchCommerceRedemptions, validateCommerceRedemption } from "../../lib/api";
import { useLiveRefresh } from "../../lib/live";
import type { CommerceManagedRedemption } from "../../types/api";
import {
  getCameraStartupErrorMessage,
  stopMediaStream,
  stopMediaStreamIfLate,
  withCameraStartupTimeout,
} from "./camera";
import { CommerceLastValidatedCard } from "./CommerceLastValidatedCard";
import { CommerceRedemptionsHistoryTable } from "./CommerceRedemptionsHistoryTable";
import { CommerceRedemptionValidator } from "./CommerceRedemptionValidator";
import { LoadingBlock, normalizeValidationCode } from "./CommerceShared";

type ValidationErrorPresentation = {
  title: string;
  text: string;
};

function getValidationErrorPresentation(message: string): ValidationErrorPresentation {
  const normalized = message.toLowerCase();

  if (/ya (fue|est[aá])|ya se (us[oó]|canje[oó]|valid[oó])|already/.test(normalized)) {
    return {
      title: "Este canje ya fue utilizado",
      text: "No hace falta volver a validarlo.",
    };
  }

  if (/vencid|expir|fuera de vigencia/.test(normalized)) {
    return {
      title: "La promoción ya venció",
      text: "Este beneficio ya no está disponible para canjear.",
    };
  }

  if (/otro comercio|no corresponde|comercio distinto|propietario/.test(normalized)) {
    return {
      title: "Este canje no corresponde a tu negocio",
      text: "Pedile al cliente que revise la promoción antes de intentarlo nuevamente.",
    };
  }

  if (/conexi[oó]n|network|timeout|tard[oó]|fetch/.test(normalized)) {
    return {
      title: "No pudimos conectarnos",
      text: "Revisá tu conexión e intentá nuevamente.",
    };
  }

  if (/inv[aá]lid|no encontr|c[oó]digo|code/.test(normalized)) {
    return {
      title: "Código inválido",
      text: "Revisá el código del cliente e intentá nuevamente.",
    };
  }

  return {
    title: "No pudimos validar el canje",
    text: "Revisá el código e intentá nuevamente.",
  };
}

export function CommerceRedemptionsPage({ realtimeVersion }: { realtimeVersion: number }) {
  const { withSession } = useAuth();
  const [redemptions, setRedemptions] = useState<CommerceManagedRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<ValidationErrorPresentation | null>(null);
  const [lastValidated, setLastValidated] = useState<CommerceManagedRedemption | null>(null);
  const [validationCode, setValidationCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerAttempt, setScannerAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const scanningActiveRef = useRef(false);

  const loadRedemptions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const response = await withSession((s) => fetchCommerceRedemptions(s));
      setRedemptions(response.redemptions);
      setLoadError(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [withSession]);

  useEffect(() => {
    void loadRedemptions().catch((loadRedemptionsError) =>
      setLoadError(
        loadRedemptionsError instanceof Error
          ? loadRedemptionsError.message
          : "No pudimos cargar los canjes.",
      ),
    );
  }, [loadRedemptions, realtimeVersion]);

  useLiveRefresh(
    () =>
      loadRedemptions(true).catch((refreshError) =>
        setLoadError(
          refreshError instanceof Error
            ? refreshError.message
            : "No pudimos actualizar los canjes.",
        ),
      ),
    { intervalMs: 15000 },
  );

  const focusValidationInput = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const handleValidationCodeChange = (rawValue: string) => {
    setValidationCode(normalizeValidationCode(rawValue));
    if (validationError) setValidationError(null);
  };

  const applyValidatedRedemption = (redemption: CommerceManagedRedemption) => {
    setRedemptions((current) => {
      const next = current.filter((item) => item.id !== redemption.id);
      return [redemption, ...next];
    });
    setLastValidated(redemption);
    setValidationError(null);
    setValidationCode("");
  };

  const executeValidation = async (rawCode: string) => {
    const normalized = normalizeValidationCode(rawCode);

    if (!normalized) {
      setValidationError({
        title: "Ingresá un código",
        text: "Usá el código que aparece en el teléfono del cliente.",
      });
      return false;
    }

    const response = await withSession((s) => validateCommerceRedemption(s, normalized));
    applyValidatedRedemption(response.redemption);
    return true;
  };

  const handleValidateRedemption = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setValidating(true);
      setValidationError(null);
      setLastValidated(null);
      await executeValidation(validationCode);
    } catch (validationFailure) {
      const message =
        validationFailure instanceof Error
          ? validationFailure.message
          : "No pudimos validar el canje.";
      setValidationError(getValidationErrorPresentation(message));
    } finally {
      setValidating(false);
      window.setTimeout(() => focusValidationInput(), 30);
    }
  };

  const stopScanner = () => {
    scanningActiveRef.current = false;
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    stopMediaStream(mediaStreamRef.current);
    mediaStreamRef.current = null;
    setScannerActive(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (!scannerOpen) {
      stopScanner();
      setScannerError(null);
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError("Este navegador no permite abrir la cámara desde el panel.");
        return;
      }

      try {
        setScannerStarting(true);
        setScannerError(null);
        scanningActiveRef.current = true;

        const { BrowserMultiFormatReader } = await import("@zxing/browser");

        if (cancelled) return;

        const codeReader = new BrowserMultiFormatReader();
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        };
        let cameraRequestExpired = false;
        const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
        void stopMediaStreamIfLate(
          streamPromise,
          () => cancelled || cameraRequestExpired,
        );

        let stream: MediaStream;
        try {
          stream = await withCameraStartupTimeout(streamPromise);
        } catch (cameraError) {
          cameraRequestExpired = true;
          throw cameraError;
        }

        if (cancelled) {
          stopMediaStream(stream);
          return;
        }
        mediaStreamRef.current = stream;

        const controls = await withCameraStartupTimeout(codeReader.decodeFromStream(
          stream,
          videoRef.current!,
          (result, _error) => {
            if (!result || !scanningActiveRef.current) return;

            scanningActiveRef.current = false;

            const scannedCode = result.getText();
            controls.stop();
            zxingControlsRef.current = null;

            setScannerOpen(false);
            setScannerActive(false);
            setValidationCode(normalizeValidationCode(scannedCode));
            setValidating(true);
            setValidationError(null);
            setLastValidated(null);

            void executeValidation(scannedCode)
              .catch((validationFailure) => {
                const message =
                  validationFailure instanceof Error
                    ? validationFailure.message
                    : "No pudimos validar el canje escaneado.";
                setValidationError(getValidationErrorPresentation(message));
              })
              .finally(() => {
                setValidating(false);
                window.setTimeout(() => focusValidationInput(), 30);
              });
          },
        ));

        if (cancelled) {
          controls.stop();
          return;
        }

        zxingControlsRef.current = controls;
        setScannerActive(true);
      } catch (scannerStartError) {
        if (cancelled) return;
        stopScanner();
        setScannerError(getCameraStartupErrorMessage(scannerStartError));
      } finally {
        if (!cancelled) {
          setScannerStarting(false);
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      stopScanner();
      setScannerStarting(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen, scannerAttempt]);

  return (
    <div className="commerce-redemptions-simple-page">
      <div className="main-content commerce-redemptions-simple-content">
        <CommerceRedemptionValidator
          validationCode={validationCode}
          validating={validating}
          scannerOpen={scannerOpen}
          scannerStarting={scannerStarting}
          scannerActive={scannerActive}
          scannerError={scannerError}
          videoRef={videoRef}
          inputRef={inputRef}
          onValidationCodeChange={handleValidationCodeChange}
          onSubmit={handleValidateRedemption}
          onOpenScanner={() => setScannerOpen(true)}
          onCloseScanner={() => setScannerOpen(false)}
          onRetryScanner={() => {
            stopScanner();
            setScannerError(null);
            setScannerAttempt((current) => current + 1);
          }}
          onUseManualCode={() => {
            setScannerOpen(false);
            window.setTimeout(() => focusValidationInput(), 30);
          }}
        />

        {validationError ? (
          <section className="redeem-result redeem-result-error" role="alert" aria-live="assertive">
            <span className="redeem-result-icon"><IconAlert size={21} /></span>
            <div className="redeem-result-copy">
              <strong>{validationError.title}</strong>
              <span>{validationError.text}</span>
            </div>
          </section>
        ) : null}

        {lastValidated ? <CommerceLastValidatedCard redemption={lastValidated} /> : null}

        {loadError ? (
          <div className="redeem-load-error">
            <div className="alert alert-danger">
              <IconAlert size={14} className="alert-icon" /> <span>{loadError}</span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => void loadRedemptions().catch(() => undefined)}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {loading ? (
          <LoadingBlock title="Cargando canjes" text="Un momento, estamos buscando tu actividad reciente." />
        ) : redemptions.length === 0 ? (
          <section className="redeem-history-empty" aria-labelledby="redeem-history-empty-title">
            <span className="redeem-history-eyebrow">Actividad</span>
            <h2 id="redeem-history-empty-title">Canjes recientes</h2>
            <strong>Todavía no hubo canjes.</strong>
            <p>Cuando valides el primero, va a aparecer acá.</p>
          </section>
        ) : (
          <CommerceRedemptionsHistoryTable redemptions={redemptions} />
        )}
      </div>
    </div>
  );
}
