"use client";

import type { AgendaViewMode } from "@/lib/navigation/agenda-links";
import { Tooltip } from "@/components/ui";

import {
  dsFocus,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
} from "@/lib/ui/design-system";

const TAB_LABELS: Record<AgendaViewMode, string> = {
  day: "Giorno",
  week: "Settimana",
  month: "Mese",
  gantt: "Gantt",
  insight: "Insight",
};

const TAB_HINTS: Partial<Record<AgendaViewMode, string>> = {
  gantt: "Timeline per lavorazione — sola consultazione",
  insight: "Suggerimenti operativi derivati dalla pianificazione",
};

const TAB_ORDER: AgendaViewMode[] = ["day", "week", "month", "gantt", "insight"];

export function AgendaViewTabs({
  viewMode,
  onViewModeChange,
}: {
  viewMode: AgendaViewMode;
  onViewModeChange: (mode: AgendaViewMode) => void;
}) {
  return (
    <div role="tablist" aria-label="Vista agenda" className={`${dsSegmentedWrap} shrink-0`}>
      {TAB_ORDER.map((v) => {
        const active = viewMode === v;
        const btn = (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            className={`min-h-9 px-2.5 py-1.5 text-xs font-semibold sm:px-3 sm:text-sm ${dsFocus} ${
              active ? dsSegmentedBtnOn : dsSegmentedBtnOff
            }`}
            onClick={() => onViewModeChange(v)}
          >
            {TAB_LABELS[v]}
          </button>
        );
        const hint = TAB_HINTS[v];
        return hint ? (
          <Tooltip key={v} content={hint}>
            {btn}
          </Tooltip>
        ) : (
          btn
        );
      })}
    </div>
  );
}
