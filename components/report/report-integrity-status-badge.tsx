"use client";

import { Badge, type BadgeTone } from "@/components/design-system/badge";
import { TooltipList } from "@/components/ui";
import {
  buildReportIntegrityTooltipLines,
  deriveReportIntegrityBadgeState,
  reportIntegrityBadgeLabel,
  type ReportIntegrityBadgeView,
} from "@/lib/report/report-integrity-badge-model";

function badgeTone(state: ReturnType<typeof deriveReportIntegrityBadgeState>): BadgeTone {
  switch (state) {
    case "ok":
      return "ok";
    case "degraded":
      return "danger";
    case "partial":
      return "warn";
    case "drift_detected":
      return "info";
  }
}

export function ReportIntegrityStatusBadge({ view }: { view: ReportIntegrityBadgeView }) {
  const state = deriveReportIntegrityBadgeState(view);
  const lines = buildReportIntegrityTooltipLines(view);
  const label = reportIntegrityBadgeLabel(state);
  const tooltipSummary = lines.join(" · ");

  return (
    <TooltipList items={lines}>
      <span
        className="inline-flex min-w-0 shrink-0"
        aria-label={`Integrità dati report: ${label}. ${tooltipSummary}`}
      >
        <Badge tone={badgeTone(state)} className="cursor-default tracking-wide">
          {label}
        </Badge>
      </span>
    </TooltipList>
  );
}
