import { crossFormulaInputFromDerived } from "@/lib/report/cross-analysis/normalize-cross-input";
import {
  computeCrossCostJob,
  computeCrossEfficiency,
  computeCrossPartsJob,
  computeCrossValueHour,
  fmtEur,
  fmtN,
} from "@/lib/report/cross-analysis/build-report-cross-dto";
import type {
  CrossAnalyticsDto,
  ReportAnalyticsDerivedSnapshot,
  ReportDomainMetric,
  ReportMetricState,
} from "@/lib/report/report-domain-types";

function metric(id: string, label: string, state: ReportMetricState): ReportDomainMetric {
  return { id, label, state };
}

function availableMetric(id: string, label: string, value: string): ReportDomainMetric {
  return metric(id, label, { status: "available", value });
}

type LegacySpec = {
  shortLabel: string;
  availableLabel: string;
  hint: string;
  unavailable: string;
  format: (n: number) => string;
};

const LEGACY_SPECS: Record<
  "cross_efficiency" | "cross_parts_job" | "cross_cost_job" | "cross_value_hour",
  LegacySpec
> = {
  cross_efficiency: {
    shortLabel: "Efficienza",
    availableLabel: "Efficienza (interventi/ore)",
    hint: "Apri Lavorazioni e Ore lavorate per calcolare",
    unavailable: "Dati insufficienti per il calcolo",
    format: fmtN,
  },
  cross_parts_job: {
    shortLabel: "Ricambi/intervento",
    availableLabel: "Ricambi/intervento",
    hint: "Apri Magazzino e Lavorazioni per calcolare",
    unavailable: "Nessuna lavorazione completata nel periodo",
    format: fmtN,
  },
  cross_cost_job: {
    shortLabel: "Costo medio lavorazione",
    availableLabel: "Costo medio lavorazione",
    hint: "Apri Lavorazioni per calcolare",
    unavailable: "Nessuna lavorazione completata nel periodo",
    format: fmtEur,
  },
  cross_value_hour: {
    shortLabel: "Valore/ora",
    availableLabel: "Valore/ora",
    hint: "Apri Dati economici e Ore lavorate per calcolare",
    unavailable: "Non disponibile nel periodo selezionato",
    format: fmtEur,
  },
};

function toLegacyMetric(
  id: keyof typeof LEGACY_SPECS,
  compute: (input: ReturnType<typeof crossFormulaInputFromDerived>) => ReturnType<typeof computeCrossEfficiency>,
  input: ReturnType<typeof crossFormulaInputFromDerived>,
): ReportDomainMetric {
  const spec = LEGACY_SPECS[id];
  const result = compute(input);
  if (result.status === "not_loaded") {
    return metric(id, spec.shortLabel, { status: "not_loaded", hint: spec.hint });
  }
  if (result.status === "not_available") {
    return metric(id, spec.shortLabel, { status: "not_available", reason: spec.unavailable });
  }
  return availableMetric(id, spec.availableLabel, spec.format(result.value));
}

/** Maps SSOT cross compute to V1 CrossAnalyticsDto shape. */
export function crossDtoToLegacyCrossAnalytics(
  derived: ReportAnalyticsDerivedSnapshot,
): CrossAnalyticsDto {
  const input = crossFormulaInputFromDerived(derived);
  return {
    metrics: [
      toLegacyMetric("cross_efficiency", computeCrossEfficiency, input),
      toLegacyMetric("cross_parts_job", computeCrossPartsJob, input),
      toLegacyMetric("cross_cost_job", computeCrossCostJob, input),
      toLegacyMetric("cross_value_hour", computeCrossValueHour, input),
    ],
  };
}
