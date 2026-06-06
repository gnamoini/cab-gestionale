"use client";

import type { DateRange } from "@/lib/report/date-ranges";
import { inclusiveDayCount, type ReportCompareMode, type ReportPeriodPreset } from "@/lib/report/date-ranges";
import { REPORT_PRESET_LABELS } from "@/lib/report/report-period-presets";
import {
  dsPageToolbarMetaChip,
  dsPageToolbarMetaChipAccent,
} from "@/lib/ui/design-system";

const COMPARE_LABELS: Record<ReportCompareMode, string> = {
  none: "Nessun confronto",
  prev_period: "vs periodo precedente",
  prev_year: "vs stesso periodo anno precedente",
};

function fmtRangeLine(range: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  const a = range.start.toLocaleDateString("it-IT", opts);
  const b = range.end.toLocaleDateString("it-IT", opts);
  return `${a} – ${b}`;
}

/** Chip compatti — stessa riga meta delle toolbar liste. */
export function ReportPeriodMeta({
  preset,
  range,
  compareMode,
  compareRange,
}: {
  preset: ReportPeriodPreset;
  range: DateRange;
  compareMode: ReportCompareMode;
  compareRange: DateRange | null;
}) {
  const dayCount = inclusiveDayCount(range);

  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
      role="status"
      aria-live="polite"
      aria-label={`Periodo: ${REPORT_PRESET_LABELS[preset]}, ${fmtRangeLine(range)}`}
    >
      <span className={dsPageToolbarMetaChipAccent}>{REPORT_PRESET_LABELS[preset]}</span>
      <span className={`${dsPageToolbarMetaChip} tabular-nums`}>{fmtRangeLine(range)}</span>
      <span className={dsPageToolbarMetaChip}>({dayCount} giorni)</span>
      {compareMode !== "none" && compareRange ? (
        <>
          <span className={dsPageToolbarMetaChipAccent}>{COMPARE_LABELS[compareMode]}</span>
          <span className={`${dsPageToolbarMetaChip} tabular-nums`}>{fmtRangeLine(compareRange)}</span>
        </>
      ) : (
        <span className={dsPageToolbarMetaChip}>{COMPARE_LABELS.none}</span>
      )}
    </div>
  );
}

/** @deprecated Usare `ReportPeriodMeta` nella meta row della toolbar. */
export function ReportPeriodSummary(props: {
  preset: ReportPeriodPreset;
  range: DateRange;
  compareMode: ReportCompareMode;
  compareRange: DateRange | null;
}) {
  return <ReportPeriodMeta {...props} />;
}
