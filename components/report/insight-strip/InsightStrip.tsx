"use client";

import type { InsightDto } from "@/lib/report/insights/types";
import {
  isValidInsightDrillDownSection,
  resolveInsightDrillDownElementId,
  resolveInsightDrillDownHref,
} from "@/components/report/insight-strip/insight-drill-down-nav";
import { useReportSectionVisibility } from "@/components/report/layout/report-section-visibility-context";

const SEVERITY_CLASS: Record<InsightDto["severity"], string> = {
  critical: "border-destructive/40 bg-destructive/5 text-destructive",
  warning: "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-200",
  info: "border-border bg-muted/40 text-foreground",
};

type InsightStripProps = {
  insights: InsightDto[] | null;
  loading: boolean;
  error: string | null;
};

function InsightStripItem({ insight }: { insight: InsightDto }) {
  const { setOpen } = useReportSectionVisibility();
  const { drillDown } = insight;
  const canNavigate = isValidInsightDrillDownSection(drillDown.targetSection);
  const href = canNavigate ? resolveInsightDrillDownHref(drillDown) : undefined;

  const handleNavigate = () => {
    if (!isValidInsightDrillDownSection(drillDown.targetSection)) return;
    const section = drillDown.targetSection;
    setOpen(section, true);
    const el = document.getElementById(resolveInsightDrillDownElementId(drillDown));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <li
      className={`rounded-md border px-3 py-2 text-sm min-w-0 break-words ${SEVERITY_CLASS[insight.severity]}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <span className="font-medium">{insight.message}</span>
          {insight.trust === "AMBER" ? (
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">Dato parziale</p>
          ) : null}
        </div>
        {canNavigate ? (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault();
              handleNavigate();
            }}
            className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium underline underline-offset-2"
          >
            Vai alla sezione
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function InsightStrip({ insights, loading, error }: InsightStripProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Caricamento insight">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!insights?.length) {
    return <p className="text-sm text-muted-foreground">Nessun insight per il periodo selezionato.</p>;
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Insight analitici">
      {insights.map((insight) => (
        <InsightStripItem key={`${insight.ruleKey}:${insight.ruleVersion}`} insight={insight} />
      ))}
    </ul>
  );
}
