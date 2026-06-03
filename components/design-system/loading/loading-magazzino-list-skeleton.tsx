"use client";

import { memo } from "react";
import { SkeletonCard, SkeletonTable } from "./skeleton-primitives";
import { SKELETON_GRID, SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingMagazzinoListSkeletonProps = {
  withToolbar?: boolean;
  className?: string;
};

export const LoadingMagazzinoListSkeleton = memo(function LoadingMagazzinoListSkeleton({
  withToolbar = true,
  className = "",
}: LoadingMagazzinoListSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`.trim()} role="status" aria-busy="true" aria-label="Caricamento magazzino">
      {withToolbar ? <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="p-0" /> : null}
      <SkeletonTable visibilityClass="hidden xl:block" />
      <div className={`${SKELETON_GRID.lavorazioniMobileStack} xl:hidden`} aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} minHeightClass={SKELETON_MIN_HEIGHT.cardMobile} />
        ))}
      </div>
    </div>
  );
});
