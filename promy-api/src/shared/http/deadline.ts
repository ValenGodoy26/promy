export class ExternalRequestTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`External request exceeded ${timeoutMs}ms deadline`);
    this.name = "ExternalRequestTimeoutError";
  }
}

export async function withRequestDeadline<T>(
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await operation(controller.signal);
  } catch (error) {
    if (timedOut) throw new ExternalRequestTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
