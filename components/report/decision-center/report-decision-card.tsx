"use client";

import type { DecisionPriority, ReportDecisionPoint } from "@/lib/report/decision-center/types";
import { ReportDecisionPriority } from "@/components/report/decision-center/report-decision-priority";
import { ReportDecisionEvidence } from "@/components/report/decision-center/report-decision-evidence";
import { ReportDecisionStatus } from "@/components/report/decision-center/report-decision-status";
import { ReportTrustBadge } from "@/components/report/bi-center/report-trust-badge";
import { useMetricDrillDown } from "@/components/report/bi-center/use-metric-drill-down";

const PRIORITY_META: Record<
  DecisionPriority,
  { accent: string; surface: string }
> = {
  critical: {
    accent: "bg-[color:var(--cab-danger)]",
    surface:
      "border-[color:color-mix(in_srgb,var(--cab-danger)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_5%,var(--cab-card))]",
  },
  high: {
    accent: "bg-[color:var(--cab-warning)]",
    surface:
      "border-[color:color-mix(in_srgb,var(--cab-warning)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_5%,var(--cab-card))]",
  },
  medium: {
    accent: "bg-[color:var(--cab-primary)]",
    surface:
      "border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_35%,var(--cab-card))]",
  },
  low: {
    accent: "bg-[color:var(--cab-text-muted)]",
    surface: "border-[color:var(--cab-border)] bg-[var(--cab-card)]",
  },
};

export function ReportDecisionCard({
  decision,
  canWrite,
  onStatusChange,
}: {
  decision: ReportDecisionPoint;
  canWrite?: boolean;
  onStatusChange?: (status: import("@/lib/report/decision-center/types").DecisionStatus) => void;
}) {
  const primaryMetric = decision.metricIds[0];
  const drill = useMetricDrillDown(primaryMetric ?? "");
  const meta = PRIORITY_META[decision.priority];

  return (
    <article
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-[var(--ds-radius-xl)] border shadow-[var(--cab-shadow-sm)] ${meta.surface}`}
      data-testid="report-decision-card"
      data-decision-id={decision.id}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${meta.accent}`} aria-hidden />

      <div className="flex flex-col gap-4 p-4 pl-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap">
            <ReportDecisionPriority priority={decision.priority} />
            <ReportTrustBadge trust={decision.trust} compact />
          </div>

          <h3 className="text-base font-semibold leading-snug text-[color:var(--cab-text)]">{decision.title}</h3>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
              Perché
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--cab-text)]">
              {decision.aiExplanation ?? decision.rationale}
            </p>
          </div>

          {decision.sourceReportRunId ? (
            <p className="text-[10px] text-[color:var(--cab-text-muted)]">Origine: Business Report</p>
          ) : null}
        </div>

        <div className="min-w-0 lg:w-72 lg:shrink-0">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)] md:sr-only">
            Dati di supporto
          </p>
          <div className="hidden md:block">
            <ReportDecisionEvidence evidence={decision.evidence} />
          </div>
          <div className="md:hidden">
            <ReportDecisionEvidence evidence={decision.evidence} collapsible />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_20%,transparent)] px-4 py-3 pl-5 flex-nowrap sm:flex-wrap">
        <ReportDecisionStatus status={decision.status} canWrite={canWrite} onChange={onStatusChange} />
        {drill.supported ? (
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-3 text-xs font-medium text-[color:var(--cab-primary)] shadow-sm transition hover:bg-[color:var(--cab-surface-muted)]"
            onClick={() => drill.open()}
            data-testid="report-decision-drilldown"
          >
            Approfondisci
            <span className="ml-1" aria-hidden>
              →
            </span>
          </button>
        ) : null}
      </div>
    </article>
  );
}
