import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { compareBaselineValue, deltaPct, type DateRange, type ReportCompareMode } from "@/lib/report/date-ranges";
import {
  avgDowntimeDaysInPeriod,
  buildAlerts,
  buildRicambiConsumoRanking,
  countClientiSottoSogliaDisponibilita,
  countInterventiAperti,
  countInterventiInRitardo,
  countMezziInOfficinaProxy,
  countMezziTotal,
  disponibilitaFlottaPctProxy,
  disponibilitaFlottaPerCliente,
  guastiByTipoAttrezzatura,
  heuristicFaultsByMonth,
  mezziConFrequenzaGuastiAlta,
  monthKeysOverlappingRange,
  peggiorDisponibilitaCliente,
  sottoScortaCount,
  sumManodoperaCostFromSchede,
  sumRicambiCostFromMagLog,
  topMezziByEstimatedCost,
} from "@/lib/report/kpi-performance/kpi-performance-formulas";
import { buildFleetDisponibilitaTrendProxy } from "@/lib/report/kpi-performance/fleet-report-helpers";
import type {
  KpiPerformanceExecutiveCard,
  KpiPerformanceModel,
  KpiPerformanceMonthPoint,
} from "@/lib/report/kpi-performance/kpi-performance-types";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";
import { KPI_TOP_N } from "@/lib/report/kpi-performance/kpi-performance-constants";
import {
  closeDaysPercentiles,
  closeDaysValuesInRange,
} from "@/lib/report/lavorazioni-report-selectors";

export type KpiPerformanceBuildInput = {
  anchor: Date;
  range: DateRange;
  compareRange: DateRange | null;
  compareMode?: ReportCompareMode;
  attive: LavorazioneAttiva[];
  completate: LavorazioneArchiviata[];
  mezzi: MezzoGestito[];
  magazzino: RicambioMagazzino[];
  magLog: MagazzinoChangeLogEntry[];
  magazzinoRows: MagazzinoRicambioRow[];
  lavRows: readonly LavorazioneListRow[];
  semanticIndex: ReportSemanticIndex;
  schedeStore: LavorazioneSchedeStore | null;
  schedeLoaded: boolean;
  costoOrario: number;
};

