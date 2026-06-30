"use client";

import { memo } from "react";
import { GESTIONALE_LIST_DESKTOP_ONLY_CLASS, GESTIONALE_LIST_MOBILE_ONLY_CLASS } from "@/lib/ui/use-gestionale-list-layout";
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
        visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS}
        className={gestionaleLavorazioniDenseTableClass}
      />
      <div className={`${SKELETON_GRID.lavorazioniMobileStack} ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`} aria-hidden>
        {Array.from({ length: mobileCards }).map((_, i) => (
          <SkeletonCard key={i} minHeightClass={SKELETON_MIN_HEIGHT.cardMobile} />
        ))}
      </div>
    </div>
  );
});
