"use client";

import type { ReactNode } from "react";
import {
  HealthScoreBreakdownBody,
  HealthScoreSummary,
  HealthScoreSummarySkeleton,
} from "@/components/dashboard/dashboard-health-score-ring";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";
import { wrapDashboardWidget } from "@/components/dashboard/dashboard-widget-shell";
import { useOperationalHealthScore } from "@/src/hooks/view/use-operational-health-score";
import { dsSkeletonPulse, dsTypoBody } from "@/lib/ui/design-system";

function InsufficientHealthScoreBody() {
  return (
    <p className={`${dsTypoBody} text-[color:var(--cab-text-muted)]`}>
      Dati insufficienti per calcolare lo stato operativo in questo periodo.
    </p>
  );
}

export function DashboardHealthScoreWidget({ def }: { def: DashboardWidgetDefinition }) {
  const { score, isLoading, insufficientData } = useOperationalHealthScore();

  let body: ReactNode;
  let subtitle: string | undefined;
  let headerLeadingActions: ReactNode;

  if (isLoading) {
    body = (
      <div className="space-y-2" aria-hidden>
        <div className={`h-3 w-40 ${dsSkeletonPulse}`} />
        <div className={`h-3 w-full max-w-md ${dsSkeletonPulse}`} />
        <div className={`h-3 w-5/6 max-w-sm ${dsSkeletonPulse}`} />
      </div>
    );
    headerLeadingActions = <HealthScoreSummarySkeleton />;
  } else if (insufficientData || !score) {
    body = <InsufficientHealthScoreBody />;
    subtitle = "Dati insufficienti";
    headerLeadingActions = (
      <HealthScoreSummary
        score={null}
        label="Dati insufficienti"
        tone="neutral"
        insufficientData
        hideTitle
      />
    );
  } else {
    body = <HealthScoreBreakdownBody score={score} />;
    headerLeadingActions = (
      <HealthScoreSummary score={score.score} label={score.label} tone={score.tone} hideTitle />
    );
  }

  return wrapDashboardWidget(def, body, { subtitle, headerLeadingActions, headerLeadingActionsInteractive: false });
}
