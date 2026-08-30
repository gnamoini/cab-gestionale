import type { LavorazioneArchiviata, LavorazioneAttiva, PrioritaLav } from "@/lib/lavorazioni/types";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import {
  closeDaysPercentiles,
  closeDaysValuesInRange,
  countCompletedByMonth,
  countCompletedInRange,
  countOpenedInRange,
  type ReportManualByMonth,
} from "@/lib/report/lavorazioni-report-selectors";
import { monthKeysOverlappingRange } from "@/lib/report/month-keys";
import { KPI_OPEN_LATE_DAYS_THRESHOLD, KPI_RECIDIVA_WINDOW_DAYS } from "@/lib/report/kpi-performance/kpi-performance-constants";

export type AgingBacklogBucket = "0-7" | "8-14" | "15-30" | "30+";

const AGING_BUCKET_ORDER: readonly AgingBacklogBucket[] = ["0-7", "8-14", "15-30", "30+"];

export function agingBucketLabel(bucket: AgingBacklogBucket): string {
  switch (bucket) {
    case "0-7":
      return "0–7 gg";
    case "8-14":
      return "8–14 gg";
    case "15-30":
      return "15–30 gg";
    case "30+":
      return "30+ gg";
  }
}

function daysOpen(dataIngresso: string, anchor: Date): number {
  const t0 = new Date(dataIngresso).getTime();
  if (Number.isNaN(t0)) return 0;
  return Math.max(0, Math.floor((anchor.getTime() - t0) / 86400000));
}

function agingBucketForDays(days: number): AgingBacklogBucket {
  if (days <= 7) return "0-7";
  if (days <= 14) return "8-14";
  if (days <= 30) return "15-30";
  return "30+";
}

/** Distribuzione WIP per fascia giorni da ingresso (snapshot). */
export function buildAgingBacklogBuckets(
  attive: readonly LavorazioneAttiva[],
  anchor = new Date(),
): Record<AgingBacklogBucket, number> {
  const buckets: Record<AgingBacklogBucket, number> = { "0-7": 0, "8-14": 0, "15-30": 0, "30+": 0 };
  for (const a of attive) {
    buckets[agingBucketForDays(daysOpen(a.dataIngresso, anchor))] += 1;
  }
  return buckets;
}

export function agingBacklogChartPoints(
  attive: readonly LavorazioneAttiva[],
  anchor = new Date(),
): { label: string; value: number }[] {
  const buckets = buildAgingBacklogBuckets(attive, anchor);
  return AGING_BUCKET_ORDER.map((b) => ({ label: agingBucketLabel(b), value: buckets[b] }));
}

export type SlaInterventoRow = {
  codice: string;
  cliente: string;
  mezzo: string;
  giorni: number;
  priorita: string;
  stato: string;
};

export function listInterventiOltreSla(
  attive: readonly LavorazioneAttiva[],
  statoLabelById: ReadonlyMap<string, string>,
  anchor = new Date(),
  sogliaGiorni = KPI_OPEN_LATE_DAYS_THRESHOLD,
): SlaInterventoRow[] {
  const rows: SlaInterventoRow[] = [];
  for (const a of attive) {
    const giorni = daysOpen(a.dataIngresso, anchor);
    if (giorni <= sogliaGiorni) continue;
    const mezzo = [a.macchina, a.targa].filter(Boolean).join(" · ") || "—";
    rows.push({
      codice: a.codice?.trim() || a.id,
      cliente: a.cliente.trim() || "—",
      mezzo,
      giorni,
      priorita: a.priorita,
      stato: statoLabelById.get(a.statoId) ?? a.statoId,
    });
  }
  return rows.sort((x, y) => y.giorni - x.giorni);
}

export type RecidivaMezzoRow = {
  mezzoId: string;
  mezzo: string;
  cliente: string;
  interventi: number;
  ultimoIntervento: string;
};

