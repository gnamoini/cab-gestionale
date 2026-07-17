"use client";

import dynamic from "next/dynamic";
import { LoadingCardSkeleton } from "@/components/design-system";
import type { DashboardWidgetId } from "@/lib/dashboard/dashboard-widget-registry";
import { getDashboardWidgetDef } from "@/lib/dashboard/dashboard-widget-registry";
import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";

function widgetSkeleton(minHeight = "min-h-[10rem]") {
  return <LoadingCardSkeleton minHeightClass={minHeight} />;
}

const DashboardOperationalKpiHeaderWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/dashboard-operational-kpi-header-widget").then(
      (m) => m.DashboardOperationalKpiHeaderWidget,
    ),
  { loading: () => widgetSkeleton("min-h-[8rem]") },
);

const DashboardHealthScoreWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/dashboard-health-score-widget").then((m) => m.DashboardHealthScoreWidget),
  { loading: () => widgetSkeleton("min-h-[12rem]") },
);

const DashboardRecentActivityWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/dashboard-recent-activity-widget").then(
      (m) => m.DashboardRecentActivityWidget,
    ),
  { loading: () => widgetSkeleton("min-h-[14rem]") },
);

const DashboardLocalNotesWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/dashboard-local-notes-widget").then((m) => m.DashboardLocalNotesWidget),
  { loading: () => widgetSkeleton("min-h-[12rem]") },
);

const DashboardRecentLavorazioniWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/dashboard-recent-lavorazioni-widget").then(
      (m) => m.DashboardRecentLavorazioniWidget,
    ),
  { loading: () => widgetSkeleton() },
);

const DashboardRecentRicambiWidget = dynamic(
  () =>
    import("@/components/dashboard/widgets/dashboard-recent-ricambi-widget").then((m) => m.DashboardRecentRicambiWidget),
  { loading: () => widgetSkeleton() },
);

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
