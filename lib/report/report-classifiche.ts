import type { LavorazioneArchiviata } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import { deltaPct, isoInRange, type DateRange } from "@/lib/report/date-ranges";
import { aggregateMagazzinoQtyByProductInRange } from "@/lib/report/magazzino-period-aggregate";

export type ReportRowCompare = {
  prior: number;
  deltaAbs: number;
  deltaPct: number | null;
};

export type TopRicambioReportRow = {
  rank: number;
  id: string;
  codice: string;
  nome: string;
  marca: string;
  qtaEntrata: number;
  qtaUscita: number;
  compare?: ReportRowCompare;
};

export type TopMezzoReportRow = {
  rank: number;
  id: string;
  mezzo: string;
  targa: string;
  matricola: string;
  nScuderia: string;
  cliente: string;
  interventi: number;
  compare?: ReportRowCompare;
};

/** Valore tabella classifiche: vuoto / placeholder → trattino. */
export function reportClassificaFieldLabel(value: string | undefined | null): string {
  const t = (value ?? "").trim();
  if (!t || t === "—" || t === "Non assegnata") return "—";
  return t;
}

export function formatTopMezzoIdentificazione(row: Pick<TopMezzoReportRow, "targa" | "matricola" | "nScuderia">): string {
  const parts: string[] = [];
  const targa = reportClassificaFieldLabel(row.targa);
  const matricola = reportClassificaFieldLabel(row.matricola);
  const scuderia = reportClassificaFieldLabel(row.nScuderia);
  if (targa !== "—") parts.push(targa);
  if (matricola !== "—") parts.push(matricola);
  if (scuderia !== "—") parts.push(`sc. ${scuderia}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export type TopClienteReportRow = {
  rank: number;
  cliente: string;
  interventi: number;
  ultimoIso: string | null;
  compare?: ReportRowCompare;
};

export function mergeTopRicambiCompare(cur: TopRicambioReportRow[], prev: TopRicambioReportRow[]): TopRicambioReportRow[] {
  const pmap = new Map(prev.map((r) => [r.id, r.qtaUscita]));
  return cur.map((r) => {
    const pv = pmap.get(r.id) ?? 0;
    return {
      ...r,
      compare: { prior: pv, deltaAbs: Math.round((r.qtaUscita - pv) * 100) / 100, deltaPct: deltaPct(r.qtaUscita, pv) },
    };
  });
}

export function mergeTopMezziCompare(cur: TopMezzoReportRow[], prev: TopMezzoReportRow[]): TopMezzoReportRow[] {
  const pmap = new Map(prev.map((r) => [r.id, r.interventi]));
  return cur.map((r) => {
    const pv = pmap.get(r.id) ?? 0;
    return {
      ...r,
      compare: { prior: pv, deltaAbs: r.interventi - pv, deltaPct: deltaPct(r.interventi, pv) },
    };
  });
}

export function mergeTopClientiCompare(cur: TopClienteReportRow[], prev: TopClienteReportRow[]): TopClienteReportRow[] {
  const pmap = new Map(prev.map((r) => [r.cliente, r.interventi]));
  return cur.map((r) => {
    const pv = pmap.get(r.cliente) ?? 0;
    return {
      ...r,
      compare: { prior: pv, deltaAbs: r.interventi - pv, deltaPct: deltaPct(r.interventi, pv) },
    };
  });
}

export function buildTopRicambiPeriodo(
  magLog: MagazzinoChangeLogEntry[],
  prodotti: RicambioMagazzino[],
  range: DateRange,
): TopRicambioReportRow[] {
  const byId = aggregateMagazzinoQtyByProductInRange(magLog, range);

  const prod = new Map(prodotti.map((p) => [p.id, p]));
  const out: Array<Omit<TopRicambioReportRow, "rank">> = [];
  for (const [id, v] of byId) {
    const p = prod.get(id);
    if (!p) continue;
    if (v.entrate === 0 && v.uscite === 0) continue;
    out.push({
      id,
      codice: p.codiceFornitoreOriginale ?? "—",
      nome: p.descrizione ?? "—",
      marca: p.marca ?? "—",
      qtaEntrata: Math.round(v.entrate * 100) / 100,
      qtaUscita: Math.round(v.uscite * 100) / 100,
    });
  }
  out.sort((a, b) => b.qtaUscita + b.qtaEntrata - (a.qtaUscita + a.qtaEntrata));
  return out.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Completate archiviate con chiusura nel periodo (stessa regola KPI). */
export function buildTopMezziPeriodo(
  mezzi: MezzoGestito[],
  completate: LavorazioneArchiviata[],
  range: DateRange,
): TopMezzoReportRow[] {
  const mezziById = new Map(mezzi.map((m) => [m.id, m]));
  const interventiByMezzoId = new Map<string, number>();

  for (const lav of completate) {
    if (!lav.dataCompletamento || !isoInRange(lav.dataCompletamento, range)) continue;

    const mezzoId = lav.mezzoId?.trim();
    let mezzo = mezzoId ? mezziById.get(mezzoId) : undefined;
    if (!mezzo) {
      const matches = mezzi.filter((m) => lavorazioneMatchesMezzo(m, lav));
      if (matches.length === 1) {
        mezzo = matches[0];
      } else if (matches.length > 1) {
        mezzo = matches.find((m) => m.lavorazioneMezzoId === lav.id) ?? matches[0];
      }
    }
    if (!mezzo) continue;

    interventiByMezzoId.set(mezzo.id, (interventiByMezzoId.get(mezzo.id) ?? 0) + 1);
  }

  const rows: Array<Omit<TopMezzoReportRow, "rank">> = [...interventiByMezzoId.entries()].map(([id, interventi]) => {
    const m = mezziById.get(id)!;
    return {
      id,
      mezzo: `${m.marca} ${m.modello}`.trim() || "—",
      targa: reportClassificaFieldLabel(m.targa),
      matricola: reportClassificaFieldLabel(m.matricola),
      nScuderia: reportClassificaFieldLabel(m.numeroScuderia),
      cliente: reportClassificaFieldLabel(m.cliente) === "—" ? "—" : m.cliente.trim(),
      interventi,
    };
  });
  rows.sort((a, b) => b.interventi - a.interventi);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Completate archiviate con chiusura nel periodo (stessa regola KPI). */
export function buildTopClientiPeriodo(
  completate: LavorazioneArchiviata[],
  range: DateRange,
): TopClienteReportRow[] {
  const map = new Map<string, { count: number; lastMs: number }>();

  for (const x of completate) {
    if (!x.dataCompletamento || !isoInRange(x.dataCompletamento, range)) continue;
    const c = x.cliente.trim();
    if (!c) continue;
    const lastMs = new Date(x.dataCompletamento).getTime();
    const cur = map.get(c) ?? { count: 0, lastMs: 0 };
    cur.count += 1;
    if (Number.isFinite(lastMs) && lastMs > cur.lastMs) cur.lastMs = lastMs;
    map.set(c, cur);
  }

  const rows: Array<Omit<TopClienteReportRow, "rank">> = [...map.entries()].map(([cliente, v]) => ({
    cliente,
    interventi: v.count,
    ultimoIso: v.lastMs > 0 ? new Date(v.lastMs).toISOString() : null,
  }));
  rows.sort((a, b) => b.interventi - a.interventi);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
