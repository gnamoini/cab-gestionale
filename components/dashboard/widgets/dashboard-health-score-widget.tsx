"use client";

import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  HealthScoreBreakdownPanel,
  HealthScoreSummary,
  HealthScoreSummarySkeleton,
} from "@/components/dashboard/dashboard-health-score-ring";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";
import { wrapDashboardWidget } from "@/components/dashboard/dashboard-widget-shell";
import { useOperationalHealthScore } from "@/src/hooks/view/use-operational-health-score";
import { useOperationalHealthScoreHistory } from "@/src/hooks/view/use-operational-health-score-history";
import { dsTypoBody } from "@/lib/ui/design-system";

function HealthScoreErrorBody({ message }: { message: string }) {
  return (
    <p className={`${dsTypoBody} text-[color:var(--cab-danger)]`}>
      {message}
    </p>
  );
}

function InsufficientHealthScoreBody() {
  return (
    <p className={`${dsTypoBody} text-[color:var(--cab-text-muted)]`}>
      Dati insufficienti per calcolare lo stato operativo in questo periodo.
    </p>
  );
}

function DashboardHealthScoreWidgetLoaded({ def }: { def: DashboardWidgetDefinition }) {
  const defaultExpanded = !(def.defaultCollapsed ?? false);
  const [historyEnabled, setHistoryEnabled] = useState(defaultExpanded);

  const handleCollapsedChange = useCallback((collapsed: boolean) => {
    if (!collapsed) setHistoryEnabled(true);
  }, []);

  const { score, isLoading, isError, error, insufficientData } = useOperationalHealthScore();
  const { points: historyPoints, isLoading: historyLoading } = useOperationalHealthScoreHistory(historyEnabled);

  let body: ReactNode;
  let subtitle: string | undefined;
  let headerLeadingActions: ReactNode;

  if (isLoading) {
    body = <HealthScoreBreakdownPanel historyLoading={historyEnabled && historyLoading} />;
    headerLeadingActions = <HealthScoreSummarySkeleton />;
  } else if (isError) {
    const message = error ?? "Calcolo Health Score non riuscito.";
    body = (
      <HealthScoreBreakdownPanel
        historyPoints={historyPoints}
        historyLoading={historyLoading}
        insufficientMessage={<HealthScoreErrorBody message={message} />}
      />
    );
    subtitle = "Errore calcolo";
    headerLeadingActions = (
      <HealthScoreSummary score={null} label="Non disponibile" tone="neutral" insufficientData hideTitle />
    );
  } else if (insufficientData || !score) {
    body = (
      <HealthScoreBreakdownPanel
        historyPoints={historyPoints}
        historyLoading={historyLoading}
        insufficientMessage={<InsufficientHealthScoreBody />}
      />
    );
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
    body = (
      <HealthScoreBreakdownPanel
        score={score}
        historyPoints={historyPoints}
        historyLoading={historyLoading}
      />
    );
    headerLeadingActions = (
      <HealthScoreSummary score={score.score} label={score.label} tone={score.tone} hideTitle />
    );
  }

  return wrapDashboardWidget(def, body, {
    subtitle,
    headerLeadingActions,
    headerLeadingActionsInteractive: false,
    onCollapsedChange: handleCollapsedChange,
  });
}

export const DashboardHealthScoreWidget = memo(function DashboardHealthScoreWidget({
  def,
}: {
  def: DashboardWidgetDefinition;
}) {
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
          <HealthScoreBreakdownPanel historyLoading={false} />,
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
});
