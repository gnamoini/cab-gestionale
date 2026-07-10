"use client";

import { useState } from "react";
import { Tooltip } from "@/components/ui";

import type { HeatmapCell } from "@/lib/workshop-schedule/intelligence/heatmap/types";
import type { WeeklyLoadSnapshot } from "@/lib/workshop-schedule/intelligence/weekly-load/types";
import type { AutoSchedulePlan } from "@/lib/workshop-schedule/intelligence/auto-scheduler/types";
import type { PlannerInsight } from "@/lib/workshop-schedule/intelligence/insights/types";
import { AgendaHeatmapGrid } from "@/components/workshop-schedule/agenda-heatmap-grid";
import { AgendaWeeklyLoadWidget } from "@/components/workshop-schedule/agenda-weekly-load-widget";
import { AgendaAutoSchedulerPanel } from "@/components/workshop-schedule/agenda-auto-scheduler-panel";
import { AgendaInsightsPanel } from "@/components/workshop-schedule/agenda-insights-panel";
import {
  dsAccentToggleOn,
  dsFocus,
  dsSectionTitle,
  dsSegmentedBtnOff,
  dsSegmentedBtnOn,
  dsSegmentedWrap,
  dsSurfacePanelStatic,
  dsTypoCaption,
} from "@/lib/ui/design-system";

type PanelId = "heatmap" | "weeklyLoad" | "autoScheduler" | "insights";

const PANELS: { id: PanelId; label: string; hint: string }[] = [
  { id: "heatmap", label: "Heatmap", hint: "Saturazione per fascia oraria — clic per filtrare il giorno" },
  { id: "weeklyLoad", label: "Carico", hint: "Simulazione carico settimanale (solo preview)" },
  { id: "autoScheduler", label: "Proposta", hint: "Sessioni suggerite — conferma manuale obbligatoria" },
  { id: "insights", label: "Insight", hint: "Analisi derivata dalla pianificazione corrente" },
];

export function AgendaIntelligenceSidebar({
  heatmapCells,
  weeklyLoad,
  autoSchedulePlan,
  insights,
  selectedDate,
  selectedHourSlot,
  onHeatmapCellClick,
  onConfirmAutoSession,
  autoConfirming,
  defaultPanel = "insights",
}: {
  heatmapCells: readonly HeatmapCell[];
  weeklyLoad: WeeklyLoadSnapshot;
  autoSchedulePlan: AutoSchedulePlan | null;
  insights: readonly PlannerInsight[];
  selectedDate?: string | null;
  selectedHourSlot?: number | null;
  onHeatmapCellClick?: (cell: HeatmapCell) => void;
  onConfirmAutoSession?: (session: AutoSchedulePlan["suggestedSessions"][0]) => void;
  autoConfirming?: boolean;
  defaultPanel?: PanelId;
}) {
  const [activePanel, setActivePanel] = useState<PanelId>(defaultPanel);
  const [heatmapOverlay, setHeatmapOverlay] = useState(defaultPanel === "heatmap");

  return (
    <aside aria-label="Intelligence pianificazione" className={`${dsSurfacePanelStatic} min-h-0 gap-3 p-3 sm:p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={dsSectionTitle}>Planner</p>
          <p className={`mt-0.5 ${dsTypoCaption}`}>Analisi read-only sulla pianificazione</p>
        </div>
        <Tooltip content="Mostra heatmap sopra il pannello attivo">
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-[var(--ds-radius-lg)] border px-2 py-1.5 text-xs font-semibold ${dsFocus} ${
              heatmapOverlay ? dsAccentToggleOn : "border-[color:var(--cab-border)]"
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={heatmapOverlay}
              onChange={(e) => {
                setHeatmapOverlay(e.target.checked);
                if (e.target.checked) setActivePanel("heatmap");
              }}
            />
            Heatmap
          </label>
        </Tooltip>
      </div>

      <div className={`${dsSegmentedWrap} grid grid-cols-2 gap-1`}>
        {PANELS.map((p) => (
          <Tooltip key={p.id} content={p.hint}>
            <button
              type="button"
              className={`min-h-9 w-full px-2 py-1.5 text-xs font-semibold ${dsFocus} ${
                activePanel === p.id ? dsSegmentedBtnOn : dsSegmentedBtnOff
              }`}
              onClick={() => setActivePanel(p.id)}
            >
              {p.label}
            </button>
          </Tooltip>
        ))}
      </div>

      {(activePanel === "heatmap" || heatmapOverlay) && (
        <AgendaHeatmapGrid
          cells={heatmapCells}
          selectedDate={selectedDate}
          selectedHourSlot={selectedHourSlot}
          onCellClick={onHeatmapCellClick}
        />
      )}

      {activePanel === "weeklyLoad" ? <AgendaWeeklyLoadWidget snapshot={weeklyLoad} /> : null}
      {activePanel === "autoScheduler" ? (
        <AgendaAutoSchedulerPanel
          plan={autoSchedulePlan}
          onConfirmSession={onConfirmAutoSession}
          confirming={autoConfirming}
        />
      ) : null}
      {activePanel === "insights" ? <AgendaInsightsPanel insights={insights} /> : null}
    </aside>
  );
}
