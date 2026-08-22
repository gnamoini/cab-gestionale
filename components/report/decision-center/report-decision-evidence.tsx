"use client";

import type { DecisionEvidence, DecisionEvidenceMetric } from "@/lib/report/decision-center/types";
import { useMetricDrillDown } from "@/components/report/bi-center/use-metric-drill-down";
import { getReportBusinessLabelCardCopy } from "@/lib/report/ui/report-business-labels";

function MetricEvidenceRow({ metric }: { metric: DecisionEvidenceMetric }) {
  const { supported, open } = useMetricDrillDown(metric.metricId);
  const label = getReportBusinessLabelCardCopy(metric.metricId, true).title;

  const delta =
    metric.deltaPercent != null
      ? `${metric.deltaPercent > 0 ? "+" : ""}${metric.deltaPercent.toFixed(1)}%`
      : null;

  const content = (
    <>
      <span className="min-w-0 truncate text-xs text-[color:var(--cab-text-muted)]">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        {delta ? (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
              metric.deltaPercent! > 0
                ? "bg-[color:color-mix(in_srgb,var(--cab-success)_12%,var(--cab-card))] text-[color:var(--cab-success)]"
                : metric.deltaPercent! < 0
                  ? "bg-[color:color-mix(in_srgb,var(--cab-danger)_12%,var(--cab-card))] text-[color:var(--cab-danger)]"
                  : "bg-[color:var(--cab-surface-muted)] text-[color:var(--cab-text-muted)]"
            }`}
          >
            {delta}
          </span>
        ) : null}
        <span className="text-sm font-semibold tabular-nums text-[color:var(--cab-text)]">{metric.value}</span>
      </span>
    </>
  );

  if (!supported) {
    return (
      <li className="flex items-center justify-between gap-3 px-3 py-2">
        {content}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-[color:var(--cab-surface-muted)]"
        onClick={() => open()}
      >
        {content}
      </button>
    </li>
  );
}

export function ReportDecisionEvidence({
  evidence,
  collapsible,
}: {
  evidence: DecisionEvidence;
  collapsible?: boolean;
}) {
  const body = (
    <div className="space-y-2">
      {evidence.summary ? (
        <p className="text-xs leading-relaxed text-[color:var(--cab-text-muted)]">{evidence.summary}</p>
      ) : null}
      {evidence.metrics.length > 0 ? (
        <ul className="overflow-hidden rounded-lg border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_25%,var(--cab-card))] divide-y divide-[color:var(--cab-border)]">
          {evidence.metrics.map((m) => (
            <MetricEvidenceRow key={m.metricId} metric={m} />
          ))}
        </ul>
      ) : null}
      {evidence.eventIds.length > 0 ? (
        <p className="text-[10px] text-[color:var(--cab-text-muted)]">
          {evidence.eventIds.length === 1
            ? "1 evento correlato"
            : `${evidence.eventIds.length} eventi correlati`}
        </p>
      ) : null}
    </div>
  );

  if (!collapsible) return body;

  return (
    <details className="md:hidden">
      <summary className="cursor-pointer text-xs font-medium text-[color:var(--cab-text-muted)]">
        Dati di supporto
      </summary>
      <div className="mt-2">{body}</div>
    </details>
  );
}
