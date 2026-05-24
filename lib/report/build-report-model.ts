import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  compareRangeFor,
  deltaPct,
  isoInRange,
  resolvePresetRange,
  type DateRange,
  type ReportCompareMode,
  type ReportPeriodPreset,
} from "@/lib/report/date-ranges";
import {
  avgCloseDays,
  countCompletedInRange,
  countOpenedInRange,
  sparkFromDailyCompletions,
  uniqueClientiServiti,
  type ReportManualByMonth,
} from "@/lib/report/lavorazioni-report-selectors";
import { extractScortaDelta } from "@/lib/report/magazzino-log-parse";
import { buildMagazzinoMonthlyRows } from "@/lib/report/magazzino-monthly-rows";
import { loadMagazzinoManualMonthMap } from "@/lib/report/magazzino-manual-storage";

export type ReportLiveInput = {
  anchor: Date;
  preset: ReportPeriodPreset;
  customFrom?: string;
  customTo?: string;
  compareMode?: ReportCompareMode;
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  completate: LavorazioneArchiviata[];
  manualByMonth?: ReportManualByMonth;
  magazzino: RicambioMagazzino[];
  mezzi: MezzoGestito[];
  magLog: MagazzinoChangeLogEntry[];
};

export type KpiCompareRow = {
  label: string;
  deltaAbs: string | null;
  deltaPct: number | null;
  invert?: boolean;
};

export type KpiCardModel = {
  id: string;
  label: string;
  value: string;
  sub?: string;
  compareRows: KpiCompareRow[] | null;
  spark: number[];
};

export type ReportCompareDetail = {
  openedCur: number;
  openedPrev: number;
  completedCur: number;
  completedPrev: number;
  magDeltaCapCur: number;
  magDeltaCapPrev: number;
};

export type ReportModel = {
  range: DateRange;
  compareRange: DateRange | null;
  compareMode: ReportCompareMode;
  kpis: KpiCardModel[];
  compareDetail: ReportCompareDetail | null;
};

function ricambiUtilizzatiQty(magLog: MagazzinoChangeLogEntry[], r: DateRange): number {
  let q = 0;
  for (const e of magLog) {
    if (!isoInRange(e.at, r)) continue;
    const d = extractScortaDelta(e);
    if (d != null && d < 0) q += -d;
  }
  return Math.round(q * 10) / 10;
}

