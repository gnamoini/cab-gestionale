import type { QueryClient } from "@tanstack/react-query";

/** Marker RQ: prossimo ensure deve forzare refetch (post-invalidate MIC). */
export const SCHEde_ENSURE_AFTER_INVALIDATE_KEY = ["schede", "ensure", "afterInvalidate"] as const;

/** Feature flag: refetch bundle anche se già in cache dopo invalidazione MIC. Default ON. */
export function isSchedeEnsureForceOnInvalidate(): boolean {
  return process.env.NEXT_PUBLIC_SCHEDE_ENSURE_FORCE_ON_INVALIDATE !== "0";
}

export function markSchedeEnsureAfterInvalidate(qc: QueryClient): void {
  if (!isSchedeEnsureForceOnInvalidate()) return;
  qc.setQueryData(SCHEde_ENSURE_AFTER_INVALIDATE_KEY, Date.now());
}

export function consumeSchedeEnsureAfterInvalidate(qc: QueryClient): boolean {
  if (!isSchedeEnsureForceOnInvalidate()) return false;
  const marked = qc.getQueryData<number>(SCHEde_ENSURE_AFTER_INVALIDATE_KEY) != null;
  if (marked) qc.removeQueries({ queryKey: SCHEde_ENSURE_AFTER_INVALIDATE_KEY });
  return marked;
}

export type EnsureSchedeBundlesOptions = {
  /** Bypass skip-if-present per tutti gli id richiesti. */
  force?: boolean;
  /** Refetch se bundle._fetchedAt più vecchio di maxAgeMs. */
  maxAgeMs?: number;
  /** Impostato dalla pipeline invalidate — forza refetch se flag env attivo. */
  afterInvalidate?: boolean;
};

export function shouldRefetchBundleSlice(
  existing: { _fetchedAt?: number } | undefined,
  options?: EnsureSchedeBundlesOptions,
): boolean {
  if (!existing) return true;
  if (options?.force) return true;
  if (options?.afterInvalidate && isSchedeEnsureForceOnInvalidate()) return true;
  if (options?.maxAgeMs != null && existing._fetchedAt != null) {
    return Date.now() - existing._fetchedAt > options.maxAgeMs;
  }
  return false;
}
