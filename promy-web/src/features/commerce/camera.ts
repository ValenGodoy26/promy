export const CAMERA_START_TIMEOUT_MS = 8_000;

export class CameraStartupTimeoutError extends Error {
  constructor() {
    super("Camera startup timed out");
    this.name = "CameraStartupTimeoutError";
  }
}

export async function withCameraStartupTimeout<T>(
  operation: Promise<T>,
  timeoutMs = CAMERA_START_TIMEOUT_MS,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new CameraStartupTimeoutError()), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function getCameraStartupErrorMessage(error: unknown) {
  if (error instanceof CameraStartupTimeoutError) {
    return "La cámara tardó demasiado en responder. Podés reintentar o ingresar el código manualmente.";
  }
  if (!(error instanceof Error)) {
    return "No pudimos acceder a la cámara para escanear el código.";
  }
  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "Permiso de cámara denegado. Permití el acceso en la configuración del navegador y volvé a intentarlo.";
  }
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No encontramos ninguna cámara disponible en este dispositivo.";
  }
  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "La cámara está siendo usada por otra aplicación. Cerrala y volvé a intentarlo.";
  }
  if (error.name === "OverconstrainedError") {
    return "La cámara disponible no cumple los requisitos mínimos para escanear. Intentá desde otro dispositivo.";
  }
  return "No pudimos acceder a la cámara para escanear el código.";
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function stopMediaStreamIfLate(
  streamPromise: Promise<MediaStream>,
  shouldStop: () => boolean,
) {
  try {
    const stream = await streamPromise;
    if (shouldStop()) stopMediaStream(stream);
  } catch {
    // El rechazo principal se informa por el flujo que espera getUserMedia.
  }
}
