import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { computeLavorazioneCosto } from "@/lib/lavorazioni/lavorazione-costo";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { buildRicambiConsumoRanking } from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  interventiMezzoDaLavorazioniDb,
  mezzoHaLavorazioneAttivaDb,
} from "@/lib/mezzi/interventi-from-lavorazioni-db";
import {
  frequenzaGuastiDaInterventi,
  mediaGiorniFermoInterventi,
} from "@/lib/mezzi/mezzi-helpers";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { aggregateMagazzinoQtyByProductInRange } from "@/lib/report/magazzino-period-aggregate";
import { isoInRange, type DateRange } from "@/lib/report/date-ranges";
import { monthKeysOverlappingRange } from "@/lib/report/lavorazioni-report-selectors";
import { computeReportMagazzinoKpiFromUi } from "@/lib/report/report-kpi-selectors";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";
import {
  KPI_OPEN_LATE_DAYS_THRESHOLD,
  KPI_RECIDIVA_WINDOW_DAYS,
  KPI_TOP_N,
} from "@/lib/report/kpi-performance/kpi-performance-constants";

const GUASTO_RE =
  /guasto|avaria|fermo|emergenza|critico|stop|perdita/i;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysBetween(isoStart: string, end: Date): number {
  const t0 = new Date(isoStart).getTime();
  if (Number.isNaN(t0)) return 0;
  return Math.max(0, (end.getTime() - t0) / 86400000);
}

function mezzoLabel(m: MezzoGestito): string {
  return `${m.marca} ${m.modello}`.trim() || m.targa || m.id;
}

/** Formula: COUNT(mezzi) */
export function countMezziTotal(mezzi: readonly MezzoGestito[]): number {
  return mezzi.length;
}

/**
 * Proxy operatività: mezzi senza lavorazione non archiviata collegata.
 * Formula: COUNT(mezzi WHERE NOT EXISTS lav_attiva su mezzo_id)
 */
export function countMezziOperativiProxy(
  mezzi: readonly MezzoGestito[],
  lavRows: readonly LavorazioneListRow[],
): number {
  let n = 0;
  for (const m of mezzi) {
    if (!mezzoHaLavorazioneAttivaDb(m, lavRows)) n += 1;
  }
  return n;
}

/**
 * Proxy «fermo / in officina»: mezzi con almeno una lavorazione aperta.
 * Formula: COUNT(mezzi WHERE haLavAttiva)
 */
export function countMezziInOfficinaProxy(
  mezzi: readonly MezzoGestito[],
  lavRows: readonly LavorazioneListRow[],
): number {
  return mezzi.length - countMezziOperativiProxy(mezzi, lavRows);
}

/**
 * Disponibilità flotta % (proxy).
 * Formula: (mezziOperativi / mezziTotali) × 100; null se totale = 0.
 */
export function disponibilitaFlottaPctProxy(
  mezzi: readonly MezzoGestito[],
  lavRows: readonly LavorazioneListRow[],
): number | null {
  const tot = mezzi.length;
  if (tot === 0) return null;
  const op = countMezziOperativiProxy(mezzi, lavRows);
  return round2((op / tot) * 100);
}

export type ClienteDisponibilitaRow = {
  cliente: string;
  totalMezzi: number;
  mezziOperativi: number;
  mezziInOfficina: number;
  disponibilitaPct: number | null;
};

function clienteKey(mezzo: MezzoGestito): string {
  return mezzo.cliente.trim() || "—";
}

/**
 * Disponibilità flotta % per cliente (proxy).
 * Formula per cliente: (mezziOperativi / mezziTotaliCliente) × 100.
 */