export function listRecidivaMezzi(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
): RecidivaMezzoRow[] {
  const byMezzo = new Map<string, { cliente: string; mezzo: string; dates: string[] }>();
  for (const c of completate) {
    if (!c.mezzoId || !c.dataCompletamento || !isoInRange(c.dataCompletamento, range)) continue;
    const mezzo = [c.macchina, c.targa].filter(Boolean).join(" · ") || c.mezzoId;
    const cur = byMezzo.get(c.mezzoId) ?? { cliente: c.cliente, mezzo, dates: [] };
    cur.dates.push(c.dataCompletamento);
    byMezzo.set(c.mezzoId, cur);
  }

  const windowMs = KPI_RECIDIVA_WINDOW_DAYS * 86400000;
  const rows: RecidivaMezzoRow[] = [];
  for (const [mezzoId, data] of byMezzo) {
    const sorted = data.dates.map((d) => new Date(d).getTime()).sort((a, b) => a - b);
    let recidiva = false;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]! - sorted[i - 1]! <= windowMs) {
        recidiva = true;
        break;
      }
    }
    if (!recidiva) continue;
    const ultimo = data.dates.reduce((a, b) => (a > b ? a : b));
    rows.push({
      mezzoId,
      mezzo: data.mezzo,
      cliente: data.cliente.trim() || "—",
      interventi: data.dates.length,
      ultimoIntervento: ultimo.slice(0, 10),
    });
  }
  return rows.sort((a, b) => b.interventi - a.interventi);
}

function monthRangeFromKey(mk: string): DateRange {
  const [y, m] = mk.split("-").map(Number);
  const start = new Date(y!, m! - 1, 1, 0, 0, 0, 0);
  const end = new Date(y!, m!, 0, 23, 59, 59, 999);
  return { start, end };
}

function intersectRange(a: DateRange, b: DateRange): DateRange {
  return {
    start: a.start > b.start ? a.start : b.start,
    end: a.end < b.end ? a.end : b.end,
  };
}

function monthShortLabel(mk: string): string {
  const [y, m] = mk.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("it-IT", { month: "short" });
}

export type IngressiChiusurePoint = {
  label: string;
  monthKey: string;
  ingressi: number;
  chiusure: number;
  /** Saldo cumulativo ingressi − chiusure nel periodo. */
  saldoCumulativo: number;
};

export function buildIngressiChiusureMonthlyPoints(
  attive: readonly LavorazioneAttiva[],
  storico: readonly LavorazioneArchiviata[],
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
  manualByMonth?: ReportManualByMonth,
): IngressiChiusurePoint[] {
  const closedByMonth = countCompletedByMonth([...completate], manualByMonth);
  let cumul = 0;
  return monthKeysOverlappingRange(range).map((mk) => {
    const slice = intersectRange(range, monthRangeFromKey(mk));
    const ingressi = countOpenedInRange([...attive], [...storico], slice);
    const chiusure = closedByMonth.get(mk) ?? countCompletedInRange([...completate], slice, manualByMonth);
    cumul += ingressi - chiusure;
    return { label: monthShortLabel(mk), monthKey: mk, ingressi, chiusure, saldoCumulativo: cumul };
  });
}

export type AgingStackedSeries = {
  statoId: string;
  label: string;
  color?: string;
  values: Record<AgingBacklogBucket, number>;
};

