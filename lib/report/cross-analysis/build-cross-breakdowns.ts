import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import { computeLavorazioneCosto } from "@/lib/lavorazioni/lavorazione-costo";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { topMezziByEstimatedCost } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import { monthKeysOverlappingRange } from "@/lib/report/month-keys";
import { countCompletedInRange } from "@/lib/report/lavorazioni-report-selectors";
import type { InvoiceRow } from "@/src/types/supabase-tables";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import { isPreventivoCountedInEconomicStats } from "@/lib/preventivi/preventivo-stats-eligibility";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export type CrossScatterPoint = {
  id: string;
  label: string;
  ore: number;
  ricambiQty: number;
  costo: number;
  outlier: boolean;
};

export type CrossClientePoint = {
  cliente: string;
  fatturato: number;
  costoStimato: number;
  margine: number;
  quadrant: "profitto" | "attenzione" | "perdita";
};

export type CrossMezzoCostRow = {
  mezzoId: string;
  label: string;
  cost: number;
  interventi: number;
};

export type CrossOutlierRow = {
  id: string;
  label: string;
  ore: number;
  ricambiQty: number;
  costo: number;
  zScore: number;
};

export type CrossCatenaValoreStage = {
  stage: string;
  value: number;
};

export type CrossPreventivoConsuntivo = {
  count: number;
  avgDeltaPct: number | null;
};

export type CrossVolumeAnomaly = {
  monthKey: string;
  label: string;
  value: number;
  zScore: number;
  anomalous: boolean;
};

