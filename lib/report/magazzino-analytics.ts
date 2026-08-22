import { prezzoNettoFornitoreOriginale } from "@/lib/magazzino/calculations";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import {
  buildRicambiConsumoRanking,
  usciteQtyFromMagazzinoEntry,
} from "@/lib/magazzino/ricambio-consumo-from-log";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";
import type { DateRange } from "@/lib/report/date-ranges";
import { isoInRange } from "@/lib/report/date-ranges";
import {
  aggregateMagazzinoQtyByProductInRange,
  sumMagazzinoEntrateQtyInRange,
  sumMagazzinoUsciteQtyInRange,
} from "@/lib/report/magazzino-period-aggregate";
import { buildGiorniCoperturaRicambi, countSottoScortaDettaglio } from "@/lib/report/magazzino-coverage";
import { buildTopRicambiPeriodo } from "@/lib/report/report-classifiche";

export const MAG_DEAD_STOCK_DAYS = 90;
export const MAG_COVERAGE_CRITICAL_DAYS = 7;
export const MAG_PARTS_SPIKE_RATIO = 1.5;

export type MagazzinoStockRiskRow = {
  id: string;
  codice: string;
  marca: string;
  nome: string;
  qty: number;
  scortaMin: number;
  delta: number;
  giorniCopertura: number | null;
  valoreRischio: number;
  unitaMisura: string;
};

export type MagazzinoUnifiedRankingRow = {
  id: string;
  rank: number;
  codice: string;
  marca: string;
  nome: string;
  qtaEntrata: number;
  qtaUscita: number;
  consumoMedio: number | null;
  giorniCopertura: number | null;
  valoreUscite: number;
};

export type MagazzinoCategoryStockSlice = {
  categoria: string;
  valore: number;
  pct: number;
};

export type MagazzinoParetoRow = {
  codice: string;
  nome: string;
  uscite: number;
  cumPct: number;
};

export type MagazzinoRischioMatrixRow = {
  categoria: string;
  ok: number;
  sottoMin: number;
  coperturaBassa: number;
  deadStock: number;
  totale: number;
};

export type MagazzinoOrdineReportRow = {
  id: string;
  numero: string;
  fornitore: string;
  dataOrdine: string;
  status: string;
  totale: number;
  giorniAperti: number;
};

/** ponytail: Σ (scortaMin - scorta) × prezzo netto per articoli sotto minimo. */
export function sumValoreStockARischio(magazzino: readonly RicambioMagazzino[]): number {
  let total = 0;
  for (const p of magazzino) {
    if (p.scortaMinima <= 0 || p.scorta >= p.scortaMinima) continue;
    const delta = p.scortaMinima - p.scorta;
    total += delta * prezzoNettoFornitoreOriginale(p);
  }
  return Math.round(total * 100) / 100;
}

export function buildMagazzinoStockRiskRows(
  magazzino: readonly RicambioMagazzino[],
  magLog: readonly MagazzinoChangeLogEntry[],
  range: DateRange,
): MagazzinoStockRiskRow[] {
  const coperturaById = new Map(
    buildGiorniCoperturaRicambi(magazzino, magLog, range, 500).map((r) => [r.id, r.giorniCopertura]),
  );

  return countSottoScortaDettaglio(magazzino).map((r) => {
    const p = magazzino.find((x) => x.id === r.id);
    const scortaMin = p?.scortaMinima ?? 0;
    const delta = Math.max(0, scortaMin - r.qty);
    return {
      id: r.id,
      codice: r.codice,
      marca: p?.marca ?? "—",
      nome: r.nome,
      qty: r.qty,
      scortaMin,
      delta,
      giorniCopertura: coperturaById.get(r.id) ?? null,
      valoreRischio: Math.round(delta * prezzoNettoFornitoreOriginale(p!) * 100) / 100,
      unitaMisura: p?.unitaMisura ?? "pz",
    };
  });
}

