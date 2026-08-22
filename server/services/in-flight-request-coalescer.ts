/**
 * Coalesces concurrent work for the same key. A completed or failed request is
 * immediately released so the next caller can read persisted output or retry.
 */
export function createInFlightRequestCoalescer<T>() {
  const inFlight = new Map<string, Promise<T>>();

  const run = (key: string, operation: () => Promise<T>): Promise<T> => {
    const existing = inFlight.get(key);
    if (existing) return existing;

    let resolveRequest!: (value: T | PromiseLike<T>) => void;
    let rejectRequest!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolve, reject) => {
      resolveRequest = resolve;
      rejectRequest = reject;
    });
    inFlight.set(key, promise);

    const clear = () => {
      if (inFlight.get(key) === promise) {
        inFlight.delete(key);
      }
    };
    void promise.then(clear, clear);

    try {
      void operation().then(resolveRequest, rejectRequest);
    } catch (error) {
      rejectRequest(error);
    }

    return promise;
  };

  return { run };
}