"use client";

import { memo } from "react";
import { CONTROL_TOWER_KPI_WINDOW_LABEL } from "@/lib/dashboard/control-tower-constants";
import { SkeletonBlock } from "./skeleton-primitives";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_GRID, SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingDashboardSkeleton = memo(function LoadingDashboardSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento dashboard">
      <SkeletonShellCard bodyMinHeightClass="min-h-[7.5rem]" />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardPromemoria} />
      <span className="sr-only">{CONTROL_TOWER_KPI_WINDOW_LABEL}</span>
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidgetSm} />
      <SkeletonBlock className={`w-full ${SKELETON_MIN_HEIGHT.kpiRow}`} />
      <div className={SKELETON_GRID.dashboardWidgetsLg}>
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidgetSm} />
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidget} />
      </div>
      <div className={SKELETON_GRID.dashboardWidgetsMobile}>
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidgetSm} />
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidget} />
      </div>
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardPromemoria} />
    </LoadingListPageShell>
  );
});
