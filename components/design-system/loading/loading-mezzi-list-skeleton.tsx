"use client";

import { memo } from "react";
import { SkeletonCard, SkeletonTable } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingMezziListSkeletonProps = {
  withToolbar?: boolean;
  className?: string;
};

export const LoadingMezziListSkeleton = memo(function LoadingMezziListSkeleton({
  withToolbar = true,
  className = "",
}: LoadingMezziListSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`.trim()} role="status" aria-busy="true" aria-label="Caricamento mezzi">
      {withToolbar ? <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="p-0" /> : null}
      <SkeletonTable visibilityClass="hidden xl:block" minHeightClass={SKELETON_MIN_HEIGHT.tableCompact} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} minHeightClass={SKELETON_MIN_HEIGHT.cardMobile} className="min-w-0 h-full" />
        ))}
      </div>
    </div>
  );
});
