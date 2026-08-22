import "server-only";

import { KPI_OPEN_LATE_DAYS_THRESHOLD } from "@/lib/report/kpi-performance/kpi-performance-constants";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import type { ReportDrillDownRow } from "@/lib/report/drilldown/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";

function daysOpen(dataIngresso: string, anchor: Date): number {
  const t0 = new Date(dataIngresso).getTime();
  if (Number.isNaN(t0)) return 0;
  return Math.max(0, Math.floor((anchor.getTime() - t0) / 86400000));
}

function lavRowFromAttiva(a: LavorazioneAttiva): ReportDrillDownRow {
  return {
    id: a.id,
    target: { entity: "lavorazione", id: a.id },
    label: a.codice?.trim() || a.id,
    sublabel: [a.cliente, a.macchina].filter(Boolean).join(" · "),
    date: a.dataIngresso,
    status: a.statoId,
  };
}

function lavRowFromArchiviata(a: LavorazioneArchiviata): ReportDrillDownRow {
  return {
    id: a.id,
    target: { entity: "lavorazione", id: a.id },
    label: a.codice?.trim() || a.id,
    sublabel: [a.cliente, a.macchina].filter(Boolean).join(" · "),
    date: a.dataCompletamento ?? a.dataIngresso,
    status: "completata",
  };
}

export function listLavorazioniOpenedInRange(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const a of bundle.integrity.attive) {
    if (isoInRange(a.dataIngresso, range)) rows.push(lavRowFromAttiva(a));
  }
  for (const a of bundle.integrity.storico) {
    if (isoInRange(a.dataIngresso, range)) rows.push(lavRowFromArchiviata(a));
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function listLavorazioniCompletedInRange(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const a of bundle.integrity.completate) {
    if (a.dataCompletamento && isoInRange(a.dataCompletamento, range)) {
      rows.push(lavRowFromArchiviata(a));
    }
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function listLavorazioniOpenSnapshot(bundle: ReportAnalyticsSourceBundle): ReportDrillDownRow[] {
  return bundle.integrity.attive.map(lavRowFromAttiva).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function listLavorazioniLateSla(
  bundle: ReportAnalyticsSourceBundle,
  anchor = new Date(),
  sogliaGiorni = KPI_OPEN_LATE_DAYS_THRESHOLD,
): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const a of bundle.integrity.attive) {
    if (daysOpen(a.dataIngresso, anchor) > sogliaGiorni) {
      rows.push(lavRowFromAttiva(a));
    }
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function listLavorazioniCancelledInRange(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const r of bundle.lavRows) {
    if (r.stato !== "annullata") continue;
    const at = r.data_ingresso?.trim() || r.created_at;
    if (!isoInRange(at, range)) continue;
    rows.push({
      id: r.id,
      target: { entity: "lavorazione", id: r.id },
      label: r.codice?.trim() || r.id,
      sublabel: r.mezzo?.targa ?? undefined,
      date: at,
      status: "annullata",
    });
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function resolveLavorazioniDrilldownRows(
  metricId: string,
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
): ReportDrillDownRow[] {
  switch (metricId) {
    case "lav-periodo":
      return listLavorazioniOpenedInRange(bundle, range);
    case "lav-chiusi":
      return listLavorazioniCompletedInRange(bundle, range);
    case "lav-aperti":
      return listLavorazioniOpenSnapshot(bundle);
    case "lav_late_sla":
      return listLavorazioniLateSla(bundle);
    case "lav_cancelled":
      return listLavorazioniCancelledInRange(bundle, range);
    default:
      return [];
  }
}
