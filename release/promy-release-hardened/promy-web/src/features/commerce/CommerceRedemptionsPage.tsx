import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth";
import { fetchCommerceRedemptions, validateCommerceRedemption } from "../../lib/api";
import type { CommerceManagedRedemption } from "../../types/api";
import { useLiveRefresh } from "../../lib/live";
import { IconAlert, IconCheck, IconReceipt } from "../../components/Icons";
import { LoadingBlock, normalizeValidationCode, PageHeader } from "./CommerceShared";
import { CommerceLastValidatedCard } from "./CommerceLastValidatedCard";
import { CommerceRedemptionsHistoryTable } from "./CommerceRedemptionsHistoryTable";
import { CommerceRedemptionValidator } from "./CommerceRedemptionValidator";

export function CommerceRedemptionsPage({ realtimeVersion }: { realtimeVersion: number }) {
  const { withSession } = useAuth();
  const [redemptions, setRedemptions] = useState<CommerceManagedRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastValidated, setLastValidated] = useState<CommerceManagedRedemption | null>(null);
  const [validationCode, setValidationCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [readingClipboard, setReadingClipboard] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Referencia al objeto de control de @zxing/browser — permite detener el scanner limpiamente.
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  // Flag para evitar que el callback de zxing dispare validación múltiple si detecta el mismo QR
  // en varios frames antes de que stop() termine de correr.
  const scanningActiveRef = useRef(false);

  const loadRedemptions = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const response = await withSession((s) => fetchCommerceRedemptions(s));
      setRedemptions(response.redemptions);
      setLastValidated(response.redemptions.find((item) => item.status === "SUCCESS") || null);
      setError(null);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [withSession]);

  useEffect(() => {
    void loadRedemptions().catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar canjes."),
    );
  }, [loadRedemptions, realtimeVersion]);

  useLiveRefresh(
    () =>
      loadRedemptions(true).catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "No pudimos refrescar canjes."),
      ),
    { intervalMs: 15000 },
  );

  const pendingCount = useMemo(
    () => redemptions.filter((item) => item.status === "PENDING").length,
    [redemptions],
  );
  const successCount = useMemo(
    () => redemptions.filter((item) => item.status === "SUCCESS").length,
    [redemptions],
  );

  const focusValidationInput = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  const handleValidationCodeChange = (rawValue: string) => {
    setValidationCode(normalizeValidationCode(rawValue));
  };

  const applyValidatedRedemption = (redemption: CommerceManagedRedemption, message?: string) => {
    setRedemptions((current) => {
      const next = current.filter((item) => item.id !== redemption.id);
      return [redemption, ...next];
    });
    setLastValidated(redemption);
    setValidationCode("");
    setFeedback(message || "Canje validado correctamente.");
    window.setTimeout(() => focusValidationInput(), 30);
  };

  const executeValidation = async (rawCode: string) => {
    const normalized = normalizeValidationCode(rawCode);

    if (!normalized) {
      setError("Ingresa un codigo para validar.");
      return false;
    }

    const response = await withSession((s) => validateCommerceRedemption(s, normalized));
    applyValidatedRedemption(response.redemption, response.message);
    return true;
  };

  const handleValidateRedemption = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setValidating(true);
      setError(null);
      setFeedback(null);
      await executeValidation(validationCode);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "No pudimos validar el canje.");
    } finally {
      setValidating(false);
    }
  };

  const handlePasteAndValidate = async () => {
    if (!navigator.clipboard) {
      setError("Tu navegador no permite leer el portapapeles desde este panel.");
      return;
    }

    try {
      setReadingClipboard(true);
      setError(null);
      const clipboardText = await navigator.clipboard.readText();
      if (!normalizeValidationCode(clipboardText)) {
        setError("No encontramos un codigo valido en el portapapeles.");
        return;
      }
      await executeValidation(clipboardText);
    } catch (clipboardError) {
      setError(clipboardError instanceof Error ? clipboardError.message : "No pudimos leer o validar el codigo.");
    } finally {
      setReadingClipboard(false);
    }
  };

  const stopScanner = () => {
    scanningActiveRef.current = false;
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    setScannerActive(false);
  };

  // Cleanup al desmontar el componente.
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
        setScannerError("Este navegador no permite abrir la camara desde el panel.");
        return;
      }

      try {
        setScannerStarting(true);
        setScannerError(null);
        scanningActiveRef.current = true;

        // Import dinámico: @zxing/browser (~200KB) solo carga cuando el usuario
        // abre el scanner, no al cargar la página.
        const { BrowserMultiFormatReader } = await import("@zxing/browser");

        if (cancelled) return;

        const codeReader = new BrowserMultiFormatReader();

        // decodeFromConstraints funciona en Chrome, Firefox, Safari (iOS y desktop)
        // y cualquier navegador con soporte de MediaDevices.
        // facingMode: environment apunta a la camara trasera en celulares.
        const controls = await codeReader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
            },
            audio: false,
          },
          videoRef.current!,
          (result, _error) => {
            // El callback se llama en cada frame. Solo procesamos si hay resultado
            // y el scanner sigue activo (evita doble validación en frames consecutivos).
            if (!result || !scanningActiveRef.current) return;

            // Marcar como inactivo inmediatamente para ignorar frames siguientes.
            scanningActiveRef.current = false;

            const scannedCode = result.getText();
            controls.stop();
            zxingControlsRef.current = null;

            setScannerOpen(false);
            setScannerActive(false);
            setValidationCode(normalizeValidationCode(scannedCode));
            setValidating(true);
            setError(null);
            setFeedback(null);

            void executeValidation(scannedCode)
              .catch((validationError) => {
                setError(
                  validationError instanceof Error
                    ? validationError.message
                    : "No pudimos validar el canje escaneado.",
                );
              })
              .finally(() => {
                setValidating(false);
              });
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        zxingControlsRef.current = controls;
        setScannerActive(true);
      } catch (scannerStartError) {
        if (cancelled) return;

        // Mensajes claros según el tipo de error de cámara.
        let message = "No pudimos acceder a la camara para escanear el codigo.";

        if (scannerStartError instanceof Error) {
          const name = scannerStartError.name;
          if (name === "NotAllowedError" || name === "PermissionDeniedError") {
            message = "Permiso de camara denegado. Permite el acceso en la configuracion del navegador y volvé a intentarlo.";
          } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
            message = "No encontramos ninguna camara disponible en este dispositivo.";
          } else if (name === "NotReadableError" || name === "TrackStartError") {
            message = "La camara esta siendo usada por otra aplicacion. Cerrala y volvé a intentarlo.";
          } else if (name === "OverconstrainedError") {
            message = "La camara disponible no cumple los requisitos minimos para escanear. Intenta desde otro dispositivo.";
          }
        }

        setScannerError(message);
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
  }, [scannerOpen]);

  return (
    <>
      <PageHeader
        kicker="/ Commerce · Actividad"
        title="Canjes"
        titleAccent="recibidos"
        meta={
          <span className="page-meta-item">
            <IconReceipt size={12} /> {redemptions.length} registros
          </span>
        }
      />

      <div className="main-content">
        <CommerceRedemptionValidator
          validationCode={validationCode}
          pendingCount={pendingCount}
          successCount={successCount}
          validating={validating}
          readingClipboard={readingClipboard}
          scannerOpen={scannerOpen}
          scannerStarting={scannerStarting}
          scannerActive={scannerActive}
          scannerError={scannerError}
          videoRef={videoRef}
          inputRef={inputRef}
          onValidationCodeChange={handleValidationCodeChange}
          onSubmit={handleValidateRedemption}
          onPasteAndValidate={() => void handlePasteAndValidate()}
          onOpenScanner={() => setScannerOpen(true)}
          onCloseScanner={() => setScannerOpen(false)}
        />

        {error ? (
          <div className="alert alert-danger">
            <IconAlert size={14} className="alert-icon" /> <span>{error}</span>
          </div>
        ) : null}

        {feedback ? (
          <div className="alert alert-success">
            <IconCheck size={14} className="alert-icon" /> <span>{feedback}</span>
          </div>
        ) : null}

        {lastValidated ? <CommerceLastValidatedCard redemption={lastValidated} /> : null}

        {loading ? (
          <LoadingBlock title="Cargando canjes" text="Trayendo actividad del comercio." />
        ) : redemptions.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", padding: 48 }}>
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>Todavia no hay canjes</h3>
            <p className="muted" style={{ fontSize: 13 }}>
              Cuando tus clientes empiecen a usar promociones, la actividad validada va a aparecer aca.
            </p>
          </div>
        ) : (
          <CommerceRedemptionsHistoryTable redemptions={redemptions} />
        )}
      </div>
    </>
  );
}
