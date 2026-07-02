"use client";

import { DashboardTasksPanel } from "@/components/dashboard/dashboard-tasks-panel";
import { dsDashboardWidgetTitle, dsSurfacePanel } from "@/lib/ui/design-system";

const panelCardClass = `${dsSurfacePanel} flex min-h-[220px] min-w-0 max-w-full flex-col p-4`;

export function DashboardLocalNotesWidget() {
  return (
    <div className={panelCardClass}>
      <h2 className={`${dsDashboardWidgetTitle} min-w-0 shrink-0 truncate`}>Note</h2>
      <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardTasksPanel />
      </div>
    </div>
  );
}
