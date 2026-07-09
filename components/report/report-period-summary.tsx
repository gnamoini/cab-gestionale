"use client";

import type { DateRange } from "@/lib/report/date-ranges";
import { inclusiveDayCount, type ReportCompareMode, type ReportPeriodPreset } from "@/lib/report/date-ranges";
import { REPORT_PRESET_LABELS } from "@/lib/report/report-period-presets";
import {
  reportHealthChipClass,
  reportPeriodMetaClass,
  reportPeriodMetaRangeClass,
} from "@/components/report/report-ui-tokens";

import { REPORT_COMPARE_LABELS } from "@/lib/report/report-compare-options";

function fmtRangeLine(range: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  const a = range.start.toLocaleDateString("it-IT", opts);
  const b = range.end.toLocaleDateString("it-IT", opts);
  return `${a} – ${b}`;
}

/** Riepilogo date derivato — toolbar filtri report. */
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
  const rangeLine = fmtRangeLine(range);
  const compareActive = compareMode !== "none" && compareRange != null;

  const ariaLabel = compareActive
    ? `Periodo: ${REPORT_PRESET_LABELS[preset]}, ${rangeLine}, ${dayCount} giorni, ${REPORT_COMPARE_LABELS[compareMode]}, ${fmtRangeLine(compareRange)}`
    : `Periodo: ${REPORT_PRESET_LABELS[preset]}, ${rangeLine}, ${dayCount} giorni`;

  return (
    <div
      className="flex min-w-0 w-full flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1"
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div className={`${reportPeriodMetaClass} flex min-w-0 flex-1 flex-wrap items-center gap-2`}>
        <span className={reportHealthChipClass}>{REPORT_PRESET_LABELS[preset]}</span>
        <span className={reportPeriodMetaRangeClass}>{rangeLine}</span>
        <span aria-hidden="true">·</span>
        <span>{dayCount} giorni</span>
      </div>
      {compareActive ? (
        <p
          className={`${reportPeriodMetaClass} min-w-0 w-full shrink-0 sm:ml-auto sm:w-auto sm:text-right`}
        >
          <span>{REPORT_COMPARE_LABELS[compareMode]}</span>
          <span aria-hidden="true"> · </span>
          <span className={reportPeriodMetaRangeClass}>{fmtRangeLine(compareRange)}</span>
        </p>
      ) : null}
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
