import "server-only";

import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import type { ReportDrillDownRow } from "@/lib/report/drilldown/types";
import { isPreventivoCountedInEconomicStats } from "@/lib/preventivi/preventivo-stats-eligibility";
import type { PreventivoRecord } from "@/lib/preventivi/types";

function preventivoRow(p: PreventivoRecord): ReportDrillDownRow {
  return {
    id: p.id,
    target: { entity: "preventivo", id: p.id },
    label: p.numero?.trim() || p.id,
    sublabel: p.cliente ?? undefined,
    amount: p.totaleFinale ?? null,
    date: p.dataCreazione || p.aggiornatoAt,
    status: p.statoWorkflow,
  };
}

export function listPreventiviInPeriod(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  statoWorkflow?: string,
): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const p of bundle.preventivi) {
    if (p.statoWorkflow === "bozza") continue;
    if (statoWorkflow && p.statoWorkflow !== statoWorkflow) continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    rows.push(preventivoRow(p));
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function listPreventiviApprovatiInPeriod(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const p of bundle.preventivi) {
    if (!isPreventivoCountedInEconomicStats(p)) continue;
    const at = p.dataCreazione || p.aggiornatoAt;
    if (!isoInRange(at, range)) continue;
    rows.push(preventivoRow(p));
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function resolvePreventiviDrilldownRows(
  metricId: string,
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  filters?: Record<string, string | number | boolean>,
): ReportDrillDownRow[] {
  if (metricId === "eco_preventivi_approvati") {
    return listPreventiviApprovatiInPeriod(bundle, range);
  }
  if (metricId !== "eco_preventivi") return [];
  const stato = filters?.statoWorkflow != null ? String(filters.statoWorkflow) : undefined;
  return listPreventiviInPeriod(bundle, range, stato);
}