export function disponibilitaFlottaPerCliente(
  mezzi: readonly MezzoGestito[],
  lavRows: readonly LavorazioneListRow[],
): ClienteDisponibilitaRow[] {
  const buckets = new Map<string, MezzoGestito[]>();
  for (const m of mezzi) {
    const key = clienteKey(m);
    const list = buckets.get(key) ?? [];
    list.push(m);
    buckets.set(key, list);
  }

  const rows: ClienteDisponibilitaRow[] = [];
  for (const [cliente, group] of buckets) {
    const total = group.length;
    const mezziOperativi = countMezziOperativiProxy(group, lavRows);
    const mezziInOfficina = countMezziInOfficinaProxy(group, lavRows);
    rows.push({
      cliente,
      totalMezzi: total,
      mezziOperativi,
      mezziInOfficina,
      disponibilitaPct: total === 0 ? null : round2((mezziOperativi / total) * 100),
    });
  }

  return rows.sort(
    (a, b) => b.totalMezzi - a.totalMezzi || a.cliente.localeCompare(b.cliente, "it"),
  );
}

/** Cliente con disponibilità minima (pareggio → più mezzi in anagrafica). */
export function peggiorDisponibilitaCliente(
  rows: readonly ClienteDisponibilitaRow[],
): { cliente: string; disponibilitaPct: number } | null {
  let worst: ClienteDisponibilitaRow | null = null;
  for (const row of rows) {
    if (row.disponibilitaPct == null) continue;
    if (!worst) {
      worst = row;
      continue;
    }
    if (row.disponibilitaPct < worst.disponibilitaPct!) {
      worst = row;
      continue;
    }
    if (row.disponibilitaPct === worst.disponibilitaPct && row.totalMezzi > worst.totalMezzi) {
      worst = row;
    }
  }
  if (!worst || worst.disponibilitaPct == null) return null;
  return { cliente: worst.cliente, disponibilitaPct: worst.disponibilitaPct };
}

/** Conteggio clienti con disponibilità sotto soglia (default 75%). */
export function countClientiSottoSogliaDisponibilita(
  rows: readonly ClienteDisponibilitaRow[],
  sogliaPct = 75,
): number {
  return rows.filter((r) => r.disponibilitaPct != null && r.disponibilitaPct < sogliaPct).length;
}

/** Formula: COUNT(lavorazioni NOT archived) — passato come attive.length dal bundle report. */
export function countInterventiAperti(attive: readonly LavorazioneAttiva[]): number {
  return attive.length;
}

/**
 * Interventi in ritardo (proxy SLA).
 * Formula: COUNT(attive WHERE giorniDaIngresso > SOGLIA)
 */
export function countInterventiInRitardo(
  attive: readonly LavorazioneAttiva[],
  anchor: Date,
  sogliaGiorni = KPI_OPEN_LATE_DAYS_THRESHOLD,
): number {
  let n = 0;
  for (const a of attive) {
    if (daysBetween(a.dataIngresso, anchor) > sogliaGiorni) n += 1;
  }
  return n;
}

/**
 * Costo ricambi nel periodo da log magazzino.
 * Formula: SUM(uscite_qty[ricambio] × costo_acquisto[ricambio]) nel range
 */
export function sumRicambiCostFromMagLog(
  magLog: readonly MagazzinoChangeLogEntry[],
  prodotti: readonly RicambioMagazzino[],
  range: DateRange,
): number {
  const byId = aggregateMagazzinoQtyByProductInRange([...magLog], range);
  const costMap = new Map(prodotti.map((p) => [p.id, p.prezzoFornitoreOriginale ?? 0]));
  let sum = 0;
  for (const [id, agg] of byId) {
    const unit = costMap.get(id) ?? 0;
    sum += agg.uscite * unit;
  }
  return round2(sum);
}

/**
 * Costi manodopera + ricambi scheda su completate nel periodo.
 * Formula: SUM(computeLavorazioneCosto(bundle, costoOrario, magazzinoById))
 */
