"use client";

import { DashboardOperationalKpiHeaderWidget } from "@/components/dashboard/widgets/dashboard-operational-kpi-header-widget";
import { DashboardHealthScoreWidget } from "@/components/dashboard/widgets/dashboard-health-score-widget";
import { DashboardRecentActivityWidget } from "@/components/dashboard/widgets/dashboard-recent-activity-widget";
import { DashboardLocalNotesWidget } from "@/components/dashboard/widgets/dashboard-local-notes-widget";
import { DashboardRecentLavorazioniWidget } from "@/components/dashboard/widgets/dashboard-recent-lavorazioni-widget";
import { DashboardRecentRicambiWidget } from "@/components/dashboard/widgets/dashboard-recent-ricambi-widget";
import type { DashboardWidgetId } from "@/lib/dashboard/dashboard-widget-registry";
import { getDashboardWidgetDef } from "@/lib/dashboard/dashboard-widget-registry";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";

export function DashboardWidgetRenderer({ id }: { id: DashboardWidgetId }) {
  const def = getDashboardWidgetDef(id);
  if (!def) {
    switch (id) {
      case "recent-lavorazioni":
        return <DashboardRecentLavorazioniWidget />;
      case "recent-ricambi":
        return <DashboardRecentRicambiWidget />;
      default:
        if (process.env.NODE_ENV !== "production") {
          console.warn("[dashboard-widget] unknown widget id:", id);
        }
        return null;
    }
  }

  return <DashboardWidgetRendererKnown def={def} id={id} />;
}

function DashboardWidgetRendererKnown({
  id,
  def,
}: {
  id: DashboardWidgetId;
  def: DashboardWidgetDefinition;
}) {
  switch (id) {
    case "operational-kpi-header":
      return <DashboardOperationalKpiHeaderWidget def={def} />;
    case "health-score":
      return <DashboardHealthScoreWidget def={def} />;
    case "recent-activity":
      return <DashboardRecentActivityWidget def={def} />;
    case "local-notes":
      return <DashboardLocalNotesWidget def={def} />;
    default:
      return null;
  }
}
