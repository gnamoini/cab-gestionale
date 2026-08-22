import "server-only";

import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import { sottoScortaCount } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { aggregateMagazzinoQtyByProductInRange } from "@/lib/report/magazzino-period-aggregate";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";
import type { ReportDrillDownRow } from "@/lib/report/drilldown/types";
import { usciteQtyFromMagazzinoEntry } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

function isSottoScorta(r: RicambioMagazzino): boolean {
  const min = r.scortaMinima ?? 0;
  return min > 0 && (r.scorta ?? 0) < min;
}

function ricambioRow(r: RicambioMagazzino, amount?: number): ReportDrillDownRow {
  return {
    id: r.id,
    target: { entity: "ricambio", id: r.id },
    label: r.codiceFornitoreOriginale?.trim() || r.descrizione?.trim() || r.id,
    sublabel: r.marca ?? undefined,
    amount: amount ?? r.scorta ?? null,
    status: isSottoScorta(r) ? "sotto_scorta" : "ok",
  };
}

export function listRicambiSottoScorta(bundle: ReportAnalyticsSourceBundle): ReportDrillDownRow[] {
  void sottoScortaCount;
  const rows: ReportDrillDownRow[] = [];
  for (const r of bundle.integrity.magazzino) {
    if (isSottoScorta(r)) rows.push(ricambioRow(r));
  }
  return rows.sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

export function listRicambiCapitale(bundle: ReportAnalyticsSourceBundle): ReportDrillDownRow[] {
  const rows: ReportDrillDownRow[] = [];
  for (const r of bundle.integrity.magazzino) {
    const cap = capitaleImmobilizzato(r);
    if (cap <= 0) continue;
    rows.push(ricambioRow(r, cap));
  }
  return rows.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
}

export function listMovimentiUscitaInRange(
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  ricambioId?: string,
): ReportDrillDownRow[] {
  const agg = aggregateMagazzinoQtyByProductInRange(bundle.integrity.magLog, range);
  const prodMap = new Map(bundle.integrity.magazzino.map((p) => [p.id, p]));
  const rows: ReportDrillDownRow[] = [];

  for (const entry of bundle.integrity.magLog) {
    const qty = usciteQtyFromMagazzinoEntry(entry);
    if (qty <= 0) continue;
    if (!isoInRange(entry.at, range)) continue;
    if (ricambioId && entry.ricambioId !== ricambioId) continue;
    const prod = prodMap.get(entry.ricambioId);
    rows.push({
      id: entry.id,
      target: { entity: "movimento", id: entry.id },
      label: prod?.codiceFornitoreOriginale?.trim() || prod?.descrizione?.trim() || entry.ricambioId,
      sublabel: entry.riepilogo ?? undefined,
      amount: qty,
      date: entry.at,
      status: entry.tipo,
    });
  }
  return rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function resolveMagazzinoDrilldownRows(
  metricId: string,
  bundle: ReportAnalyticsSourceBundle,
  range: DateRange,
  filters?: Record<string, string | number | boolean>,
): ReportDrillDownRow[] {
  const ricambioId = filters?.ricambioId != null ? String(filters.ricambioId) : undefined;
  switch (metricId) {
    case "scorta":
      return listRicambiSottoScorta(bundle);
    case "cap":
      return listRicambiCapitale(bundle);
    case "ric-usati":
      return listMovimentiUscitaInRange(bundle, range, ricambioId);
    default:
      return [];
  }
}