function totalCapitale(rows: RicambioMagazzino[]): number {
  let s = 0;
  for (const r of rows) s += capitaleImmobilizzato(r);
  return Math.round(s * 100) / 100;
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function sumMagazzinoPeriod(
  magLog: MagazzinoChangeLogEntry[],
  prodotti: RicambioMagazzino[],
  r: DateRange,
  anchor: Date,
): { deltaCapitale: number; entrate: number; uscite: number } {
  const manual = loadMagazzinoManualMonthMap();
  const { rows } = buildMagazzinoMonthlyRows(magLog, prodotti, r, anchor, manual);
  return rows.reduce(
    (acc, row) => ({
      deltaCapitale: acc.deltaCapitale + row.deltaCapitale,
      entrate: acc.entrate + row.entrate,
      uscite: acc.uscite + row.uscite,
    }),
    { deltaCapitale: 0, entrate: 0, uscite: 0 },
  );
}

function fmtSignedInt(n: number): string {
  const s = n > 0 ? "+" : "";
  return `${s}${n}`;
}

function fmtSignedEur(n: number): string {
  const s = n > 0 ? "+" : "";
  return `${s}${n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}`;
}

export function buildReportModel(input: ReportLiveInput): ReportModel {
  const compareMode = input.compareMode ?? "none";
  const range = resolvePresetRange(input.anchor, input.preset, input.customFrom, input.customTo);
  const compareRange = compareMode === "none" ? null : compareRangeFor(range, compareMode);
  const { attive, storico, completate, manualByMonth, magazzino, mezzi, magLog, anchor } = input;

  const opened = countOpenedInRange(attive, storico, range);
  const completed = countCompletedInRange(completate, range, manualByMonth);
  const tempoMedio = avgCloseDays(completate, range);
  const cap = totalCapitale(magazzino);
  const ricambi = ricambiUtilizzatiQty(magLog, range);
  const clienti = uniqueClientiServiti(completate, range);
  const mezziN = mezzi.length;

  const magCur = sumMagazzinoPeriod(magLog, magazzino, range, anchor);
  const magPrev = compareRange ? sumMagazzinoPeriod(magLog, magazzino, compareRange, anchor) : null;

  const openedP = compareRange ? countOpenedInRange(attive, storico, compareRange) : null;
  const completedP = compareRange ? countCompletedInRange(completate, compareRange, manualByMonth) : null;
  const tempoP = compareRange ? avgCloseDays(completate, compareRange) : null;
  const ricambiP = compareRange ? ricambiUtilizzatiQty(magLog, compareRange) : null;
  const clientiP = compareRange ? uniqueClientiServiti(completate, compareRange) : null;

  const spark = sparkFromDailyCompletions(completate, range.end);

  const dOpened =
    compareRange && openedP != null
      ? { abs: fmtSignedInt(opened - openedP), pct: deltaPct(opened, openedP) }
      : { abs: null, pct: null as number | null };
  const dCompleted =
    compareRange && completedP != null
      ? { abs: fmtSignedInt(completed - completedP), pct: deltaPct(completed, completedP) }
      : { abs: null, pct: null };
  const dTempo =
    compareRange && tempoP != null
      ? {
          abs: `${tempoMedio - tempoP >= 0 ? "+" : ""}${Math.round((tempoMedio - tempoP) * 10) / 10} gg`,
          pct: deltaPct(tempoMedio, tempoP),
        }
      : { abs: null, pct: null };
  const dRicambi =
    compareRange && ricambiP != null
      ? { abs: `${ricambi - ricambiP > 0 ? "+" : ""}${Math.round((ricambi - ricambiP) * 10) / 10}`, pct: deltaPct(ricambi, ricambiP) }
      : { abs: null, pct: null };
  const dClienti =
    compareRange && clientiP != null
      ? { abs: fmtSignedInt(clienti - clientiP), pct: deltaPct(clienti, clientiP) }
      : { abs: null, pct: null };
  const dDeltaCap =
    magPrev != null
      ? {
          abs: fmtSignedEur(magCur.deltaCapitale - magPrev.deltaCapitale),
          pct: deltaPct(magCur.deltaCapitale, magPrev.deltaCapitale),
        }
      : { abs: null, pct: null };

  const pctChiusSuIngressi = opened > 0 ? Math.round((completed / opened) * 1000) / 10 : null;
  const lavSubParts = [
    `Archiviate ${completed}${pctChiusSuIngressi != null ? ` (${pctChiusSuIngressi}% degli ingressi)` : ""}`,
    tempoMedio > 0 ? `Tempo medio archivio ${tempoMedio} gg` : "Tempo medio archivio —",
  ];
  const lavCompareRows: KpiCompareRow[] | null = compareRange
    ? [
        { label: "Ingressi", deltaAbs: dOpened.abs, deltaPct: dOpened.pct },
        { label: "Archiviate", deltaAbs: dCompleted.abs, deltaPct: dCompleted.pct },
        { label: "Tempo medio", deltaAbs: dTempo.abs, deltaPct: dTempo.pct, invert: true },
      ]
    : null;

  const kpis: KpiCardModel[] = [
    {
      id: "lav-periodo",
      label: "Lavorazioni periodo",
      value: String(opened),
      sub: `Ingressi registrati nel filtro · ${lavSubParts.join(" · ")}`,
      compareRows: lavCompareRows,
      spark,
    },
    {
      id: "cap",
      label: "Capitale immobilizzato",
      value: fmtEur(cap),
      sub: "Snapshot magazzino · il confronto è sulla somma dei Δ capitale nel periodo",
      compareRows:
        compareRange != null
          ? [{ label: "Σ Δ capitale nel periodo", deltaAbs: dDeltaCap.abs, deltaPct: dDeltaCap.pct }]
          : null,
      spark,
    },
    {
      id: "ric-usati",
      label: "Ricambi movimentati",
      value: String(ricambi),
      sub: "Somma uscite (Δ scorta) nel periodo dai log",
      compareRows:
        compareRange != null
          ? [{ label: "Uscite nel periodo", deltaAbs: dRicambi.abs, deltaPct: dRicambi.pct }]
          : null,
      spark,
    },
    {
      id: "clienti",
      label: "Clienti attivi",
      value: String(clienti),
      sub: "Clienti con almeno un contatto nel periodo (ingresso o chiusura)",
      compareRows:
        compareRange != null
          ? [{ label: "Clienti nel periodo", deltaAbs: dClienti.abs, deltaPct: dClienti.pct }]
          : null,
      spark,
    },
    {
      id: "mezzi",
      label: "Mezzi in anagrafica",
      value: String(mezziN),
      sub: "Totale flotta (non legato al periodo)",
      compareRows: null,
      spark,
    },
  ];

  const compareDetail = compareRange
    ? {
        openedCur: opened,
        openedPrev: openedP!,
        completedCur: completed,
        completedPrev: completedP!,
        magDeltaCapCur: magCur.deltaCapitale,
        magDeltaCapPrev: magPrev!.deltaCapitale,
      }
    : null;

  return { range, compareRange, compareMode, kpis, compareDetail };
}
