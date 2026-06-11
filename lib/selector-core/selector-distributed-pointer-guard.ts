/**
 * @advisory v5.3.2 — distributed pointer consistency (eventual consistency, cache epoch).
 */
import type { SelectorSnapshotPointer } from "@/lib/selector-core/types";

export type PointerFingerprint = {
  activeVersion: string;
  previousVersion: string;
  updatedAt: number;
  manifestGeneratedAt?: string;
};

export type PointerDriftResult = {
  driftDetected: boolean;
  staleCache: boolean;
  lastWriteAnomaly: boolean;
  reasons: string[];
};

export type ReconcilePointerOptions = {
  maxAttempts?: number;
  delayMs?: number;
};

export function buildPointerFingerprint(
  pointer: SelectorSnapshotPointer,
  manifestGeneratedAt?: string,
): PointerFingerprint {
  return {
    activeVersion: pointer.activeVersion,
    previousVersion: pointer.previousVersion,
    updatedAt: pointer.updatedAt,
    manifestGeneratedAt,
  };
}

export function detectPointerDrift(
  cached: PointerFingerprint,
  fresh: PointerFingerprint,
): PointerDriftResult {
  const reasons: string[] = [];
  let staleCache = false;
  let lastWriteAnomaly = false;

  if (cached.updatedAt !== fresh.updatedAt) {
    staleCache = true;
    reasons.push(`updatedAt mismatch: cached=${cached.updatedAt} fresh=${fresh.updatedAt}`);
  }
  if (cached.activeVersion !== fresh.activeVersion) {
    staleCache = true;
    reasons.push(`activeVersion mismatch: cached=${cached.activeVersion} fresh=${fresh.activeVersion}`);
  }
  if (fresh.updatedAt < cached.updatedAt) {
    lastWriteAnomaly = true;
    reasons.push(`updatedAt regression: fresh=${fresh.updatedAt} < cached=${cached.updatedAt}`);
  }
  if (
    cached.manifestGeneratedAt &&
    fresh.manifestGeneratedAt &&
    cached.manifestGeneratedAt !== fresh.manifestGeneratedAt
  ) {
    staleCache = true;
    reasons.push("manifestGeneratedAt mismatch");
  }

  return {
    driftDetected: staleCache || lastWriteAnomaly,
    staleCache,
    lastWriteAnomaly,
    reasons,
  };
}

export function assertPointerMonotonicity(
  previous: SelectorSnapshotPointer,
  nextUpdatedAt: number,
): void {
  if (nextUpdatedAt < previous.updatedAt) {
    throw new Error(
      `Pointer updatedAt regression: ${nextUpdatedAt} < ${previous.updatedAt}`,
    );
  }
}

export async function reconcilePointerWithRetry<T>(
  readFn: () => T | Promise<T>,
  options: ReconcilePointerOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const delayMs = options.delayMs ?? 50;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await readFn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export function reconcilePointerWithRetrySync<T>(
  readFn: () => T,
  options: ReconcilePointerOptions = {},
): T {
  const maxAttempts = options.maxAttempts ?? 3;
  const delayMs = options.delayMs ?? 50;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return readFn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const start = Date.now();
        while (Date.now() - start < delayMs * attempt) {
          // busy-wait for Node sync contexts
        }
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
