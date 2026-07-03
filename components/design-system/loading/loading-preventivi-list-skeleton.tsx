"use client";

import { memo } from "react";
import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
} from "@/lib/ui/use-gestionale-list-layout";
import { SkeletonCard, SkeletonTable } from "./skeleton-primitives";
import { SKELETON_GRID, SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingPreventiviListSkeleton = memo(function LoadingPreventiviListSkeleton({
  className = "",
  withToolbar = true,
}: {
  className?: string;
  withToolbar?: boolean;
}) {
  return (
    <div className={`space-y-4 ${className}`.trim()} role="status" aria-busy="true" aria-label="Caricamento preventivi">
      {withToolbar ? <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="p-0" /> : null}
      <SkeletonTable visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS} wrapClassName="mt-4" />
      <div className={`${SKELETON_GRID.preventiviMobileStack} ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`} aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} minHeightClass={SKELETON_MIN_HEIGHT.cardMobile} />
        ))}
      </div>
    </div>
  );
});