export function buildMagazzinoCoperturaBassaRows(
  magazzino: readonly RicambioMagazzino[],
  magLog: readonly MagazzinoChangeLogEntry[],
  range: DateRange,
  maxDays = 14,
  limit = 12,
): MagazzinoStockRiskRow[] {
  const sottoIds = new Set(countSottoScortaDettaglio(magazzino).map((r) => r.id));

  return buildGiorniCoperturaRicambi(magazzino, magLog, range, 500)
    .filter((r) => r.giorniCopertura != null && r.giorniCopertura < maxDays && !sottoIds.has(r.id))
    .sort((a, b) => (a.giorniCopertura ?? 999) - (b.giorniCopertura ?? 999))
    .slice(0, limit)
    .map((r) => {
      const p = magazzino.find((x) => x.id === r.id);
      const scortaMin = p?.scortaMinima ?? 0;
      return {
        id: r.id,
        codice: r.codice,
        marca: p?.marca ?? "—",
        nome: r.nome,
        qty: r.qty,
        scortaMin,
        delta: Math.max(0, scortaMin - r.qty),
        giorniCopertura: r.giorniCopertura,
        valoreRischio: 0,
        unitaMisura: p?.unitaMisura ?? "pz",
      };
    });
}

export function computeAvgGiorniCopertura(
  magazzino: readonly RicambioMagazzino[],
  magLog: readonly MagazzinoChangeLogEntry[],
  range: DateRange,
): number | null {
  const rows = buildGiorniCoperturaRicambi(magazzino, magLog, range, 500).filter(
    (r) => r.giorniCopertura != null && r.uscitePeriodo > 0,
  );
  if (rows.length === 0) return null;
  const sum = rows.reduce((s, r) => s + (r.giorniCopertura ?? 0), 0);
  return Math.round((sum / rows.length) * 10) / 10;
}

function productIdsWithExitsInRange(
  magLog: readonly MagazzinoChangeLogEntry[],
  range: DateRange,
): Set<string> {
  const ids = new Set<string>();
  for (const e of magLog) {
    if (!isoInRange(e.at, range)) continue;
    if (usciteQtyFromMagazzinoEntry(e) > 0) ids.add(e.ricambioId);
  }
  return ids;
}

/** ponytail: qty>0 e zero uscite negli ultimi N giorni dal anchor. */
export function countDeadStock(
  magazzino: readonly RicambioMagazzino[],
  magLog: readonly MagazzinoChangeLogEntry[],
  anchor: Date,
  days = MAG_DEAD_STOCK_DAYS,
): number {
  const start = new Date(anchor);
  start.setDate(start.getDate() - days);
  const range: DateRange = { start, end: anchor };
  const withExits = productIdsWithExitsInRange(magLog, range);
  let n = 0;
  for (const p of magazzino) {
    if (p.scorta <= 0) continue;
    if (!withExits.has(p.id)) n += 1;
  }
  return n;
}

export function computeRotazioneStock(
  magazzino: readonly RicambioMagazzino[],
  magLog: readonly MagazzinoChangeLogEntry[],
  range: DateRange,
): number | null {
  const uscite = sumMagazzinoUsciteQtyInRange(magLog, range);
  let stock = 0;
  for (const p of magazzino) stock += p.scorta;
  if (stock <= 0) return null;
  return Math.round((uscite / stock) * 100) / 100;
}

export function buildStockValueByCategory(magazzino: readonly RicambioMagazzino[]): MagazzinoCategoryStockSlice[] {
  const byCat = new Map<string, number>();
  let total = 0;
  for (const p of magazzino) {
    const cat = p.categoria?.trim() || "Senza categoria";
    const v = p.prezzoFornitoreOriginale * p.scorta;
    byCat.set(cat, (byCat.get(cat) ?? 0) + v);
    total += v;
  }
  if (total <= 0) return [];
  return [...byCat.entries()]
    .map(([categoria, valore]) => ({
      categoria,
      valore: Math.round(valore * 100) / 100,
      pct: Math.round((valore / total) * 1000) / 10,
    }))
    .sort((a, b) => b.valore - a.valore);
}

