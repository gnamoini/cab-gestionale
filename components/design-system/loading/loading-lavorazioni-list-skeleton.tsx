"use client";

import { memo } from "react";
import { gestionaleLavorazioniDenseTableClass } from "@/lib/ui/gestionale-list-table";
import { SkeletonCard, SkeletonTable } from "./skeleton-primitives";
import { SKELETON_GRID, SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingLavorazioniListSkeletonProps = {
  mobileCards?: number;
  /** @deprecated */
  tableRows?: number;
  actionButtonCount?: number;
  withToolbar?: boolean;
  className?: string;
};

export const LoadingLavorazioniListSkeleton = memo(function LoadingLavorazioniListSkeleton({
  mobileCards = 4,
  actionButtonCount: _actionButtonCount = 3,
  withToolbar = true,
  className = "",
}: LoadingLavorazioniListSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`.trim()} role="status" aria-busy="true" aria-label="Caricamento lavorazioni">
      {withToolbar ? <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="p-0" /> : null}
      <SkeletonTable
        visibilityClass="hidden xl:block"
        className={gestionaleLavorazioniDenseTableClass}
      />
      <div className={SKELETON_GRID.lavorazioniMobileStack} aria-hidden>
        {Array.from({ length: mobileCards }).map((_, i) => (
          <SkeletonCard key={i} minHeightClass={SKELETON_MIN_HEIGHT.cardMobile} />
        ))}
      </div>
    </div>
  );
});