function zScores(values: number[]): number[] {
  if (values.length < 2) return values.map(() => 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  if (std <= 0) return values.map(() => 0);
  return values.map((v) => Math.round(((v - mean) / std) * 100) / 100);
}

export function buildCrossScatterPoints(input: {
  completate: readonly LavorazioneArchiviata[];
  range: DateRange;
  schedeStore: LavorazioneSchedeStore | null;
  costoOrario: number;
  magazzinoRows: readonly MagazzinoRicambioRow[];
}): CrossScatterPoint[] {
  if (!input.schedeStore) return [];
  const magById = new Map(input.magazzinoRows.map((r) => [r.id, r]));
  const points: CrossScatterPoint[] = [];

  for (const c of input.completate) {
    if (!c.dataCompletamento || !isoInRange(c.dataCompletamento, input.range)) continue;
    const bundle = input.schedeStore[c.id];
    if (!bundle) continue;
    const br = computeLavorazioneCosto({ bundle, costoOrario: input.costoOrario, magazzinoById: magById });
    if (br.oreTotali <= 0 && br.righeRicambi <= 0) continue;
    const ricambiQty = (bundle.ricambi?.campi.righe ?? []).reduce(
      (s, r) => s + (r.quantita > 0 ? r.quantita : 0),
      0,
    );
    const label = c.cliente?.trim() || c.id.slice(0, 8);
    points.push({
      id: c.id,
      label,
      ore: br.oreTotali,
      ricambiQty,
      costo: br.costoTotale,
      outlier: false,
    });
  }

  const oreZ = zScores(points.map((p) => p.ore));
  const ricZ = zScores(points.map((p) => p.ricambiQty));
  return points.map((p, i) => ({
    ...p,
    outlier: Math.abs(oreZ[i]!) > 2 || Math.abs(ricZ[i]!) > 2,
  }));
}

export function buildCrossClienteRedditivita(input: {
  invoices: readonly InvoiceRow[];
  completate: readonly LavorazioneArchiviata[];
  range: DateRange;
  schedeStore: LavorazioneSchedeStore | null;
  costoOrario: number;
  magazzinoRows: readonly MagazzinoRicambioRow[];
}): CrossClientePoint[] {
  const fattByCliente = new Map<string, number>();
  for (const inv of input.invoices) {
    const iso = inv.data_emissione ?? inv.created_at;
    if (!iso || !isoInRange(iso, input.range)) continue;
    if (inv.status === "bozza" || inv.status === "da_verificare") continue;
    const cliente = (inv.cliente_label ?? "—").trim() || "—";
    fattByCliente.set(cliente, (fattByCliente.get(cliente) ?? 0) + (inv.totale ?? 0));
  }

  const costByCliente = new Map<string, number>();
  if (input.schedeStore) {
    const magById = new Map(input.magazzinoRows.map((r) => [r.id, r]));
    for (const c of input.completate) {
      if (!c.dataCompletamento || !isoInRange(c.dataCompletamento, input.range)) continue;
      const bundle = input.schedeStore[c.id];
      if (!bundle) continue;
      const cliente = (c.cliente ?? "—").trim() || "—";
      const br = computeLavorazioneCosto({
        bundle,
        costoOrario: input.costoOrario,
        magazzinoById: magById,
      });
      costByCliente.set(cliente, (costByCliente.get(cliente) ?? 0) + br.costoTotale);
    }
  }

  const clienti = new Set([...fattByCliente.keys(), ...costByCliente.keys()]);
  const rows: CrossClientePoint[] = [];
  for (const cliente of clienti) {
    const fatturato = Math.round((fattByCliente.get(cliente) ?? 0) * 100) / 100;
    const costoStimato = Math.round((costByCliente.get(cliente) ?? 0) * 100) / 100;
    const margine = Math.round((fatturato - costoStimato) * 100) / 100;
    let quadrant: CrossClientePoint["quadrant"] = "attenzione";
    if (margine > 0 && fatturato > costoStimato) quadrant = "profitto";
    if (margine < 0) quadrant = "perdita";
    rows.push({ cliente, fatturato, costoStimato, margine, quadrant });
  }
  return rows.sort((a, b) => b.fatturato - a.fatturato).slice(0, 12);
}

export function buildCrossMezzoCostoMatrix(input: {
  completate: readonly LavorazioneArchiviata[];
  range: DateRange;
  schedeStore: LavorazioneSchedeStore | null;
  costoOrario: number;
  magazzinoRows: readonly MagazzinoRicambioRow[];
  mezzi: readonly MezzoGestito[];
  lavRows: readonly LavorazioneListRow[];
}): CrossMezzoCostRow[] {
  return topMezziByEstimatedCost(
    input.completate,
    input.range,
    input.schedeStore,
    input.costoOrario,
    input.magazzinoRows,
    input.mezzi,
  )
    .slice(0, 10)
    .map((r) => ({
      mezzoId: r.mezzoId,
      label: r.label,
      cost: r.cost,
      interventi: 0,
    }));
}

export function buildCrossOutlierTable(scatter: readonly CrossScatterPoint[]): CrossOutlierRow[] {
  const oreZ = zScores(scatter.map((p) => p.ore));
  const ricZ = zScores(scatter.map((p) => p.ricambiQty));
  return scatter
    .map((p, i) => ({
      id: p.id,
      label: p.label,
      ore: p.ore,
      ricambiQty: p.ricambiQty,
      costo: p.costo,
      zScore: Math.round(Math.max(Math.abs(oreZ[i]!), Math.abs(ricZ[i]!)) * 100) / 100,
    }))
    .filter((r) => r.zScore > 2)
    .sort((a, b) => b.zScore - a.zScore)
    .slice(0, 20);
}

export function buildCrossCatenaValore(input: {
  preventivi: readonly PreventivoRecord[];
  invoices: readonly InvoiceRow[];
  completate: readonly LavorazioneArchiviata[];
  range: DateRange;
}): CrossCatenaValoreStage[] {
  let preventiviVal = 0;
  for (const p of input.preventivi) {
    if (!p.dataCreazione || !isoInRange(p.dataCreazione, input.range)) continue;
    if (!isPreventivoCountedInEconomicStats(p)) continue;
    preventiviVal += p.totaleFinale ?? 0;
  }
  const closed = countCompletedInRange(input.completate, input.range, new Map());
  let fatturato = 0;
  let incassato = 0;
  for (const inv of input.invoices) {
    const iso = inv.data_emissione ?? inv.created_at;
    if (!iso || !isoInRange(iso, input.range)) continue;
    if (inv.status === "bozza" || inv.status === "da_verificare") continue;
    fatturato += inv.totale ?? 0;
    if (inv.status === "pagata") incassato += inv.totale ?? 0;
  }
  return [
    { stage: "Preventivi", value: Math.round(preventiviVal) },
    { stage: "Chiusure", value: closed },
    { stage: "Fatturato", value: Math.round(fatturato) },
    { stage: "Incassato", value: Math.round(incassato) },
  ];
}

export function buildCrossPreventivoConsuntivo(
  preventivi: readonly PreventivoRecord[],
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
  schedeStore: LavorazioneSchedeStore | null,
  costoOrario: number,
  magazzinoRows: readonly MagazzinoRicambioRow[],
): CrossPreventivoConsuntivo {
  if (!schedeStore) return { count: 0, avgDeltaPct: null };
  const magById = new Map(magazzinoRows.map((r) => [r.id, r]));
  const deltas: number[] = [];
  for (const p of preventivi) {
    if (!p.lavorazioneId || !p.dataCreazione || !isoInRange(p.dataCreazione, range)) continue;
    if (p.statoWorkflow === "bozza" || p.statoCliente !== "accettato") continue;
    const lav = completate.find((c) => c.id === p.lavorazioneId);
    if (!lav?.dataCompletamento || !isoInRange(lav.dataCompletamento, range)) continue;
    const bundle = schedeStore[p.lavorazioneId];
    if (!bundle) continue;
    const consuntivo = computeLavorazioneCosto({
      bundle,
      costoOrario,
      magazzinoById: magById,
    }).costoTotale;
    const prev = p.totaleFinale ?? 0;
    if (prev <= 0) continue;
    deltas.push(((consuntivo - prev) / prev) * 100);
  }
  if (deltas.length === 0) return { count: 0, avgDeltaPct: null };
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return { count: deltas.length, avgDeltaPct: Math.round(avg * 10) / 10 };
}

export function buildCrossVolumeAnomaly(
  completateByMonth: Map<string, number>,
  range: DateRange,
): CrossVolumeAnomaly[] {
  const keys = monthKeysOverlappingRange(range);
  const values = keys.map((mk) => completateByMonth.get(mk) ?? 0);
  const zs = zScores(values);
  return keys.map((monthKey, i) => {
    const [y, m] = monthKey.split("-").map(Number);
    const label = new Date(y!, m! - 1, 1).toLocaleDateString("it-IT", {
      month: "short",
      year: "2-digit",
    });
    const zScore = zs[i] ?? 0;
    return {
      monthKey,
      label,
      value: values[i]!,
      zScore,
      anomalous: Math.abs(zScore) > 2,
    };
  });
}
