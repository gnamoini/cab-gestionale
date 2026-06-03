import { sanitizePdfFileNamePart } from "@/lib/pdf/pdf-filename-utils";
import type { TimesheetMonthKey } from "@/lib/dipendenti/types";
import { formatMonthLabel } from "@/lib/dipendenti/timesheet-month";

export type DipendentiPdfReportKind = "aziendale" | "dipendente";

export function buildDipendentiPdfDownloadFileName(opts: {
  monthKey: TimesheetMonthKey;
  kind: DipendentiPdfReportKind;
  employeeName?: string | null;
}): string {
  const period = opts.monthKey.replace("-", "");
  const periodLabel = sanitizePdfFileNamePart(formatMonthLabel(opts.monthKey).replace(/\s+/g, "_"), period);

  if (opts.kind === "dipendente" && opts.employeeName?.trim()) {
    const name = sanitizePdfFileNamePart(opts.employeeName.trim().replace(/\s+/g, "_"), "dipendente");
    return `timesheet_dipendente_${name}_${period}.pdf`;
  }

  return `timesheet_aziendale_${periodLabel}.pdf`;
}