export function sumManodoperaCostFromSchede(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
  schedeStore: LavorazioneSchedeStore | null,
  costoOrario: number,
  magazzinoRows: readonly MagazzinoRicambioRow[],
): { manodopera: number; ricambiScheda: number; lavorazioniConScheda: number } {
  if (!schedeStore) return { manodopera: 0, ricambiScheda: 0, lavorazioniConScheda: 0 };
  const magById = new Map(magazzinoRows.map((r) => [r.id, r]));
  let manodopera = 0;
  let ricambiScheda = 0;
  let withScheda = 0;
  for (const c of completate) {
    if (!c.dataCompletamento || !isoInRange(c.dataCompletamento, range)) continue;
    const bundle = schedeStore[c.id];
    if (!bundle) continue;
    withScheda += 1;
    const br = computeLavorazioneCosto({ bundle, costoOrario, magazzinoById: magById });
    manodopera += br.manodoperaTotale;
    ricambiScheda += br.ricambiTotale;
  }
  return {
    manodopera: round2(manodopera),
    ricambiScheda: round2(ricambiScheda),
    lavorazioniConScheda: withScheda,
  };
}

/** Tempo medio fermo su chiusure nel periodo (giorni ingresso→uscita). */
export function avgDowntimeDaysInPeriod(
  mezzi: readonly MezzoGestito[],
  lavRows: readonly LavorazioneListRow[],
  range: DateRange,
): number | null {
  const durations: number[] = [];
  for (const m of mezzi) {
    const interventi = interventiMezzoDaLavorazioniDb(m, lavRows).filter(
      (i) => i.dataCompletamento && isoInRange(i.dataCompletamento, range),
    );
    const avg = mediaGiorniFermoInterventi(interventi);
    if (avg != null && avg > 0) durations.push(avg);
  }
  if (durations.length === 0) return null;
  return round2(durations.reduce((a, b) => a + b, 0) / durations.length);
}

/** Guasti euristici per mese nel periodo (conteggio interventi con testo guasto). */
export function heuristicFaultsByMonth(
  mezzi: readonly MezzoGestito[],
  lavRows: readonly LavorazioneListRow[],
  range: DateRange,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const mk of monthKeysOverlappingRange(range)) out.set(mk, 0);
  for (const m of mezzi) {
    for (const i of interventiMezzoDaLavorazioniDb(m, lavRows)) {
      if (!isoInRange(i.dataIngresso, range)) continue;
      const text = `${i.tipoIntervento} ${i.descrizione}`;
      if (!GUASTO_RE.test(text)) continue;
      const mk = i.dataIngresso.slice(0, 7);
      if (!out.has(mk)) continue;
      out.set(mk, (out.get(mk) ?? 0) + 1);
    }
  }
  return out;
}

