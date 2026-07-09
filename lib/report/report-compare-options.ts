import type { ReportCompareMode } from "@/lib/report/date-ranges";

export const REPORT_COMPARE_OPTIONS: readonly { value: ReportCompareMode; label: string }[] = [
  { value: "none", label: "Nessun confronto" },
  { value: "prev_period", label: "Periodo precedente" },
  { value: "prev_year", label: "Stesso periodo anno scorso" },
  { value: "avg_3_months", label: "Media ultimi 3 mesi" },
  { value: "avg_12_months", label: "Media ultimo anno" },
  { value: "avg_3_years", label: "Media ultimi 3 anni" },
  { value: "custom_range", label: "Periodo personalizzato" },
] as const;

export const REPORT_COMPARE_QUICK_IDS = [
  "prev_period",
  "prev_year",
  "avg_3_months",
  "avg_12_months",
  "avg_3_years",
] as const satisfies readonly Exclude<ReportCompareMode, "none" | "custom_range">[];

export const REPORT_COMPARE_QUICK_SHORT_LABELS: Record<(typeof REPORT_COMPARE_QUICK_IDS)[number], string> = {
  prev_period: "Prec.",
  prev_year: "Anno prec.",
  avg_3_months: "Media 3m",
  avg_12_months: "Media 1a",
  avg_3_years: "Media 3a",
};

export const REPORT_COMPARE_LABELS: Record<Exclude<ReportCompareMode, "none">, string> = {
  prev_period: "vs periodo precedente",
  prev_year: "vs stesso periodo anno scorso",
  avg_3_months: "vs media ultimi 3 mesi",
  avg_12_months: "vs media ultimo anno",
  avg_3_years: "vs media ultimi 3 anni",
  custom_range: "vs periodo personalizzato",
};

const VALID_COMPARE = new Set<string>(REPORT_COMPARE_OPTIONS.map((o) => o.value));

export function isReportCompareMode(value: string): value is ReportCompareMode {
  return VALID_COMPARE.has(value);
}

export function reportCompareQuickChipLabel(id: (typeof REPORT_COMPARE_QUICK_IDS)[number]): string {
  return REPORT_COMPARE_QUICK_SHORT_LABELS[id];
}
