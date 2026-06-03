"use client";

import { memo } from "react";
import { SkeletonCard, SkeletonTable } from "./skeleton-primitives";
import { SKELETON_GRID, SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingPreventiviListSkeleton = memo(function LoadingPreventiviListSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`.trim()} role="status" aria-busy="true" aria-label="Caricamento preventivi">
      <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="p-0" />
      <SkeletonTable visibilityClass="hidden xl:block" wrapClassName="mt-4" />
      <div className={SKELETON_GRID.preventiviMobileStack} aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} minHeightClass={SKELETON_MIN_HEIGHT.cardMobile} />
        ))}
      </div>
    </div>
  );
});
