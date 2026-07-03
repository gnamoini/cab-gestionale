"use client";

import { LoadingCardSkeleton } from "@/components/design-system";
import { DashboardWidgetRenderer } from "@/components/dashboard/dashboard-widget-renderer";
import {
  ControlTowerMetricsProvider,
  useControlTowerContext,
} from "@/components/dashboard/control-tower-metrics-provider";
import {
  DASHBOARD_SECTION_ORDER,
  groupVisibleWidgetsBySection,
  type DashboardWidgetSection,
} from "@/lib/dashboard/dashboard-widget-registry";
import { dsStackPage } from "@/lib/ui/design-system";

function DashboardControlTowerLayoutInner() {
  const { visibleWidgets, slices, isLoading, canFatturazione } = useControlTowerContext();
  const bySection = groupVisibleWidgetsBySection(visibleWidgets);

  if (isLoading && visibleWidgets.length === 0) {
    return <LoadingCardSkeleton minHeightClass="min-h-[12rem]" />;
  }

  function shouldRenderSection(section: DashboardWidgetSection): boolean {
    if (section === "alerts") {
      return (slices?.alerts.items.length ?? 0) > 0;
    }
    if (section === "admin") {
      return canFatturazione;
    }
    return (bySection.get(section)?.length ?? 0) > 0;
  }

  return (
    <div className={`${dsStackPage} min-w-0`}>
      {DASHBOARD_SECTION_ORDER.map((section) => {
        if (!shouldRenderSection(section)) return null;
        const widgets = bySection.get(section) ?? [];
        if (widgets.length === 0) return null;
        return (
          <div key={section} className="grid min-w-0 gap-4">
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
      })}
    </div>
  );
}

export function DashboardControlTowerLayout() {
  return (
    <ControlTowerMetricsProvider>
      <DashboardControlTowerLayoutInner />
    </ControlTowerMetricsProvider>
  );
}
