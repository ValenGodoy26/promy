export type RefreshAttempt<T> = {
  generation: number;
  promise: Promise<T>;
};

export function createRefreshCoordinator<T>(request: () => Promise<T>) {
  let generation = 0;
  let inFlight: RefreshAttempt<T> | null = null;

  return {
    request(): RefreshAttempt<T> {
      if (inFlight?.generation === generation) return inFlight;

      const attemptGeneration = generation;
      const promise = request().finally(() => {
        if (inFlight?.promise === promise) inFlight = null;
      });
      inFlight = { generation: attemptGeneration, promise };
      return inFlight;
    },

    invalidate() {
      generation += 1;
      inFlight = null;
    },

    isCurrent(attemptGeneration: number) {
      return attemptGeneration === generation;
    },
  };
}
