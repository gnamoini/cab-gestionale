"use client";

import { memo } from "react";
import { SkeletonCard } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

/** @deprecated Usare `SkeletonCard` con minHeight toolbar. */
export const LoadingToolbarSkeleton = memo(function LoadingToolbarSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className={`p-0 ${className}`.trim()} />;
});