function fmtEur(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function monthLabel(mk: string): string {
  const [y, m] = mk.split("-");
  if (!y || !m) return mk;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
}

function mapMonthly(
  completateByMonth: Map<string, number>,
  range: DateRange,
): KpiPerformanceMonthPoint[] {
  return monthKeysOverlappingRange(range).map((monthKey) => ({
    monthKey,
    label: monthLabel(monthKey),
    value: completateByMonth.get(monthKey) ?? 0,
  }));
}

export function buildKpiPerformanceModel(input: KpiPerformanceBuildInput): KpiPerformanceModel {
  const {
    anchor,
    range,
    compareRange,
    compareMode = "none",
    attive,
    completate,
    mezzi,
    magazzino,
    magLog,
    magazzinoRows,
    lavRows,
    semanticIndex,
    schedeStore,
    schedeLoaded,
    costoOrario,
  } = input;

  const closedCur = semanticIndex.completateTotal(range);
  const closedPrevRaw = compareRange ? semanticIndex.completateTotal(compareRange) : null;
  const closedPrev =
    compareRange && closedPrevRaw != null
      ? compareBaselineValue(closedPrevRaw, compareRange, range, compareMode)
      : null;
  const openCur = countInterventiAperti(attive);

  const disponibilitaPerCliente = disponibilitaFlottaPerCliente(mezzi, lavRows);
  const peggiorDisponibilita = peggiorDisponibilitaCliente(disponibilitaPerCliente);

  const inOfficina = countMezziInOfficinaProxy(mezzi, lavRows);

  const ricambiCost = sumRicambiCostFromMagLog(magLog, magazzino, range);
  const ricambiCostPrevRaw = compareRange ? sumRicambiCostFromMagLog(magLog, magazzino, compareRange) : null;
  const ricambiCostPrev =
    compareRange && ricambiCostPrevRaw != null
      ? compareBaselineValue(ricambiCostPrevRaw, compareRange, range, compareMode)
      : null;

  const schedeCosts = sumManodoperaCostFromSchede(completate, range, schedeStore, costoOrario, magazzinoRows);
  const manodopera = schedeLoaded && schedeCosts.lavorazioniConScheda > 0 ? schedeCosts.manodopera : null;
  const totalMaint = ricambiCost + (manodopera ?? 0);

  const schedeCostsPrevRaw =
    compareRange && schedeStore
      ? sumManodoperaCostFromSchede(completate, compareRange, schedeStore, costoOrario, magazzinoRows)
      : null;
  const manodoperaPrev =
    compareRange && schedeCostsPrevRaw != null
      ? compareBaselineValue(schedeCostsPrevRaw.manodopera, compareRange, range, compareMode)
      : null;
  const totalMaintPrev =
    compareRange && ricambiCostPrev != null
      ? ricambiCostPrev + (manodoperaPrev ?? 0)
      : null;

  const sotto = sottoScortaCount(magazzino);
  const late = countInterventiInRitardo(attive, anchor);

  const executive: KpiPerformanceExecutiveCard[] = [
    {
      id: "officina",
      label: "Mezzi in officina",
      value: String(inOfficina),
      sub: `Su ${countMezziTotal(mezzi)} in anagrafica`,
      kind: "proxy",
    },
    {
      id: "open",
      label: "Interventi aperti",
      value: String(openCur),
      sub: late > 0 ? `${late} oltre soglia giorni` : undefined,
      kind: "exact",
    },
    {
      id: "closed",
      label: "Chiusi nel periodo",
      value: String(closedCur),
      kind: "exact",
      comparePct: closedPrev != null ? deltaPct(closedPrev, closedCur) : null,
      compareDelta:
        closedPrev != null ? `${closedCur - closedPrev >= 0 ? "+" : ""}${closedCur - closedPrev}` : null,
    },
    {
      id: "cost",
      label: "Costi manutenzione",
      value: fmtEur(totalMaint),
      sub: manodopera != null ? `Ricambi log ${fmtEur(ricambiCost)} · Manodopera ${fmtEur(manodopera)}` : `Ricambi log ${fmtEur(ricambiCost)}`,
      kind: manodopera != null ? "partial" : "partial",
      comparePct: totalMaintPrev != null ? deltaPct(totalMaintPrev, totalMaint) : null,
      compareDelta: null,
    },
    {
      id: "scorta",
      label: "Ricambi sotto scorta",
      value: String(sotto),
      kind: "exact",
    },
  ];

  const avgClose = semanticIndex.tempoMedio(range);
  const avgClosePrev = compareRange ? semanticIndex.tempoMedio(compareRange) : null;
  const closeVals = closeDaysValuesInRange(completate, range);
  const { median: closeMedian, p90: closeP90 } = closeDaysPercentiles(closeVals);

  const ranking = buildRicambiConsumoRanking(magLog, magazzino, range, { limit: KPI_TOP_N });

  const faultsByMonth = heuristicFaultsByMonth(mezzi, lavRows, range);

  return {
    range,
    compareRange,
    executive,
    operational: {
      closedInPeriod: closedCur,
      openCount: openCur,
      lateSlaCount: late,
      avgCloseDays: avgClose > 0 ? avgClose : null,
      avgCloseDaysCompare: avgClosePrev != null && avgClosePrev > 0 ? avgClosePrev : null,
      closeDaysMedian: closeMedian > 0 ? closeMedian : null,
      closeDaysP90: closeP90 > 0 ? closeP90 : null,
      monthlyClosed: mapMonthly(semanticIndex.completateByMonth, range),
      heuristicFaultsMonthly: monthKeysOverlappingRange(range).map((monthKey) => ({
        monthKey,
        label: monthLabel(monthKey),
        value: heuristicFaultsByMonth(mezzi, lavRows, range).get(monthKey) ?? 0,
      })),
    },
    economic: {
      ricambiCostPeriod: ricambiCost,
      manodoperaCostPeriod: manodopera,
      manodoperaAvailable: schedeLoaded && schedeCosts.lavorazioniConScheda > 0,
      totalMaintenanceCost: totalMaint,
      topMezziByCost: topMezziByEstimatedCost(
        completate,
        range,
        schedeStore,
        costoOrario,
        magazzinoRows,
        mezzi,
      ),
      topComponents: ranking.map((r) => ({ id: r.id, nome: r.nome, totalUscite: r.totalUscite })),
    },
    fleet: {
      totalMezzi: mezzi.length,
      mezziInOfficina: inOfficina,
      mezziOperativiProxy: countMezziTotal(mezzi) - inOfficina,
      disponibilitaGlobalePct: disponibilitaFlottaPctProxy(mezzi, lavRows),
      clientiSottoSoglia: countClientiSottoSogliaDisponibilita(disponibilitaPerCliente),
      disponibilitaPerCliente,
      peggiorDisponibilita,
      avgDowntimeDays: avgDowntimeDaysInPeriod(mezzi, lavRows, range),
      guastiByTipo: guastiByTipoAttrezzatura(mezzi, lavRows, range),
      mezziAltaFrequenzaGuasti: mezziConFrequenzaGuastiAlta(mezzi, lavRows),
      heuristicFaultsMonthly: monthKeysOverlappingRange(range).map((monthKey) => ({
        monthKey,
        label: monthLabel(monthKey),
        value: faultsByMonth.get(monthKey) ?? 0,
      })),
      disponibilitaTrendMonthly: buildFleetDisponibilitaTrendProxy(mezzi, lavRows, range),
    },
    alerts: buildAlerts({ attive, anchor, prodotti: magazzino, mezzi, completate, lavRows, range }),
    complianceAvailable: false,
  };
}
