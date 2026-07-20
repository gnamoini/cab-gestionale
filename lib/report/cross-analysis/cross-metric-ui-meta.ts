import type { DrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import type { CrossP0MetricId } from "@/lib/report/cross-analysis/cross-metric-registry";
import type { ReportKpiTrust } from "@/lib/report/kpi-display-clusters";
import type { TrustStatus } from "@/lib/report/contracts/metadata-envelope";

export type CrossMetricUiMeta = {
  label: string;
  description: string;
  drillDown: DrillDownRef;
  invertCompare?: boolean;
};

export const CROSS_METRIC_UI: Record<CrossP0MetricId, CrossMetricUiMeta> = {
  cross_efficiency: {
    label: "Efficienza officina",
    description: "Interventi chiusi per ogni ora lavorata nel periodo.",
    drillDown: { metricId: "cross_efficiency", targetSection: "ore_lavorate" },
  },
  cross_parts_job: {
    label: "Ricambi per intervento",
    description: "Pezzi usati diviso chiusure nel periodo.",
    drillDown: { metricId: "cross_parts_job", targetSection: "magazzino_ricambi" },
  },
  cross_cost_job: {
    label: "Costo medio lavorazione",
    description: "Ricambi movimentati + manodopera stimata da schede, per chiusura.",
    drillDown: { metricId: "cross_cost_job", targetSection: "dati_economici", targetTab: "costi" },
    invertCompare: true,
  },
  cross_value_hour: {
    label: "Valore per ora",
    description: "Fatturato emesso diviso ore timesheet. Date fattura e ore possono non coincidere.",
    drillDown: { metricId: "cross_value_hour", targetSection: "dati_economici" },
  },
};

export function crossTrustToKpiTrust(trust: TrustStatus | undefined): ReportKpiTrust | undefined {
  if (trust === "GREEN") return "exact";
  if (trust === "AMBER") return "partial";
  if (trust === "RED") return "snapshot";
  return undefined;
}
