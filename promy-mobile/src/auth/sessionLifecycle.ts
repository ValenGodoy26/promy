export const isTerminalRefreshStatus = (status: number) =>
  status === 400 || status === 401 || status === 403;

export function createSessionEpoch() {
  let current = 0;

  return {
    current: () => current,
    invalidate: () => {
      current += 1;
      return current;
    },
    isCurrent: (epoch: number) => epoch === current,
  };
}

export function createAsyncMutationQueue() {
  let tail: Promise<void> = Promise.resolve();

  return {
    enqueue<T>(operation: () => Promise<T>): Promise<T> {
      const next = tail.then(operation, operation);
      tail = next.then(
        () => undefined,
        () => undefined,
      );
      return next;
    },
  };
}

export function createGenerationTaskCoordinator<T>() {
  let active: { epoch: number; promise: Promise<T> } | null = null;

  return {
    run(epoch: number, operation: () => Promise<T>) {
      if (active?.epoch === epoch) {
        return active.promise;
      }

      const promise = Promise.resolve().then(operation);
      active = { epoch, promise };

      void promise.then(
        () => {
          if (active?.promise === promise) active = null;
        },
        () => {
          if (active?.promise === promise) active = null;
        },
      );

      return promise;
    },
  };
}