export function buildParetoConsumi(
  magLog: readonly MagazzinoChangeLogEntry[],
  prodotti: readonly RicambioMagazzino[],
  range: DateRange,
  limit = 20,
): MagazzinoParetoRow[] {
  const ranking = buildRicambiConsumoRanking(magLog, prodotti, range, { limit: 200 });
  const total = ranking.reduce((s, r) => s + r.totalUscite, 0);
  if (total <= 0) return [];
  let cum = 0;
  return ranking.slice(0, limit).map((r) => {
    cum += r.totalUscite;
    return {
      codice: r.codice,
      nome: r.nome,
      uscite: r.totalUscite,
      cumPct: Math.round((cum / total) * 1000) / 10,
    };
  });
}

type RiskState = "ok" | "sottoMin" | "coperturaBassa" | "deadStock";

function riskStateForProduct(
  p: RicambioMagazzino,
  giorniCopertura: number | null,
  deadIds: Set<string>,
): RiskState {
  if (deadIds.has(p.id)) return "deadStock";
  if (p.scortaMinima > 0 && p.scorta < p.scortaMinima) return "sottoMin";
  if (giorniCopertura != null && giorniCopertura < 14) return "coperturaBassa";
  return "ok";
}

export function buildRischioCategoriaMatrix(
  magazzino: readonly RicambioMagazzino[],
  magLog: readonly MagazzinoChangeLogEntry[],
  range: DateRange,
  anchor: Date,
): MagazzinoRischioMatrixRow[] {
  const copertura = new Map(
    buildGiorniCoperturaRicambi(magazzino, magLog, range, 500).map((r) => [r.id, r.giorniCopertura]),
  );
  const deadStart = new Date(anchor);
  deadStart.setDate(deadStart.getDate() - MAG_DEAD_STOCK_DAYS);
  const deadIds = new Set<string>();
  const withExits = productIdsWithExitsInRange(magLog, { start: deadStart, end: anchor });
  for (const p of magazzino) {
    if (p.scorta > 0 && !withExits.has(p.id)) deadIds.add(p.id);
  }

  const byCat = new Map<string, MagazzinoRischioMatrixRow>();
  for (const p of magazzino) {
    const cat = p.categoria?.trim() || "Senza categoria";
    const row = byCat.get(cat) ?? {
      categoria: cat,
      ok: 0,
      sottoMin: 0,
      coperturaBassa: 0,
      deadStock: 0,
      totale: 0,
    };
    const state = riskStateForProduct(p, copertura.get(p.id) ?? null, deadIds);
    row[state] += 1;
    row.totale += 1;
    byCat.set(cat, row);
  }
  return [...byCat.values()].sort((a, b) => b.totale - a.totale);
}