/** Aging backlog per fascia, segmentato per stato workflow. */
export function buildAgingBacklogStackedByStato(
  attive: readonly LavorazioneAttiva[],
  statoLabelById: ReadonlyMap<string, string>,
  statoColorById?: ReadonlyMap<string, string>,
  anchor = new Date(),
): AgingStackedSeries[] {
  const byStato = new Map<string, AgingStackedSeries>();
  for (const a of attive) {
    const bucket = agingBucketForDays(daysOpen(a.dataIngresso, anchor));
    let row = byStato.get(a.statoId);
    if (!row) {
      row = {
        statoId: a.statoId,
        label: statoLabelById.get(a.statoId) ?? a.statoId,
        color: statoColorById?.get(a.statoId),
        values: { "0-7": 0, "8-14": 0, "15-30": 0, "30+": 0 },
      };
      byStato.set(a.statoId, row);
    }
    row.values[bucket] += 1;
  }
  return [...byStato.values()].sort((a, b) => {
    const sum = (s: AgingStackedSeries) =>
      s.values["0-7"] + s.values["8-14"] + s.values["15-30"] + s.values["30+"];
    return sum(b) - sum(a);
  });
}

export type StatoAgingMatrixRow = {
  statoId: string;
  stato: string;
  buckets: Record<AgingBacklogBucket, number>;
  totale: number;
};

export function buildStatoAgingMatrix(
  attive: readonly LavorazioneAttiva[],
  statoLabelById: ReadonlyMap<string, string>,
  anchor = new Date(),
): StatoAgingMatrixRow[] {
  return buildAgingBacklogStackedByStato(attive, statoLabelById, undefined, anchor).map((s) => ({
    statoId: s.statoId,
    stato: s.label,
    buckets: { ...s.values },
    totale: s.values["0-7"] + s.values["8-14"] + s.values["15-30"] + s.values["30+"],
  }));
}

export type WipFunnelRow = {
  statoId: string;
  label: string;
  count: number;
};

