import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth";
import { fetchCommerceRedemptions, validateCommerceRedemption } from "../../lib/api";
import type { CommerceManagedRedemption } from "../../types/api";
import { useLiveRefresh } from "../../lib/live";
import { IconAlert, IconCheck, IconReceipt } from "../../components/Icons";
import { getBarcodeDetector, LoadingBlock, normalizeValidationCode, PageHeader } from "./CommerceShared";
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
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

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
    if (scanIntervalRef.current != null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
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
      const BarcodeDetectorCtor = getBarcodeDetector();

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError("Este navegador no permite abrir la camara desde el panel.");
        return;
      }

      if (!BarcodeDetectorCtor) {
        setScannerError(
          "Este navegador no soporta escaneo nativo. Usa Chrome o Edge actualizado, o valida el codigo manualmente.",
        );
        return;
      }

      try {
        setScannerStarting(true);
        setScannerError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        const detector = new BarcodeDetectorCtor({
          formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8"],
        });

        setScannerActive(true);

        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || validating || readingClipboard) return;

          try {
            const detections = await detector.detect(videoRef.current);
            const first = detections.find((item) => Boolean(item.rawValue?.trim()));

            if (!first?.rawValue) return;

            stopScanner();
            setValidationCode(normalizeValidationCode(first.rawValue));
            setScannerOpen(false);
            setValidating(true);
            setError(null);
            setFeedback(null);

            try {
              await executeValidation(first.rawValue);
            } catch (validationError) {
              setError(
                validationError instanceof Error
                  ? validationError.message
                  : "No pudimos validar el canje escaneado.",
              );
            } finally {
              setValidating(false);
            }
          } catch {
            // Evitamos romper el ciclo si un frame falla.
          }
        }, 700);
      } catch (scannerStartError) {
        setScannerError(
          scannerStartError instanceof Error
            ? scannerStartError.message
            : "No pudimos acceder a la camara para escanear el codigo.",
        );
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
  }, [scannerOpen, validating, readingClipboard]);

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
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>Todavia sin canjes</h3>
            <p className="muted" style={{ fontSize: 13 }}>
              Cuando los usuarios canjeen tus promos, apareceran aca.
            </p>
          </div>
        ) : (
          <CommerceRedemptionsHistoryTable redemptions={redemptions} />
        )}
      </div>
    </>
  );
}
