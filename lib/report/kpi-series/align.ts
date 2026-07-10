import type { KpiSeries, KpiSeriesPoint } from "@/lib/report/kpi-series/contracts/kpi-series-contract";

export function alignSeriesDates(seriesList: KpiSeries[]): string[] {
  const dates = new Set<string>();
  for (const s of seriesList) {
    for (const p of s.points) dates.add(p.date);
  }
  return [...dates].sort();
}

function indexPoints(points: KpiSeriesPoint[]): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const p of points) m.set(p.date, p.value);
  return m;
}

/** Allinea le serie su un insieme comune di date (unione). */
export function alignKpiSeries(seriesList: KpiSeries[]): KpiSeries[] {
  const dates = alignSeriesDates(seriesList);
  return seriesList.map((s) => {
    const byDate = indexPoints(s.points);
    return {
      ...s,
      points: dates.map((date) => ({ date, value: byDate.get(date) ?? null })),
    };
  });
}
