"use client";

import type { QueryClient } from "@tanstack/react-query";
import { collectQueryKeysForGestionaleTables } from "@/src/lib/react-query/invalidate-targets";

export const OPERATIONAL_DOMAINS = {
  lavorazioni: ["lavorazioni"],
  schede: ["scheda_lavorazione"],
  ricambi: ["magazzino_ricambi", "movimenti_ricambi"],
  documenti: ["documenti", "lavorazione_documents"],
} as const;

export type OperationalDomain = keyof typeof OPERATIONAL_DOMAINS;

export type RefetchOperationalSnapshotOptions = {
  /** Solo query attive montate (default true). */
  onlyActive?: boolean;
  includePortal?: boolean;
};

/** Refetch mirato per domini operativi — no invalidazione globale. */
export function refetchOperationalSnapshot(
  qc: QueryClient,
  domains: OperationalDomain[],
  opts?: RefetchOperationalSnapshotOptions,
): void {
  const tables = domains.flatMap((d) => [...OPERATIONAL_DOMAINS[d]]);
  const keys = collectQueryKeysForGestionaleTables(tables, {
    includePortal: opts?.includePortal ?? false,
  });
  const type = opts?.onlyActive !== false ? "active" : "all";
  for (const queryKey of keys) {
    void qc.refetchQueries({ queryKey, type });
  }
}

/** Domini con almeno una query attiva in cache. */
export function activeOperationalDomains(qc: QueryClient): OperationalDomain[] {
  const out: OperationalDomain[] = [];
  for (const domain of Object.keys(OPERATIONAL_DOMAINS) as OperationalDomain[]) {
    const tables = [...OPERATIONAL_DOMAINS[domain]];
    const keys = collectQueryKeysForGestionaleTables(tables, { includePortal: false });
    const hasActive = keys.some((queryKey) => {
      const queries = qc.getQueryCache().findAll({ queryKey, type: "active" });
      return queries.length > 0;
    });
    if (hasActive) out.push(domain);
  }
  return out;
}

/** Snapshot solo per domini con query attive montate. */
export function refetchActiveOperationalSnapshot(
  qc: QueryClient,
  opts?: RefetchOperationalSnapshotOptions,
): void {
  const domains = activeOperationalDomains(qc);
  if (domains.length === 0) return;
  refetchOperationalSnapshot(qc, domains, opts);
}
