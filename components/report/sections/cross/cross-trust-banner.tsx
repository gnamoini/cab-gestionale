"use client";

import type { CrossMetricDto } from "@/lib/report/cross-analysis/types";

export function CrossTrustBanner({
  metrics,
  dataWarnings,
  trustStatus,
}: {
  metrics: readonly CrossMetricDto[] | null;
  dataWarnings: string[] | null;
  trustStatus: string | null;
}) {
  const amberMetrics = metrics?.filter((m) => m.trust === "AMBER") ?? [];
  const hasWarning =
    trustStatus === "AMBER" ||
    amberMetrics.length > 0 ||
    (dataWarnings != null && dataWarnings.length > 0);

  if (!hasWarning) return null;

  const parts: string[] = [];
  if (amberMetrics.length > 0) {
    parts.push("Alcuni KPI attendono il caricamento completo delle sezioni fonte.");
  }
  if (dataWarnings?.includes("cross_source_pending")) {
    parts.push("Dati parziali: apri Lavorazioni, Magazzino, Ore e Dati economici.");
  }
  parts.push("Valore/ora usa date fattura; le ore seguono il timesheet.");

  return (
    <div
      className="rounded-md border border-[color:var(--cab-warning-border)] bg-[color:var(--cab-warning-bg)] px-3 py-2 text-sm text-[color:var(--cab-text)]"
      role="status"
    >
      <p className="font-medium">Qualità dati cross-domain</p>
      <p className="mt-1 text-[color:var(--cab-text-muted)]">{parts.join(" ")}</p>
    </div>
  );
}
