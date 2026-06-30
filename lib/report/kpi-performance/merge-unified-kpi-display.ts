import type { KpiCardModel, KpiCompareRow } from "@/lib/report/build-report-model";
import { deltaPct, type DateRange } from "@/lib/report/date-ranges";
import { UNIFIED_KPI_DISPLAY } from "@/lib/report/kpi-performance/kpi-display-catalog";
import type { KpiPerformanceExecutiveCard, KpiPerformanceModel } from "@/lib/report/kpi-performance/kpi-performance-types";
import type { ReportSemanticIndex } from "@/lib/report/report-semantic-index";

export type UnifiedKpiDisplayItem = KpiCardModel & {
  description: string;
  hero?: boolean;
  compact?: boolean;
};

function fmtEur(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function execCompareRows(card: KpiPerformanceExecutiveCard | undefined, invertCost = false): KpiCompareRow[] | null {
  if (!card || (card.comparePct == null && card.compareDelta == null)) return null;
  return [
    {
      label: "vs confronto",
      deltaAbs: card.compareDelta ?? null,
      deltaPct: card.comparePct ?? null,
      invert: invertCost,
    },
  ];
}

function execById(cards: KpiPerformanceExecutiveCard[], id: string): KpiPerformanceExecutiveCard | undefined {
  return cards.find((c) => c.id === id);
}

function withMeta(
  item: KpiCardModel,
  overrides?: Partial<Pick<UnifiedKpiDisplayItem, "label" | "sub" | "compareRows">>,
): UnifiedKpiDisplayItem | null {
  const meta = UNIFIED_KPI_DISPLAY[item.id];
  if (!meta) return null;
  return {
    ...item,
    label: overrides?.label ?? item.label,
    sub: overrides?.sub ?? item.sub,
    compareRows: overrides?.compareRows !== undefined ? overrides.compareRows : item.compareRows,
    description: meta.description,
    hero: meta.hero,
    compact: meta.compact,
  };
}

function fmtSignedAvg(n: number): string {
  const s = n > 0 ? "+" : "";
  return `${s}${n.toLocaleString("it-IT", { maximumFractionDigits: 1 })}`;
}

/** Unisce KPI periodo (buildReportModel) e metriche performance senza ricalcolare valori. */
export function mergeUnifiedKpiDisplay(
  periodKpis: readonly KpiCardModel[],
  perf: KpiPerformanceModel | null,
  semanticIndex: ReportSemanticIndex | null,
  compareRange: DateRange | null,
): UnifiedKpiDisplayItem[] {
  const exec = perf?.executive ?? [];
  const byId = new Map(periodKpis.map((k) => [k.id, k]));

  const lavPeriodo = byId.get("lav-periodo");
  const items: UnifiedKpiDisplayItem[] = [];

  if (lavPeriodo) {
    const m = withMeta(
      {
        ...lavPeriodo,
        label: "Ingressi lavorazioni",
        sub: lavPeriodo.spark?.length ? "Trend 7gg: solo chiusure DB" : undefined,
      },
      { label: "Ingressi lavorazioni" },
    );
    if (m) items.push(m);
  }

  if (semanticIndex && perf) {
    const avgCur = semanticIndex.avgWeeklyCompletate(perf.range);
    const weeksN = semanticIndex.weekCountInRange(perf.range);
    const avgPrev = compareRange ? semanticIndex.avgWeeklyCompletate(compareRange) : null;
    let avgCompare: KpiCompareRow[] | null = null;
    if (avgPrev != null && compareRange) {
      const delta = Math.round((avgCur - avgPrev) * 10) / 10;
      avgCompare = [
        {
          label: "vs confronto",
          deltaAbs: fmtSignedAvg(delta),
          deltaPct: deltaPct(avgPrev, avgCur),
        },
      ];
    }
    items.push({
      id: "lav-media-settimanale",
      label: "Media settimanale chiusure",
      value: avgCur.toLocaleString("it-IT", { maximumFractionDigits: 1 }),
      sub:
        weeksN > 0
          ? `${weeksN} settimane nel periodo · media su tutte le settimane del filtro`
          : "Nessuna settimana nel periodo selezionato",
      compareRows: avgCompare,
      description: UNIFIED_KPI_DISPLAY["lav-media-settimanale"]!.description,
    });
  }

  if (perf) {
    const closedExec = execById(exec, "closed");
    items.push({
      id: "lav-chiusi",
      label: "Chiusure archiviate",
      value: String(perf.operational.closedInPeriod),
      compareRows: execCompareRows(closedExec),
      description: UNIFIED_KPI_DISPLAY["lav-chiusi"]!.description,
    });

    const openExec = execById(exec, "open");
    items.push({
      id: "lav-aperti",
      label: "Interventi aperti",
      value: String(perf.operational.openCount),
      sub: openExec?.sub,
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY["lav-aperti"]!.description,
    });

    const tempo = perf.operational.avgCloseDays;
    const tempoPrev = perf.operational.avgCloseDaysCompare;
    let tempoCompare: KpiCompareRow[] | null = null;
    if (tempo != null && tempoPrev != null && tempoPrev > 0) {
      const delta = Math.round((tempo - tempoPrev) * 10) / 10;
      tempoCompare = [
        {
          label: "vs confronto",
          deltaAbs: `${delta >= 0 ? "+" : ""}${delta} gg`,
          deltaPct: Math.round(((tempo - tempoPrev) / tempoPrev) * 1000) / 10,
          invert: true,
        },
      ];
    }
    items.push({
      id: "lav-tempo",
      label: "Tempo medio chiusura",
      value: tempo != null && tempo > 0 ? `${tempo.toLocaleString("it-IT", { maximumFractionDigits: 1 })} gg` : "—",
      compareRows: tempoCompare,
      description: UNIFIED_KPI_DISPLAY["lav-tempo"]!.description,
    });

    items.push({
      id: "flotta-officina",
      label: "Mezzi in officina",
      value: String(perf.fleet.mezziInOfficina),
      sub: `Su ${perf.fleet.totalMezzi} in anagrafica`,
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY["flotta-officina"]!.description,
    });

    const costExec = execById(exec, "cost");
    items.push({
      id: "cost-tot",
      label: "Costi manutenzione",
      value: fmtEur(perf.economic.totalMaintenanceCost),
      sub: costExec?.sub,
      compareRows: execCompareRows(costExec, true),
      description: UNIFIED_KPI_DISPLAY["cost-tot"]!.description,
    });

    const scortaExec = execById(exec, "scorta");
    items.push({
      id: "scorta",
      label: "Ricambi sotto scorta",
      value: scortaExec?.value ?? "0",
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY.scorta!.description,
      compact: true,
    });
  }

  for (const id of ["cap", "ric-usati", "clienti", "mezzi"] as const) {
    const k = byId.get(id);
    if (!k) continue;
    const m = withMeta(k);
    if (m) items.push(m);
  }

  return items.sort((a, b) => (UNIFIED_KPI_DISPLAY[a.id]?.order ?? 99) - (UNIFIED_KPI_DISPLAY[b.id]?.order ?? 99));
}
