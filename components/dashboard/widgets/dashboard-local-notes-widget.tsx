"use client";

import type { DashboardWidgetDefinition } from "@/lib/dashboard/dashboard-widget-registry";
import { DashboardDiaryPanel } from "@/components/dashboard/dashboard-diary-panel";
import { wrapDashboardWidget } from "@/components/dashboard/dashboard-widget-shell";

export function DashboardLocalNotesWidget({ def }: { def: DashboardWidgetDefinition }) {
  return wrapDashboardWidget(def, <DashboardDiaryPanel />);
}
