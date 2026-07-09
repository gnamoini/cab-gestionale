import type { ReportValueFormatter } from "@/lib/report/metrics/report-value-formatter";

export type ReportTableColumnConfig = {
  id: string;
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  formatter?: ReportValueFormatter;
};

export type ReportTableConfig = {
  id: string;
  label: string;
  columns: readonly ReportTableColumnConfig[];
};
