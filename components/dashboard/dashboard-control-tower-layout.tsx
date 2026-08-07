"use client";

import { memo, useMemo } from "react";
import { LoadingCardSkeleton } from "@/components/design-system";
import { DashboardWidgetRenderer } from "@/components/dashboard/dashboard-widget-renderer";
import {
  ControlTowerMetricsProvider,
  useControlTowerContext,
} from "@/components/dashboard/control-tower-metrics-provider";
import {
  DASHBOARD_WIDGET_REGISTRY,
  groupVisibleWidgetsBySection,
  resolveDashboardSectionOrder,
  type DashboardWidgetDefinition,
  type DashboardWidgetId,
} from "@/lib/dashboard/dashboard-widget-registry";
import { useGestionaleShellTier } from "@/context/gestionale-shell-layout-context";
import { dsStackPage } from "@/lib/ui/design-system";

const WIDGET_SKELETON_MIN_HEIGHT: Partial<Record<DashboardWidgetId, string>> = {
  "operational-kpi-header": "min-h-[8rem]",
  "health-score": "min-h-[12rem]",
  "recent-activity": "min-h-[14rem]",
  "local-notes": "min-h-[12rem]",
  "recent-lavorazioni": "min-h-[10rem]",
  "recent-ricambi": "min-h-[10rem]",
};

function widgetSkeletonMinHeight(id: DashboardWidgetId): string {
  return WIDGET_SKELETON_MIN_HEIGHT[id] ?? "min-h-[10rem]";
}

function layoutWidgetsWhileLoading(
  visibleWidgets: readonly DashboardWidgetDefinition[],
  staging: boolean,
): DashboardWidgetDefinition[] {
  if (visibleWidgets.length > 0) return [...visibleWidgets];
  return DASHBOARD_WIDGET_REGISTRY.filter((w) => !(w.hideInStaging && staging));
}

function widgetShowsSkeleton(
  id: DashboardWidgetId,
  loading: {
    coreLoading: boolean;
    headerLoading: boolean;
    activityLoading: boolean;
    timesheetLoading: boolean;
    movimentiLoading: boolean;
  },
): boolean {
  switch (id) {
    case "operational-kpi-header":
      return (
        loading.coreLoading ||
        loading.headerLoading ||
        loading.timesheetLoading ||
        loading.movimentiLoading
      );
    case "recent-activity":
      return loading.activityLoading;
    case "health-score":
    case "local-notes":
    case "recent-lavorazioni":
    case "recent-ricambi":
      return loading.coreLoading;
    default:
      return loading.coreLoading;
  }
}

const DashboardControlTowerLayoutInner = memo(function DashboardControlTowerLayoutInner() {
  const {
    visibleWidgets,
    coreLoading,
    headerLoading,
    activityLoading,
    timesheetLoading,
    movimentiLoading,
    staging,
  } = useControlTowerContext();
  const loadingFlags = {
    coreLoading,
    headerLoading,
    activityLoading,
    timesheetLoading,
    movimentiLoading,
  };
  const { isCompactShell } = useGestionaleShellTier();
  const sectionOrder = resolveDashboardSectionOrder(isCompactShell);
  const widgetsForLayout = useMemo(
    () => layoutWidgetsWhileLoading(visibleWidgets, staging),
    [visibleWidgets, staging],
  );
  const bySection = useMemo(
    () => groupVisibleWidgetsBySection(widgetsForLayout, sectionOrder),
    [widgetsForLayout, sectionOrder],
  );

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
                {widgetShowsSkeleton(w.id, loadingFlags) ? (
                  <LoadingCardSkeleton minHeightClass={widgetSkeletonMinHeight(w.id)} />
                ) : (
                  <DashboardWidgetRenderer id={w.id} />
                )}
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
