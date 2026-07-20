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
      { label: "Carico periodo" },
    );
    if (m) items.push(m);
  }

  if (perf && lavPeriodo) {
    const opened = Number.parseInt(lavPeriodo.value, 10) || 0;
    const closed = perf.operational.closedInPeriod;
    const saldo = opened - closed;
    items.push({
      id: "lav-saldo-periodo",
      label: "Accumulo periodo",
      value: saldo > 0 ? `+${saldo}` : String(saldo),
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY["lav-saldo-periodo"]!.description,
      compact: true,
    });
  }

  if (perf) {
    const late = perf.operational.lateSlaCount;
    const open = perf.operational.openCount;
    const pct = open > 0 ? Math.round((late / open) * 1000) / 10 : null;
    items.push({
      id: "lav_late_sla",
      label: "Oltre SLA",
      value: String(late),
      sub: pct != null ? `${pct}% del backlog` : undefined,
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY["lav_late_sla"]!.description,
      hero: true,
    });
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
          ? `${weeksN} sett. nel periodo${weeksN < 4 ? " · stima su settimane parziali" : ""}`
          : "Nessuna settimana nel periodo selezionato",
      compareRows: avgCompare,
      description: UNIFIED_KPI_DISPLAY["lav-media-settimanale"]!.description,
      compact: true,
    });
  }

  if (perf) {
    const closedExec = execById(exec, "closed");
    items.push({
      id: "lav-chiusi",
      label: "Chiusure periodo",
      value: String(perf.operational.closedInPeriod),
      compareRows: execCompareRows(closedExec),
      description: UNIFIED_KPI_DISPLAY["lav-chiusi"]!.description,
    });

    const openExec = execById(exec, "open");
    items.push({
      id: "lav-aperti",
      label: "Backlog attuale",
      value: String(perf.operational.openCount),
      sub: openExec?.sub,
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY["lav-aperti"]!.description,
      hero: true,
    });

    const tempo = perf.operational.closeDaysMedian ?? perf.operational.avgCloseDays;
    const tempoPrev = perf.operational.avgCloseDaysCompare;
    const p90 = perf.operational.closeDaysP90;
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
      label: "Tempo mediano chiusura",
      value: tempo != null && tempo > 0 ? `${tempo.toLocaleString("it-IT", { maximumFractionDigits: 1 })} gg` : "—",
      sub: p90 != null && p90 > 0 ? `P90: ${p90} gg` : undefined,
      compareRows: tempoCompare,
      description: UNIFIED_KPI_DISPLAY["lav-tempo"]!.description,
      compact: true,
    });

    items.push({
      id: "flotta-officina",
      label: "Mezzi in officina",
      value: String(perf.fleet.mezziInOfficina),
      sub:
        perf.fleet.totalMezzi > 0
          ? `${Math.round((perf.fleet.mezziInOfficina / perf.fleet.totalMezzi) * 1000) / 10}% del parco (${perf.fleet.totalMezzi} mezzi)`
          : undefined,
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY["flotta-officina"]!.description,
    });

    items.push({
      id: "fleet-disponibilita",
      label: "Disponibilità flotta",
      value:
        perf.fleet.disponibilitaGlobalePct != null
          ? `${perf.fleet.disponibilitaGlobalePct.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`
          : "—",
      sub: "Mezzi senza lavorazione aperta",
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY["fleet-disponibilita"]!.description,
      hero: true,
    });

    items.push({
      id: "clienti-sotto-soglia",
      label: "Clienti sotto soglia",
      value: String(perf.fleet.clientiSottoSoglia),
      sub: "Disponibilità < 75%",
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY["clienti-sotto-soglia"]!.description,
      hero: true,
    });

    items.push({
      id: "fleet-tempo-fermo",
      label: "Tempo medio fermo",
      value:
        perf.fleet.avgDowntimeDays != null
          ? `${perf.fleet.avgDowntimeDays.toLocaleString("it-IT", { maximumFractionDigits: 1 })} gg`
          : "—",
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY["fleet-tempo-fermo"]!.description,
    });

    items.push({
      id: "fleet-mezzi-critici",
      label: "Mezzi critici",
      value: String(perf.fleet.mezziAltaFrequenzaGuasti.length),
      sub: "Frequenza guasti elevata",
      compareRows: null,
      description: UNIFIED_KPI_DISPLAY["fleet-mezzi-critici"]!.description,
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

  for (const id of ["cap", "ric-usati", "mag-entrate", "clienti"] as const) {
    const k = byId.get(id);
    if (!k) continue;
    const m = withMeta(k);
    if (m) items.push(m);
  }

  return items.sort((a, b) => (UNIFIED_KPI_DISPLAY[a.id]?.order ?? 99) - (UNIFIED_KPI_DISPLAY[b.id]?.order ?? 99));
}
