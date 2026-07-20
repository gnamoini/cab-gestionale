import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import { capitaleImmobilizzato } from "@/lib/magazzino/calculations";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  compareBaselineValue,
  resolveReportCompareRange,
  deltaPct,
  resolvePresetRange,
  type DateRange,
  type ReportCompareMode,
  type ReportPeriodPreset,
} from "@/lib/report/date-ranges";
import {
  countOpenedInRange,
  uniqueClientiNelPeriodo,
  type ReportManualByMonth,
} from "@/lib/report/lavorazioni-report-selectors";
import { sumMagazzinoEntrateQtyInRange, sumMagazzinoUsciteQtyInRange } from "@/lib/report/magazzino-period-aggregate";
import type { ReportDerivedBundle } from "@/lib/report/report-derived-cache";
import { getMagPeriodAgg } from "@/lib/report/report-derived-cache";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";

/** Input KPI report — dati devono provenire da `ReportDataIntegrityLayer.buildValidatedDataset`. */
export type ReportLiveInput = {
  anchor: Date;
  preset: ReportPeriodPreset;
  customFrom?: string;
  customTo?: string;
  compareMode?: ReportCompareMode;
  compareCustomFrom?: string;
  compareCustomTo?: string;
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
  completate: LavorazioneArchiviata[];
  manualByMonth?: ReportManualByMonth;
  magazzino: RicambioMagazzino[];
  mezzi: MezzoGestito[];
  magLog: MagazzinoChangeLogEntry[];
  semanticIndex: ReportSemanticIndex;
  derivedBundle: ReportDerivedBundle;
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
  /** Spark 7gg lavorazioni (solo card lav-periodo). */
  spark?: number[];
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

function totalCapitale(rows: RicambioMagazzino[]): number {
  let s = 0;
  for (const r of rows) s += capitaleImmobilizzato(r);
  return Math.round(s * 100) / 100;
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
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
  const compareRange = resolveReportCompareRange(
    range,
    compareMode,
    input.compareCustomFrom,
    input.compareCustomTo,
  );
  const { attive, storico, completate, magazzino, mezzi, anchor, semanticIndex, derivedBundle } = input;
  const magLogResolved = derivedBundle.magLogSorted;

  const opened = countOpenedInRange(attive, storico, range);
  const completed = semanticIndex.completateTotal(range);
  const tempoMedio = semanticIndex.tempoMedio(range);
  const cap = totalCapitale(magazzino);
  const ricambi = sumMagazzinoUsciteQtyInRange(magLogResolved, range);
  const entrate = sumMagazzinoEntrateQtyInRange(magLogResolved, range);
  const clienti = uniqueClientiNelPeriodo(attive, storico, completate, range);
  const mezziN = mezzi.length;

  const magCur = getMagPeriodAgg(derivedBundle, magazzino, range, anchor);
  const magPrev = compareRange ? getMagPeriodAgg(derivedBundle, magazzino, compareRange, anchor) : null;

  const openedPRaw = compareRange ? countOpenedInRange(attive, storico, compareRange) : null;
  const completedPRaw = compareRange ? semanticIndex.completateTotal(compareRange) : null;
  const tempoP = compareRange ? semanticIndex.tempoMedio(compareRange) : null;
  const ricambiPRaw = compareRange ? sumMagazzinoUsciteQtyInRange(magLogResolved, compareRange) : null;
  const entratePRaw = compareRange ? sumMagazzinoEntrateQtyInRange(magLogResolved, compareRange) : null;
  const clientiPRaw = compareRange ? uniqueClientiNelPeriodo(attive, storico, completate, compareRange) : null;

  const scale = (raw: number | null): number | null =>
    compareRange && raw != null ? compareBaselineValue(raw, compareRange, range, compareMode) : null;

  const openedP = scale(openedPRaw);
  const completedP = scale(completedPRaw);
  const ricambiP = scale(ricambiPRaw);
  const entrateP = scale(entratePRaw);
  const clientiP = scale(clientiPRaw);
  const magDeltaCapPrev =
    compareRange && magPrev != null
      ? compareBaselineValue(magPrev.deltaCapitale, compareRange, range, compareMode)
      : null;

  const spark = semanticIndex.sparkSeries(range.end);

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
  const dEntrate =
    compareRange && entrateP != null
      ? { abs: `${entrate - entrateP > 0 ? "+" : ""}${Math.round((entrate - entrateP) * 10) / 10}`, pct: deltaPct(entrate, entrateP) }
      : { abs: null, pct: null };
  const dClienti =
    compareRange && clientiP != null
      ? { abs: fmtSignedInt(clienti - clientiP), pct: deltaPct(clienti, clientiP) }
      : { abs: null, pct: null };
  const dDeltaCap =
    magDeltaCapPrev != null
      ? {
          abs: fmtSignedEur(magCur.deltaCapitale - magDeltaCapPrev),
          pct: deltaPct(magCur.deltaCapitale, magDeltaCapPrev),
        }
      : { abs: null, pct: null };

  const pctChiusSuIngressi = opened > 0 ? Math.round((completed / opened) * 1000) / 10 : null;
  const lavSubParts = [
    `Archiviate ${completed}${pctChiusSuIngressi != null ? ` (${pctChiusSuIngressi}% degli ingressi)` : ""}`,
    tempoMedio > 0 ? `Tempo medio archivio ${tempoMedio} gg` : "Tempo medio archivio —",
    "Mini-grafico 7gg: solo chiusure DB (senza override manuali)",
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
    },
    {
      id: "ric-usati",
      label: "Pezzi in uscita",
      value: String(ricambi),
      sub: "Somma uscite (Δ scorta) nel periodo dai log",
      compareRows:
        compareRange != null
          ? [{ label: "Uscite nel periodo", deltaAbs: dRicambi.abs, deltaPct: dRicambi.pct }]
          : null,
    },
    {
      id: "mag-entrate",
      label: "Pezzi in ingresso",
      value: String(entrate),
      sub: "Somma entrate nel periodo dai log",
      compareRows:
        compareRange != null
          ? [{ label: "Entrate nel periodo", deltaAbs: dEntrate.abs, deltaPct: dEntrate.pct }]
          : null,
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
    },
    {
      id: "mezzi",
      label: "Mezzi in anagrafica",
      value: String(mezziN),
      sub: "Totale flotta (non legato al periodo)",
      compareRows: null,
    },
  ];

  const compareDetail = compareRange
    ? {
        openedCur: opened,
        openedPrev: openedP!,
        completedCur: completed,
        completedPrev: completedP!,
        magDeltaCapCur: magCur.deltaCapitale,
        magDeltaCapPrev: magDeltaCapPrev!,
      }
    : null;

  return { range, compareRange, compareMode, kpis, compareDetail };
}
