"use client";

import { memo } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { CONTROL_TOWER_KPI_WINDOW_LABEL } from "@/lib/dashboard/control-tower-constants";
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
      <span className="sr-only">{CONTROL_TOWER_KPI_WINDOW_LABEL}</span>
      <SkeletonDashboardWidget variant="kpi" />
      <SkeletonBlock className={`w-full ${SKELETON_MIN_HEIGHT.kpiRow}`} />
      <SkeletonDashboardWidget variant="kpi" />
      <SkeletonDashboardWidget variant="feed" />
      <SkeletonDashboardWidget variant="promemoria" />
    </div>
  );
});
