"use client";

import { memo } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { SkeletonBlock, SkeletonDashboardWidget } from "./skeleton-primitives";
import { SKELETON_GRID, SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingDashboardSkeleton = memo(function LoadingDashboardSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`${dsStackPage} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento dashboard"
    >
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.pageHeader} />
      <SkeletonDashboardWidget variant="welcome" />
      <div className={SKELETON_GRID.dashboardWidgetsMobile}>
        <SkeletonDashboardWidget variant="kpi" />
        <SkeletonDashboardWidget variant="kpi" />
        <SkeletonDashboardWidget variant="promemoria" />
      </div>
      <div className={SKELETON_GRID.dashboardWidgetsLg}>
        <SkeletonDashboardWidget variant="promemoria" />
        <SkeletonDashboardWidget variant="kpi" />
      </div>
      <SkeletonBlock className={`w-full ${SKELETON_MIN_HEIGHT.kpiRow}`} />
      <SkeletonBlock className="min-h-[5.5rem] w-full" />
      <div className={`${SKELETON_GRID.dashboardWidgetsLg} mt-0`}>
        <SkeletonDashboardWidget variant="feed" />
        <SkeletonDashboardWidget variant="feed" />
      </div>
    </div>
  );
});
