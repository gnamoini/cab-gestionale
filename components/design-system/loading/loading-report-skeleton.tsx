"use client";

import { memo } from "react";
import { dsStackPage, dsSurfacePanel } from "@/lib/ui/design-system";
import { SkeletonBlock, SkeletonCard, SkeletonChart } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingReportSkeleton = memo(function LoadingReportSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`${dsStackPage} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento report"
    >
      <div className={`${dsSurfacePanel} mb-4 min-h-[4rem] p-0`} aria-hidden>
        <SkeletonBlock className="h-full min-h-[4rem] w-full rounded-[inherit]" />
      </div>
      <SkeletonBlock className="mb-4 min-h-[5.5rem] w-full" />
      <SkeletonBlock className="mb-4 min-h-9 w-full max-w-3xl" />
      <div className="space-y-4">
        <SkeletonCard minHeightClass="min-h-[12rem]" />
        <SkeletonChart wide />
        <SkeletonChart />
        <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.tableDesktop} />
      </div>
    </div>
  );
});
