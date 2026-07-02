"use client";

import type { DashboardWidgetId } from "@/lib/dashboard/dashboard-widget-registry";
import { DashboardOperationalKpiHeaderWidget } from "@/components/dashboard/widgets/dashboard-operational-kpi-header-widget";
import { DashboardAlertsWidget } from "@/components/dashboard/widgets/dashboard-alerts-widget";
import { DashboardLavorazioniKpiWidget } from "@/components/dashboard/widgets/dashboard-lavorazioni-kpi-widget";
import { DashboardMagazzinoKpiWidget } from "@/components/dashboard/widgets/dashboard-magazzino-kpi-widget";
import { DashboardLocalNotesWidget } from "@/components/dashboard/widgets/dashboard-local-notes-widget";
import { DashboardAdminBacklogWidget } from "@/components/dashboard/widgets/dashboard-admin-backlog-widget";
import { DashboardRecentActivityWidget } from "@/components/dashboard/widgets/dashboard-recent-activity-widget";
import { DashboardOperationalCalendarWidget } from "@/components/dashboard/widgets/dashboard-operational-calendar-widget";
import { DashboardRecentLavorazioniWidget } from "@/components/dashboard/widgets/dashboard-recent-lavorazioni-widget";
import { DashboardRecentRicambiWidget } from "@/components/dashboard/widgets/dashboard-recent-ricambi-widget";

export function DashboardWidgetRenderer({ id }: { id: DashboardWidgetId }) {
  switch (id) {
    case "operational-kpi-header":
      return <DashboardOperationalKpiHeaderWidget />;
    case "alerts-anomalies":
      return <DashboardAlertsWidget />;
    case "lavorazioni-kpi":
      return <DashboardLavorazioniKpiWidget />;
    case "magazzino-kpi":
      return <DashboardMagazzinoKpiWidget />;
    case "admin-backlog":
      return <DashboardAdminBacklogWidget />;
    case "recent-activity":
      return <DashboardRecentActivityWidget />;
    case "operational-calendar":
      return <DashboardOperationalCalendarWidget />;
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
