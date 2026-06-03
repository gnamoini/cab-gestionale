"use client";

import { memo } from "react";
import { SkeletonCard, SkeletonTable } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingMezziListSkeleton = memo(function LoadingMezziListSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`.trim()} role="status" aria-busy="true" aria-label="Caricamento mezzi">
      <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="p-0" />
      <SkeletonTable visibilityClass="hidden xl:block" minHeightClass={SKELETON_MIN_HEIGHT.tableCompact} />
    </div>
  );
});
