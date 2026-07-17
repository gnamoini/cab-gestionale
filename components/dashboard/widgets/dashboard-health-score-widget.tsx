"use client";

import { memo, useEffect, useRef, useState, type ReactNode } from "react";
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

function DashboardHealthScoreWidgetLoaded({ def }: { def: DashboardWidgetDefinition }) {
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

export function DashboardHealthScoreWidget({ def }: { def: DashboardWidgetDefinition }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fetchEnabled, setFetchEnabled] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || fetchEnabled) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setFetchEnabled(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchEnabled]);

  if (!fetchEnabled) {
    return (
      <div ref={rootRef}>
        {wrapDashboardWidget(
          def,
          <div className="space-y-2" aria-hidden>
            <div className={`h-3 w-40 ${dsSkeletonPulse}`} />
            <div className={`h-3 w-full max-w-md ${dsSkeletonPulse}`} />
          </div>,
          { headerLeadingActions: <HealthScoreSummarySkeleton />, headerLeadingActionsInteractive: false },
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef}>
      <DashboardHealthScoreWidgetLoaded def={def} />
    </div>
  );
}
