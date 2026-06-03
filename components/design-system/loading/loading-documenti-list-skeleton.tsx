"use client";

import { memo } from "react";
import { SkeletonCard, SkeletonTable } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingDocumentiListSkeleton = memo(function LoadingDocumentiListSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`.trim()} role="status" aria-busy="true" aria-label="Caricamento documenti">
      <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="p-0" />
      <SkeletonTable minHeightClass={SKELETON_MIN_HEIGHT.tableDocumenti} visibilityClass="hidden xl:block" />
    </div>
  );
});
