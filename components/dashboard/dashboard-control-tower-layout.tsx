"use client";

import { LoadingCardSkeleton } from "@/components/design-system";
import { DashboardWidgetRenderer } from "@/components/dashboard/dashboard-widget-renderer";
import {
  ControlTowerMetricsProvider,
  useControlTowerContext,
} from "@/components/dashboard/control-tower-metrics-provider";
import {
  groupVisibleWidgetsBySection,
  resolveDashboardSectionOrder,
} from "@/lib/dashboard/dashboard-widget-registry";
import { useGestionaleShellLayout } from "@/context/gestionale-shell-layout-context";
import { dsStackPage } from "@/lib/ui/design-system";

function DashboardControlTowerLayoutInner() {
  const { visibleWidgets, isLoading } = useControlTowerContext();
  const { isCompactShell } = useGestionaleShellLayout();
  const sectionOrder = resolveDashboardSectionOrder(isCompactShell);
  const bySection = groupVisibleWidgetsBySection(visibleWidgets, sectionOrder);

  if (isLoading && visibleWidgets.length === 0) {
    return <LoadingCardSkeleton minHeightClass="min-h-[12rem]" />;
  }

  return (
    <div className={`${dsStackPage} min-w-0`}>
      {sectionOrder.map((section) => {
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