export function buildUnifiedRicambiRanking(
  magLog: readonly MagazzinoChangeLogEntry[],
  prodotti: readonly RicambioMagazzino[],
  range: DateRange,
  anchor: Date,
  limit = 200,
): MagazzinoUnifiedRankingRow[] {
  const tops = buildTopRicambiPeriodo(magLog, [...prodotti], range);
  const consumo = buildRicambiConsumoRanking(magLog, prodotti, range, { limit });
  const copertura = new Map(
    buildGiorniCoperturaRicambi(prodotti, magLog, range, 500).map((r) => [r.id, r.giorniCopertura]),
  );
  const consumoById = new Map(consumo.map((r) => [r.id, r]));
  const prodById = new Map(prodotti.map((p) => [p.id, p]));

  const merged = new Map<string, MagazzinoUnifiedRankingRow>();
  for (const t of tops) {
    const p = prodById.get(t.id);
    const c = consumoById.get(t.id);
    const netto = p ? prezzoNettoFornitoreOriginale(p) : 0;
    merged.set(t.id, {
      id: t.id,
      rank: t.rank,
      codice: t.codice,
      marca: t.marca,
      nome: t.nome,
      qtaEntrata: t.qtaEntrata,
      qtaUscita: t.qtaUscita,
      consumoMedio: c?.avgMonthly ?? null,
      giorniCopertura: copertura.get(t.id) ?? null,
      valoreUscite: Math.round(t.qtaUscita * netto * 100) / 100,
    });
  }
  for (const c of consumo) {
    if (merged.has(c.id)) continue;
    const p = prodById.get(c.id);
    const netto = p ? prezzoNettoFornitoreOriginale(p) : 0;
    merged.set(c.id, {
      id: c.id,
      rank: c.rank,
      codice: c.codice,
      marca: c.marca,
      nome: c.nome,
      qtaEntrata: 0,
      qtaUscita: c.totalUscite,
      consumoMedio: c.avgMonthly,
      giorniCopertura: copertura.get(c.id) ?? null,
      valoreUscite: Math.round(c.totalUscite * netto * 100) / 100,
    });
  }

  return [...merged.values()]
    .sort((a, b) => b.qtaUscita + b.qtaEntrata - (a.qtaUscita + a.qtaEntrata))
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export function buildOrdiniFornitoriReportRows(
  ordini: readonly OrdineFornitoreRecord[],
  range: DateRange,
  anchor: Date,
  openOnly = false,
): MagazzinoOrdineReportRow[] {
  const today = anchor.toISOString().slice(0, 10);
  const rows: MagazzinoOrdineReportRow[] = [];
  for (const o of ordini) {
    if (o.status === "annullato") continue;
    if (!isoInRange(o.dataOrdine, range) && openOnly) continue;
    const isOpen = o.status !== "consegnato";
    if (openOnly && !isOpen) continue;
    if (!openOnly && !isoInRange(o.dataOrdine, range)) continue;
    const giorniAperti = Math.max(
      0,
      Math.floor((new Date(today).getTime() - new Date(o.dataOrdine).getTime()) / 86400000),
    );
    rows.push({
      id: o.id,
      numero: o.numero,
      fornitore: o.fornitoreLabel,
      dataOrdine: o.dataOrdine,
      status: o.status,
      totale: o.totale,
      giorniAperti,
    });
  }
  return rows.sort((a, b) => b.dataOrdine.localeCompare(a.dataOrdine));
}

export function countCoperturaCritica(
  magazzino: readonly RicambioMagazzino[],
  magLog: readonly MagazzinoChangeLogEntry[],
  range: DateRange,
): number {
  return buildGiorniCoperturaRicambi(magazzino, magLog, range, 500).filter(
    (r) => r.giorniCopertura != null && r.giorniCopertura < MAG_COVERAGE_CRITICAL_DAYS,
  ).length;
}

/** Uscite mese corrente vs media ultimi 6 mesi (escluso corrente). */
export function detectMagazzinoConsumoSpike(
  magLog: readonly MagazzinoChangeLogEntry[],
  anchor: Date,
): { current: number; avgPrev: number } | null {
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const curStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const curRange: DateRange = { start: curStart, end };
  const current = sumMagazzinoUsciteQtyInRange(magLog, curRange);

  const prevTotals: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const m = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    prevTotals.push(sumMagazzinoUsciteQtyInRange(magLog, { start: m, end: mEnd }));
  }
  const avgPrev = prevTotals.reduce((s, v) => s + v, 0) / prevTotals.length;
  if (avgPrev <= 0) return null;
  return { current, avgPrev };
}

export function sumMagazzinoEntrateForCompare(
  magLog: readonly MagazzinoChangeLogEntry[],
  range: DateRange,
): number {
  return sumMagazzinoEntrateQtyInRange(magLog, range);
}
