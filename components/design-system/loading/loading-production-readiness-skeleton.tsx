"use client";

import { memo } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { SkeletonBlock, SkeletonCard } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingProductionReadinessSkeletonProps = {
  className?: string;
  /** Solo area contenuto (header già visibile). */
  embedded?: boolean;
};

/** Production readiness: esito + griglia blockers/warnings. */
export const LoadingProductionReadinessSkeleton = memo(function LoadingProductionReadinessSkeleton({
  className = "",
  embedded = false,
}: LoadingProductionReadinessSkeletonProps) {
  return (
    <div
      className={`${dsStackPage} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento production readiness"
    >
      {!embedded ? <SkeletonBlock className={SKELETON_MIN_HEIGHT.pageHeader} /> : null}
      <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.productionReadinessOutcome} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.productionReadinessCard} />
        <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.productionReadinessCard} />
      </div>
    </div>
  );
});
