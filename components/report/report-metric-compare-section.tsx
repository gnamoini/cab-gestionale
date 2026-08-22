"use client";

import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { shouldInvertCompareTone } from "@/lib/report/metrics/build-metric-compare-state";
import type {
  ReportMetricCompareState,
  ReportMetricTrendSemantics,
  ReportMetricUnit,
  ReportCompareUnavailableReason,
} from "@/lib/report/metrics/report-metric-types";
import {
  reportArrowAndTone,
  reportCompareToneClass,
} from "@/components/report/report-ui-tokens";

const UNAVAILABLE_LABELS: Record<ReportCompareUnavailableReason, string> = {
  snapshot: "Confronto non disponibile (dato istantaneo)",
  no_history: "Confronto non disponibile",
  period_not_applicable: "Confronto non applicabile a questa vista",
  not_loaded: "Confronto in calcolo",
};

function fmtPct(p: number | null): string | null {
  if (p == null) return null;
  const s = p > 0 ? "+" : "";
  return `${s}${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

export function ReportCompareUnavailable({
  reason,
  hint,
}: {
  reason: ReportCompareUnavailableReason;
  hint?: string;
}) {
  return (
    <div className="mt-3 border-t border-[color:var(--cab-border)] pt-3 text-xs text-[color:var(--cab-text-muted)]">
      <p>{UNAVAILABLE_LABELS[reason]}</p>
      {hint ? <p className="mt-1">{hint}</p> : null}
    </div>
  );
}

export function ReportMetricCompareSection({
  compare,
  unit,
  trendSemantics,
  compareRequested = false,
}: {
  compare: ReportMetricCompareState | null;
  unit: ReportMetricUnit;
  trendSemantics: ReportMetricTrendSemantics;
  /** When false and compare is null, render nothing (no compare mode). */
  compareRequested?: boolean;
}) {
  if (compare == null) {
    if (!compareRequested) return null;
    return (
      <div className="mt-3 border-t border-[color:var(--cab-border)] pt-3 text-xs text-[color:var(--cab-text-muted)]">
        Calcolo confronto…
      </div>
    );
  }
  if (compare.status === "unavailable") {
    return <ReportCompareUnavailable reason={compare.reason} hint={compare.hint} />;
  }

  const invert = shouldInvertCompareTone(trendSemantics);
  const pctStr = fmtPct(compare.deltaPercent);
  const { arrow, tone } = reportArrowAndTone(compare.deltaPercent, invert);
  const tc = reportCompareToneClass(tone);
  const prevFormatted = formatReportMetricValue(compare.previousValue, unit);

  return (
    <div className="mt-3 space-y-1.5 border-t border-[color:var(--cab-border)] pt-3">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
        <span className="font-medium text-[color:var(--cab-text-muted)]">vs confronto</span>
        <span className="tabular-nums text-[color:var(--cab-text)]">{prevFormatted}</span>
      </div>
      <div className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-2 text-xs">
        <span className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${tc}`}>
          <span className="text-sm leading-none">{arrow}</span>
          {pctStr != null ? <span>{pctStr}</span> : <span>—</span>}
        </span>
      </div>
    </div>
  );
}
