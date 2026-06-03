"use client";

import { memo } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { SkeletonBlock, SkeletonCard, SkeletonTable } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingDipendentiSkeletonProps = {
  className?: string;
  /** Solo area contenuto (header pagina già visibile). */
  embedded?: boolean;
};

export const LoadingDipendentiSkeleton = memo(function LoadingDipendentiSkeleton({
  className = "",
  embedded = false,
}: LoadingDipendentiSkeletonProps) {
  return (
    <div
      className={`${dsStackPage} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento dipendenti"
    >
      {!embedded ? <SkeletonBlock className={SKELETON_MIN_HEIGHT.pageHeader} /> : null}
      {embedded ? null : <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="p-0" />}
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.kpiRow} />
      <SkeletonTable minHeightClass="min-h-[32rem]" />
    </div>
  );
});
