"use client";

import { LoadingCardSkeleton } from "@/components/design-system";
import { DashboardWidgetRenderer } from "@/components/dashboard/dashboard-widget-renderer";
import { useVisibleDashboardWidgets } from "@/lib/dashboard/use-visible-dashboard-widgets";

export function DashboardWidgetGrid() {
  const { widgets, isLoading } = useVisibleDashboardWidgets();

  if (isLoading) {
    return <LoadingCardSkeleton minHeightClass="min-h-[10rem]" />;
  }

  return (
    <div className="grid min-w-0 gap-4 cab-shell-desktop:grid-cols-2">
      {widgets.map((w) => (
        <div
          key={w.id}
          className={w.layout === "full" ? "min-w-0 cab-shell-desktop:col-span-2" : "min-w-0"}
        >
          <DashboardWidgetRenderer id={w.id} />
        </div>
      ))}
    </div>
  );
}
