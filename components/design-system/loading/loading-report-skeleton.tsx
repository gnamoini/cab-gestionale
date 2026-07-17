
import { memo } from "react";
import { SkeletonBlock } from "./skeleton-primitives";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingReportSkeleton = memo(function LoadingReportSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento report">
      <SkeletonBlock className="mb-0 min-h-[4rem] w-full" />
      <SkeletonBlock className="mb-0 min-h-[5.5rem] w-full" />
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.tabBar} />
      <SkeletonShellCard bodyMinHeightClass="min-h-[12rem]" />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.chartWide} />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.chart} />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop} />
    </LoadingListPageShell>
  );
});
