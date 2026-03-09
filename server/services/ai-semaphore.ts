const MAX_CONCURRENT = 5;
const MAX_QUEUED = 10;

let active = 0;
let totalProcessed = 0;
let totalRejected = 0;
const queue: { resolve: () => void; reject: (err: Error) => void }[] = [];

export function getAISemaphoreStats() {
  return {
    active,
    queued: queue.length,
    maxConcurrent: MAX_CONCURRENT,
    maxQueued: MAX_QUEUED,
    totalProcessed,
    totalRejected,
  };
}

function tryDequeue() {
  if (active < MAX_CONCURRENT && queue.length > 0) {
    const next = queue.shift()!;
    active++;
    next.resolve();
  }
}

export async function withAIConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  if (active < MAX_CONCURRENT) {
    active++;
  } else if (queue.length < MAX_QUEUED) {
    await new Promise<void>((resolve, reject) => {
      queue.push({ resolve, reject });
      console.log(`[ai:queue] queued (active=${active}, queued=${queue.length})`);
    });
  } else {
    totalRejected++;
    console.log(`[ai:reject] rejected (active=${active}, queued=${queue.length})`);
    throw new AISemaphoreError("AI service busy, try again shortly");
  }

  try {
    const result = await fn();
    totalProcessed++;
    return result;
  } finally {
    active--;
    tryDequeue();
  }
}

export class AISemaphoreError extends Error {
  public readonly statusCode = 503;
  constructor(message: string) {
    super(message);
    this.name = "AISemaphoreError";
  }
}

export function isAISemaphoreError(err: unknown): err is AISemaphoreError {
  return err instanceof AISemaphoreError;
}

export function getErrorStatusCode(err: unknown): number {
  if (err && typeof err === "object" && "statusCode" in err && typeof (err as any).statusCode === "number") {
    return (err as any).statusCode;
  }
  return 500;
}

export function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return (err as any).message;
  }
  return "Internal server error";
}

export function handleAIRouteError(err: unknown, res: import("express").Response, fallbackMessage = "Internal server error") {
  const status = getErrorStatusCode(err);
  const message = status === 503 ? getErrorMessage(err) : fallbackMessage;
  console.error(err);
  return res.status(status).json({ error: message });
}
