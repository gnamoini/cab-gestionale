import type { DomainReportSectionProps } from "@/components/report/report-section-types";
import {
  computeCrossCostJob,
  computeCrossEfficiency,
  computeCrossPartsJob,
  computeCrossValueHour,
  fmtEur,
  fmtN,
} from "@/lib/report/cross-analysis/build-report-cross-dto";
import { crossFormulaInputFromDerived } from "@/lib/report/cross-analysis/normalize-cross-input";
import {
  buildEconomicAnalytics,
  buildLaborAnalytics,
  buildOperationalAnalytics,
  buildWarehouseAnalytics,
} from "@/lib/report/report-domain-analytics";
import { metricComparedNumber } from "@/lib/report/report-metric-compare";
import type { ReportAnalyticsDerivedSnapshot, ReportDomainMetric } from "@/lib/report/report-domain-types";

type CrossId = "cross_efficiency" | "cross_parts_job" | "cross_cost_job" | "cross_value_hour";

const CROSS_SPECS: Record<
  CrossId,
  { label: string; fmt: (n: number) => string; compute: typeof computeCrossEfficiency }
> = {
  cross_efficiency: { label: "Efficienza (interventi/ore)", fmt: fmtN, compute: computeCrossEfficiency },
  cross_parts_job: { label: "Ricambi/intervento", fmt: fmtN, compute: computeCrossPartsJob },
  cross_cost_job: { label: "Costo medio lavorazione", fmt: fmtEur, compute: computeCrossCostJob },
  cross_value_hour: { label: "Valore/ora", fmt: fmtEur, compute: computeCrossValueHour },
};

function derivedSnapshotForRange(
  props: DomainReportSectionProps,
  range: DomainReportSectionProps["range"],
  totalHours: number,
): ReportAnalyticsDerivedSnapshot {
  const rangeKey = props.rangeKey;
  const requestId = 0;
  const compareInput = {
    compareRange: null,
    compareMode: props.analyticsContext.compareMode,
  };
  const operational = buildOperationalAnalytics({
    rangeKey,
    requestId,
    range,
    ...compareInput,
    attive: props.attive,
    storico: props.storico,
    completate: props.completate,
    lavRows: props.lavListRows,
    manualByMonth: props.manualByMonth,
  });
  const warehouse = buildWarehouseAnalytics({
    rangeKey,
    requestId,
    range,
    ...compareInput,
    magLog: props.magLog,
    magazzino: props.prodotti,
    magazzinoRows: props.magazzinoRows,
    ordini: [],
  });
  const labor = buildLaborAnalytics({
    rangeKey,
    requestId,
    range,
    ...compareInput,
    completate: props.completate,
    schedeStore: props.schedeStore,
    totalHours,
    compareTotalHours: null,
    costoOrario: props.costoOrario,
    magazzinoRows: props.magazzinoRows,
  });
  const economic = buildEconomicAnalytics({
    rangeKey,
    requestId,
    range,
    ...compareInput,
    preventivi: [],
    invoices: [],
    ddtDocuments: [],
    derivedHints: {
      completedInPeriod: operational.completedInPeriod,
      manodoperaCost: labor.manodoperaCost,
      movementValue: warehouse.movementValue,
    },
  });
  const now = Date.now();
  const entry = <T,>(data: T) => ({ data, rangeKey, generatedAt: now, version: 0 });
  return {
    revision: 0,
    currentRangeKey: rangeKey,
    operational: entry(operational),
    warehouse: entry(warehouse),
    labor: entry(labor),
    economic: entry(economic),
  };
}

function crossMetric(
  id: CrossId,
  input: ReturnType<typeof crossFormulaInputFromDerived>,
  props: DomainReportSectionProps,
  prevInput: ReturnType<typeof crossFormulaInputFromDerived> | null,
): ReportDomainMetric {
  const spec = CROSS_SPECS[id];
  const result = spec.compute(input);
  if (result.status === "not_loaded") {
    return { id, label: spec.label, state: { status: "not_loaded", hint: "Caricamento dati cross-domain…" } };
  }
  if (result.status === "not_available") {
    return { id, label: spec.label, state: { status: "not_available", reason: "Dati insufficienti nel periodo" } };
  }
  const prevVal =
    prevInput && props.showCompare && props.compareRange
      ? (() => {
          const prev = spec.compute(prevInput);
          return prev.status === "available" ? prev.value : null;
        })()
      : null;
  return metricComparedNumber(
    id,
    spec.label,
    result.value,
    prevVal,
    spec.fmt,
    props.range,
    props.compareRange,
    props.analyticsContext.compareMode,
  );
}

/** Cross KPI con confronto periodo (rebuild locale snapshot parziale). */
export function buildCrossMetricsWithCompare(
  derived: ReportAnalyticsDerivedSnapshot,
  props: DomainReportSectionProps,
  compareTotalHours: number | null,
): ReportDomainMetric[] {
  const input = crossFormulaInputFromDerived(derived);
  const prevInput =
    props.showCompare && props.compareRange && compareTotalHours != null
      ? crossFormulaInputFromDerived(derivedSnapshotForRange(props, props.compareRange, compareTotalHours))
      : null;

  return (Object.keys(CROSS_SPECS) as CrossId[]).map((id) => crossMetric(id, input, props, prevInput));
}
