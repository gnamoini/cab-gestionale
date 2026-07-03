"use client";

import Link from "next/link";
import { AgendaListEmpty } from "@/components/workshop-schedule/agenda-session-list";
import type { PlannerInsight } from "@/lib/workshop-schedule/intelligence/insights/types";
import { buildAgendaHref } from "@/lib/navigation/agenda-links";
import {
  INSIGHT_SEVERITY_BADGE_CLASS,
  INSIGHT_SEVERITY_LABELS,
  INSIGHT_TYPE_LABELS,
} from "@/lib/workshop-schedule/agenda-ui-labels";
import { dsBtnGhost, dsFocus, dsTypoCaption } from "@/lib/ui/design-system";

const SEVERITY_PANEL_CLASS: Record<PlannerInsight["severity"], string> = {
  high: "border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-surface))]",
  medium:
    "border-[color:color-mix(in_srgb,var(--cab-warning)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-warning)_8%,var(--cab-surface))]",
  low: "border-[color:var(--cab-border)] bg-[var(--cab-surface-2)]",
};

export function AgendaInsightsPanel({
  insights,
  onDeepLink,
}: {
  insights: readonly PlannerInsight[];
  onDeepLink?: (insight: PlannerInsight) => void;
}) {
  if (insights.length === 0) {
    return (
      <AgendaListEmpty message="Nessun insight al momento — la pianificazione è in equilibrio." />
    );
  }

  return (
    <ul className="m-0 list-none space-y-2 p-0" aria-label="Insight pianificazione">
      {insights.map((insight, i) => {
        const date = insight.relatedDates?.[0];
        const href = date ? buildAgendaHref({ date, view: "day", panel: "insights" }) : undefined;
        return (
          <li
            key={`${insight.type}-${i}`}
            className={`rounded-[var(--ds-radius-lg)] border p-3 text-xs shadow-[var(--cab-shadow-sm)] ${SEVERITY_PANEL_CLASS[insight.severity]}`}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-semibold text-[color:var(--cab-text)]">
                {INSIGHT_TYPE_LABELS[insight.type]}
              </span>
              <span className={INSIGHT_SEVERITY_BADGE_CLASS[insight.severity]}>
                {INSIGHT_SEVERITY_LABELS[insight.severity]}
              </span>
            </div>
            <p className="mt-2 leading-relaxed text-[color:var(--cab-text-muted)]">{insight.message}</p>
            {href ? (
              <Link
                href={href}
                className={`mt-2 inline-flex ${dsBtnGhost} ${dsFocus}`}
                onClick={() => onDeepLink?.(insight)}
              >
                Approfondisci
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
