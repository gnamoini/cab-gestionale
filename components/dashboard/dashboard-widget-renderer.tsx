"use client";

import type { DashboardWidgetId } from "@/lib/dashboard/dashboard-widget-registry";
import { DashboardLavorazioniKpiWidget } from "@/components/dashboard/widgets/dashboard-lavorazioni-kpi-widget";
import { DashboardMagazzinoKpiWidget } from "@/components/dashboard/widgets/dashboard-magazzino-kpi-widget";
import { DashboardLocalNotesWidget } from "@/components/dashboard/widgets/dashboard-local-notes-widget";
import { DashboardRecentLavorazioniWidget } from "@/components/dashboard/widgets/dashboard-recent-lavorazioni-widget";
import { DashboardRecentRicambiWidget } from "@/components/dashboard/widgets/dashboard-recent-ricambi-widget";

export function DashboardWidgetRenderer({ id }: { id: DashboardWidgetId }) {
  switch (id) {
    case "lavorazioni-kpi":
      return <DashboardLavorazioniKpiWidget />;
    case "magazzino-kpi":
      return <DashboardMagazzinoKpiWidget />;
    case "local-notes":
      return <DashboardLocalNotesWidget />;
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
