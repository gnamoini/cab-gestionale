import type { ReportMetricKind } from "@/lib/report/metrics/report-metric-types";

/** Kind registrati — audit senza importare componenti React. */
export const REPORT_RENDERER_KINDS = ["kpi", "ranking", "temporal", "matrix"] as const satisfies readonly ReportMetricKind[];
