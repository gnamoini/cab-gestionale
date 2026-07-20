import type { DateRange } from "@/lib/report/date-ranges";
import { monthKeysOverlappingRange } from "@/lib/report/lavorazioni-report-selectors";
import type { ClienteDisponibilitaRow } from "@/lib/report/kpi-performance/kpi-performance-formulas";
import type { KpiPerformanceMonthPoint } from "@/lib/report/kpi-performance/kpi-performance-types";
import type { TopClienteReportRow } from "@/lib/report/report-classifiche";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

export const FLEET_DISP_SOGLIA_PCT = 75;
export const FLEET_DISP_GLOBAL_SOGLIA_PCT = 80;
export const TOP_CLIENTE_CONCENTRAZIONE_PCT = 30;

export function computeFleetDisponibilitaPct(totalMezzi: number, mezziInOfficina: number): number | null {
  if (totalMezzi <= 0) return null;
  return Math.round(((totalMezzi - mezziInOfficina) / totalMezzi) * 1000) / 10;
}

export type ParetoClientePoint = {
  cliente: string;
  interventi: number;
  pct: number;
  cumulPct: number;
};

/** Pareto clienti per interventi nel periodo (top N). */
export function buildParetoClientiPoints(rows: readonly TopClienteReportRow[], limit = 12): ParetoClientePoint[] {
  const slice = rows.slice(0, limit);
  const total = slice.reduce((s, r) => s + r.interventi, 0);
  if (total <= 0) return [];
  let cumul = 0;
  return slice.map((r) => {
    const pct = Math.round((r.interventi / total) * 1000) / 10;
    cumul += pct;
    return { cliente: r.cliente, interventi: r.interventi, pct, cumulPct: Math.min(100, Math.round(cumul * 10) / 10) };
  });
}

export type DisponibilitaFasciaRow = {
  fascia: string;
  count: number;
};

/** Matrice clienti × fascia disponibilità (%). */
export function buildDisponibilitaFasciaMatrix(
  rows: readonly ClienteDisponibilitaRow[],
): DisponibilitaFasciaRow[] {
  const fascie = [
    { label: "<50%", min: 0, max: 50 },
    { label: "50–74%", min: 50, max: 75 },
    { label: "75–89%", min: 75, max: 90 },
    { label: "≥90%", min: 90, max: 101 },
  ];
  const counts = fascie.map((f) => ({ fascia: f.label, count: 0 }));
  for (const row of rows) {
    if (row.disponibilitaPct == null) continue;
    const pct = row.disponibilitaPct;
    const idx = fascie.findIndex((f) => pct >= f.min && pct < f.max);
    if (idx >= 0) counts[idx]!.count += 1;
  }
  return counts;
}

/**
 * ponytail: proxy trend — % mezzi senza lav aperta a fine settimana nel periodo.
 * Upgrade path: snapshot giornaliero da background job.
 */
export function buildFleetDisponibilitaTrendProxy(
  mezzi: readonly MezzoGestito[],
  lavRows: readonly LavorazioneListRow[],
  range: DateRange,
): KpiPerformanceMonthPoint[] {
  if (mezzi.length === 0) return [];
  const mezzoIds = new Set(mezzi.map((m) => m.id));
  const openByMezzo = new Map<string, { ingresso: string; uscita: string | null }[]>();

  for (const lav of lavRows) {
    if (!lav.mezzo_id || !mezzoIds.has(lav.mezzo_id)) continue;
    const ingresso = lav.data_ingresso?.trim();
    if (!ingresso) continue;
    const list = openByMezzo.get(lav.mezzo_id) ?? [];
    list.push({ ingresso, uscita: lav.data_uscita?.trim() || lav.archived_at?.trim() || null });
    openByMezzo.set(lav.mezzo_id, list);
  }

  return monthKeysOverlappingRange(range).map((monthKey) => {
    const endOfMonth = `${monthKey}-28T23:59:59`;
    let operativi = 0;
    for (const m of mezzi) {
      const interventi = openByMezzo.get(m.id) ?? [];
      const inOfficina = interventi.some((i) => {
        if (i.ingresso > endOfMonth) return false;
        if (!i.uscita) return true;
        return i.uscita > endOfMonth;
      });
      if (!inOfficina) operativi += 1;
    }
    const pct = Math.round((operativi / mezzi.length) * 1000) / 10;
    const [y, mo] = monthKey.split("-").map(Number);
    const label = new Date(y!, mo! - 1, 1).toLocaleDateString("it-IT", { month: "short" });
    return { monthKey, label, value: pct };
  });
}

export function topClienteConcentrazionePct(rows: readonly TopClienteReportRow[]): {
  cliente: string;
  pct: number;
} | null {
  const total = rows.reduce((s, r) => s + r.interventi, 0);
  if (total <= 0 || rows.length === 0) return null;
  const top = rows[0]!;
  const pct = Math.round((top.interventi / total) * 1000) / 10;
  return { cliente: top.cliente, pct };
}

export function clienteInterventiPct(interventi: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((interventi / total) * 1000) / 10;
}

export function filterDisponibilitaByCliente(
  rows: readonly ClienteDisponibilitaRow[],
  clienteQ: string,
): ClienteDisponibilitaRow[] {
  const q = clienteQ.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((r) => r.cliente.toLowerCase().includes(q));
}
