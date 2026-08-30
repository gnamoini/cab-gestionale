"use client";

import { formatReportMetricValue } from "@/lib/report/metrics/format-report-metric-value";
import { ReportTrustBadge } from "@/components/report/bi-center/report-trust-badge";
import type { ReportDrillDownHeader, ReportDrillDownCompositionComponent } from "@/lib/report/drilldown/types";

export function ReportDrillDownHeaderView({ header }: { header: ReportDrillDownHeader }) {
  return (
    <div className="space-y-2 pb-1">
      <div className="flex items-start justify-between gap-2 flex-nowrap sm:flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[color:var(--cab-text)]">{header.title}</h2>
          <p className="text-sm text-[color:var(--cab-text-muted)]">{header.periodLabel}</p>
        </div>
        <ReportTrustBadge trust={header.trust} />
      </div>
      {header.metricValueLabel ? (
        <p className="text-sm">
          Valore metrica: <span className="font-medium tabular-nums">{header.metricValueLabel}</span>
        </p>
      ) : null}
      {header.recordCount != null ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">
          {header.recordCount} {header.recordCount === 1 ? "risultato" : "risultati"}
        </p>
      ) : null}
      {header.compareLabel ? (
        <p className="text-sm text-[color:var(--cab-text-muted)]">{header.compareLabel}</p>
      ) : null}
      {header.parityNote ? (
        <p className="text-xs text-[color:var(--cab-text-muted)]">{header.parityNote}</p>
      ) : null}
    </div>
  );
}

function formatComponentValue(value: number): string {
  return formatReportMetricValue(value, "currency");
}

export function ReportDrillDownCompositionView({
  components,
}: {
  components: ReportDrillDownCompositionComponent[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[color:var(--cab-text-muted)]">
        Stima operativa — non rappresenta un conto economico ufficiale.
      </p>
      <ul className="space-y-3">
        {components.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)]/40 p-3"
          >
            <div className="flex items-center justify-between gap-2 flex-nowrap sm:flex-wrap">
              <span className="font-medium text-[color:var(--cab-text)]">{c.label}</span>
              <ReportTrustBadge trust={c.trust} />
            </div>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatComponentValue(c.value)}</p>
            <p className="mt-1 text-xs text-[color:var(--cab-text-muted)]">
              {c.source} · {c.formulaId}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