/** Distribuzione guasti euristici per tipo attrezzatura. */
export function guastiByTipoAttrezzatura(
  mezzi: readonly MezzoGestito[],
  lavRows: readonly LavorazioneListRow[],
  range: DateRange,
): { tipo: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of mezzi) {
    for (const i of interventiMezzoDaLavorazioniDb(m, lavRows)) {
      if (!isoInRange(i.dataIngresso, range)) continue;
      const text = `${i.tipoIntervento} ${i.descrizione}`;
      if (!GUASTO_RE.test(text)) continue;
      const tipo = m.tipoAttrezzatura?.trim() || "—";
      counts.set(tipo, (counts.get(tipo) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count);
}

export function mezziConFrequenzaGuastiAlta(
  mezzi: readonly MezzoGestito[],
  lavRows: readonly LavorazioneListRow[],
): { mezzoId: string; label: string }[] {
  const out: { mezzoId: string; label: string }[] = [];
  for (const m of mezzi) {
    const interventi = interventiMezzoDaLavorazioniDb(m, lavRows);
    if (frequenzaGuastiDaInterventi(interventi) === "ALTA") {
      out.push({ mezzoId: m.id, label: mezzoLabel(m) });
    }
  }
  return out;
}

export function sottoScortaCount(prodotti: readonly RicambioMagazzino[]): number {
  return computeReportMagazzinoKpiFromUi(prodotti).sottoScorta;
}

export function topMezziByEstimatedCost(
  completate: readonly LavorazioneArchiviata[],
  range: DateRange,
  schedeStore: LavorazioneSchedeStore | null,
  costoOrario: number,
  magazzinoRows: readonly MagazzinoRicambioRow[],
  mezzi: readonly MezzoGestito[],
  limit = KPI_TOP_N,
): { mezzoId: string; label: string; cost: number }[] {
  const byMezzo = new Map<string, number>();
  const magById = new Map(magazzinoRows.map((r) => [r.id, r]));
  for (const c of completate) {
    if (!c.mezzoId || !c.dataCompletamento || !isoInRange(c.dataCompletamento, range)) continue;
    const bundle = schedeStore?.[c.id];
    if (!bundle) continue;
    const br = computeLavorazioneCosto({ bundle, costoOrario, magazzinoById: magById });
    byMezzo.set(c.mezzoId, (byMezzo.get(c.mezzoId) ?? 0) + br.costoTotale);
  }
  const labelById = new Map(mezzi.map((m) => [m.id, mezzoLabel(m)]));
  return [...byMezzo.entries()]
    .map(([mezzoId, cost]) => ({
      mezzoId,
      label: labelById.get(mezzoId) ?? mezzoId,
      cost: round2(cost),
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);
}

export function buildAlerts(input: {
  attive: readonly LavorazioneAttiva[];
  anchor: Date;
  prodotti: readonly RicambioMagazzino[];
  mezzi: readonly MezzoGestito[];
  completate: readonly LavorazioneArchiviata[];
  lavRows: readonly LavorazioneListRow[];
}): import("@/lib/report/kpi-performance/kpi-performance-types").KpiPerformanceAlert[] {
  const alerts: import("@/lib/report/kpi-performance/kpi-performance-types").KpiPerformanceAlert[] = [];

  const late = countInterventiInRitardo(input.attive, input.anchor);
  if (late > 0) {
    alerts.push({
      id: "open-late",
      severity: "warning",
      title: `${late} lavorazioni oltre ${KPI_OPEN_LATE_DAYS_THRESHOLD} giorni`,
      detail: "Aperte da più della soglia configurata senza chiusura.",
    });
  }

  const sotto = sottoScortaCount(input.prodotti);
  if (sotto > 0) {
    alerts.push({
      id: "sotto-scorta",
      severity: "critical",
      title: `${sotto} ricambi sotto scorta minima`,
      detail: "Quantità in magazzino inferiore alla scorta minima impostata.",
    });
  }

  const recidivaMezzi = new Set<string>();
  const byMezzo = new Map<string, string[]>();
  for (const c of input.completate) {
    if (!c.mezzoId || !c.dataCompletamento) continue;
    const list = byMezzo.get(c.mezzoId) ?? [];
    list.push(c.dataCompletamento);
    byMezzo.set(c.mezzoId, list);
  }
  const windowMs = KPI_RECIDIVA_WINDOW_DAYS * 86400000;
  for (const [mezzoId, dates] of byMezzo) {
    const sorted = dates.map((d) => new Date(d).getTime()).sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]! - sorted[i - 1]! <= windowMs) {
        recidivaMezzi.add(mezzoId);
        break;
      }
    }
  }
  if (recidivaMezzi.size > 0) {
    alerts.push({
      id: "recidiva",
      severity: "warning",
      title: `${recidivaMezzi.size} mezzi con chiusure ravvicinate`,
      detail: `Almeno due chiusure entro ${KPI_RECIDIVA_WINDOW_DAYS} giorni sullo stesso mezzo.`,
    });
  }

  const alta = mezziConFrequenzaGuastiAlta(input.mezzi, input.lavRows);
  if (alta.length > 0) {
    alerts.push({
      id: "guasti-alta",
      severity: "warning",
      title: `${alta.length} mezzi con frequenza guasti elevata (euristica)`,
      detail: alta.map((x) => x.label).slice(0, 5).join(", ") + (alta.length > 5 ? "…" : ""),
    });
  }

  return alerts;
}

export { buildRicambiConsumoRanking, monthKeysOverlappingRange };
