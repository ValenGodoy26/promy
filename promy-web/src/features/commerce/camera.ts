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
    return "La camara tardo demasiado en responder. Puedes reintentar o ingresar el codigo manualmente.";
  }
  if (!(error instanceof Error)) {
    return "No pudimos acceder a la camara para escanear el codigo.";
  }
  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return "Permiso de camara denegado. Permite el acceso en la configuracion del navegador y volve a intentarlo.";
  }
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No encontramos ninguna camara disponible en este dispositivo.";
  }
  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "La camara esta siendo usada por otra aplicacion. Cerrala y volve a intentarlo.";
  }
  if (error.name === "OverconstrainedError") {
    return "La camara disponible no cumple los requisitos minimos para escanear. Intenta desde otro dispositivo.";
  }
  return "No pudimos acceder a la camara para escanear el codigo.";
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