export function buildWipFunnelByStato(
  attive: readonly LavorazioneAttiva[],
  statoLabelById: ReadonlyMap<string, string>,
): WipFunnelRow[] {
  const counts = new Map<string, number>();
  for (const a of attive) counts.set(a.statoId, (counts.get(a.statoId) ?? 0) + 1);
  return [...counts.entries()]
    .map(([statoId, count]) => ({
      statoId,
      label: statoLabelById.get(statoId) ?? statoId,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

const PRIORITA_ORDER: readonly PrioritaLav[] = ["urgente", "alta", "media", "bassa"];

export type CloseTimeByPrioritaRow = {
  priorita: PrioritaLav;
  label: string;
  median: number;
  p90: number;
  count: number;
};

const PRIORITA_LABEL: Record<PrioritaLav, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Media",
  bassa: "Bassa",
};

export function buildCloseTimeByPriorita(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
): CloseTimeByPrioritaRow[] {
  const byPriorita = new Map<PrioritaLav, number[]>();
  for (const c of completate) {
    if (!c.dataCompletamento || !isoInRange(c.dataCompletamento, range)) continue;
    const t0 = new Date(c.dataIngresso).getTime();
    const t1 = new Date(c.dataCompletamento).getTime();
    if (Number.isNaN(t0) || Number.isNaN(t1)) continue;
    const days = Math.max(0, (t1 - t0) / 86400000);
    if (days <= 0) continue;
    const p = c.prioritaFinale;
    const list = byPriorita.get(p) ?? [];
    list.push(days);
    byPriorita.set(p, list);
  }
  return PRIORITA_ORDER.filter((p) => (byPriorita.get(p)?.length ?? 0) > 0).map((p) => {
    const vals = byPriorita.get(p)!;
    const { median, p90 } = closeDaysPercentiles(vals);
    return { priorita: p, label: PRIORITA_LABEL[p], median, p90, count: vals.length };
  });
}

export function avgDaysOpenWip(attive: readonly LavorazioneAttiva[], anchor = new Date()): number {
  if (attive.length === 0) return 0;
  let sum = 0;
  for (const a of attive) sum += daysOpen(a.dataIngresso, anchor);
  return Math.round((sum / attive.length) * 10) / 10;
}

export type BacklogTrendPoint = {
  label: string;
  monthKey: string;
  wipProxy: number;
};

/** ponytail: proxy backlog da saldo cumulativo ingressi/chiusure (non snapshot WIP storico). */
export function buildBacklogTrendProxy(points: readonly IngressiChiusurePoint[]): BacklogTrendPoint[] {
  return points.map((p) => ({
    label: p.label,
    monthKey: p.monthKey,
    wipProxy: p.saldoCumulativo,
  }));
}

export type MtbfMttrRow = {
  mezzoId: string;
  mezzo: string;
  cliente: string;
  interventi: number;
  mttr: number;
  mtbf: number | null;
};

export function buildMtbfMttrByMezzo(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
): MtbfMttrRow[] {
  const byMezzo = new Map<
    string,
    { cliente: string; mezzo: string; closeDays: number[]; completionTimes: number[] }
  >();
  for (const c of completate) {
    if (!c.mezzoId || !c.dataCompletamento || !isoInRange(c.dataCompletamento, range)) continue;
    const mezzo = [c.macchina, c.targa].filter(Boolean).join(" · ") || c.mezzoId;
    const cur = byMezzo.get(c.mezzoId) ?? { cliente: c.cliente, mezzo, closeDays: [], completionTimes: [] };
    const t0 = new Date(c.dataIngresso).getTime();
    const t1 = new Date(c.dataCompletamento).getTime();
    if (!Number.isNaN(t0) && !Number.isNaN(t1)) {
      const days = Math.max(0, (t1 - t0) / 86400000);
      if (days > 0) cur.closeDays.push(days);
    }
    if (!Number.isNaN(t1)) cur.completionTimes.push(t1);
    byMezzo.set(c.mezzoId, cur);
  }
  const rows: MtbfMttrRow[] = [];
  for (const [mezzoId, data] of byMezzo) {
    if (data.closeDays.length === 0) continue;
    const mttr = Math.round((data.closeDays.reduce((s, v) => s + v, 0) / data.closeDays.length) * 10) / 10;
    const sorted = [...data.completionTimes].sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gap = (sorted[i]! - sorted[i - 1]!) / 86400000;
      if (gap > 0) gaps.push(gap);
    }
    const mtbf =
      gaps.length > 0 ? Math.round((gaps.reduce((s, v) => s + v, 0) / gaps.length) * 10) / 10 : null;
    rows.push({
      mezzoId,
      mezzo: data.mezzo,
      cliente: data.cliente.trim() || "—",
      interventi: data.closeDays.length,
      mttr,
      mtbf,
    });
  }
  return rows.sort((a, b) => b.interventi - a.interventi).slice(0, 15);
}

export type LavorazioniReportFilters = {
  priorita: PrioritaLav | "";
  statoId: string;
  clienteQ: string;
};

export function applyLavorazioniReportFilters(
  attive: readonly LavorazioneAttiva[],
  completate: readonly LavorazioneArchiviata[],
  filters: LavorazioniReportFilters,
): { attive: LavorazioneAttiva[]; completate: LavorazioneArchiviata[] } {
  const q = filters.clienteQ.trim().toLowerCase();
  const matchCliente = (cliente: string) => !q || cliente.toLowerCase().includes(q);
  const matchPrioritaAttiva = (p: PrioritaLav) => !filters.priorita || p === filters.priorita;
  const matchStato = (statoId: string) => !filters.statoId || statoId === filters.statoId;

  return {
    attive: attive.filter(
      (a) => matchCliente(a.cliente) && matchPrioritaAttiva(a.priorita) && matchStato(a.statoId),
    ),
    completate: completate.filter(
      (c) =>
        matchCliente(c.cliente) &&
        (!filters.priorita || c.prioritaFinale === filters.priorita) &&
        matchStato(c.statoFinaleId),
    ),
  };
}

export function closeTimePercentilesInRange(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
): { median: number; p90: number; avg: number } {
  const vals = closeDaysValuesInRange(completate, range);
  const { median, p90 } = closeDaysPercentiles(vals);
  const avg =
    vals.length > 0 ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0;
  return { median, p90, avg };
}
