"use client";

import type { QueryClient } from "@tanstack/react-query";
import { auditCompatBatch } from "@/lib/magazzino/compat/compat-consistency-auditor";
import { repairBatchCompat } from "@/lib/magazzino/compat/compat-auto-repair-engine";
import {
  magazzinoListQueryKey,
  mapMagazzinoRowsToUI,
  patchMagazzinoListCache,
} from "@/lib/magazzino/magazzino-list-cache";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";

export type CompatDevToolsOpts = {
  queryClient: QueryClient;
  getMezziListe: () => MezziListePrefs | undefined;
};

declare global {
  interface Window {
    __compatAudit?: () => { total: number; issues: number; reports: ReturnType<typeof auditCompatBatch> };
    __compatRepairAll?: () => { total: number; repaired: number };
  }
}

export function registerCompatDevTools(opts: CompatDevToolsOpts): () => void {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return () => {};
  }

  const { queryClient, getMezziListe } = opts;

  window.__compatAudit = () => {
    const rows = queryClient.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey()) ?? [];
    const liste = getMezziListe();
    const ui = mapMagazzinoRowsToUI(rows, "Sistema", liste);
    const reports = auditCompatBatch(ui, liste, "compat-dev-tools.__compatAudit");
    const issues = reports.filter((r) => r.status !== "ok").length;
    console.table(
      reports
        .filter((r) => r.status !== "ok")
        .map((r) => ({ id: r.ricambioId, status: r.status, issues: r.issues.join(", ") })),
    );
    return { total: reports.length, issues, reports };
  };

  window.__compatRepairAll = () => {
    const rows = queryClient.getQueryData<MagazzinoRicambioRow[]>(magazzinoListQueryKey()) ?? [];
    const liste = getMezziListe();
    const ui = mapMagazzinoRowsToUI(rows, "Sistema", liste);
    const results = repairBatchCompat(ui, liste, { source: "compat-dev-tools.__compatRepairAll" });
    const repaired = results.filter((r) => r.changed).length;
    patchMagazzinoListCache(
      queryClient,
      () => results.map((r) => r.ricambio),
      liste,
    );
    console.info(`[compat-dev-tools] repaired ${repaired}/${results.length} in-memory`);
    return { total: results.length, repaired };
  };

  return () => {
    delete window.__compatAudit;
    delete window.__compatRepairAll;
  };
}
