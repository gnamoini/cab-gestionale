"use client";

import { memo } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { SkeletonBlock, SkeletonCard } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingClientDetailSkeleton = memo(function LoadingClientDetailSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`${dsStackPage} ${className}`.trim()} role="status" aria-busy="true" aria-label="Caricamento dettaglio">
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.pageHeader} />
      <SkeletonCard minHeightClass="min-h-[12rem]" />
      <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.cardWidget} />
    </div>
  );
});
