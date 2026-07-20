"use client";

import { memo, useMemo } from "react";
import { DashboardWidgetRenderer } from "@/components/dashboard/dashboard-widget-renderer";
import {
  ControlTowerMetricsProvider,
  useControlTowerContext,
} from "@/components/dashboard/control-tower-metrics-provider";
import {
  groupVisibleWidgetsBySection,
  resolveDashboardSectionOrder,
} from "@/lib/dashboard/dashboard-widget-registry";
import { useGestionaleShellTier } from "@/context/gestionale-shell-layout-context";
import { DashboardPageStructure } from "@/components/dashboard/dashboard-page-structure";
import { dsStackPage } from "@/lib/ui/design-system";

const DashboardControlTowerLayoutInner = memo(function DashboardControlTowerLayoutInner() {
  const { visibleWidgets, isLoading } = useControlTowerContext();
  const { isCompactShell } = useGestionaleShellTier();
  const sectionOrder = resolveDashboardSectionOrder(isCompactShell);
  const bySection = useMemo(
    () => groupVisibleWidgetsBySection(visibleWidgets, sectionOrder),
    [visibleWidgets, sectionOrder],
  );

  if (isLoading && visibleWidgets.length === 0) {
    return <DashboardPageStructure mode="skeleton" scope="content" />;
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
});

export function DashboardControlTowerLayout() {
  return (
    <ControlTowerMetricsProvider>
      <DashboardControlTowerLayoutInner />
    </ControlTowerMetricsProvider>
  );
}
