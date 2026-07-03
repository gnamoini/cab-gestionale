"use client";

import { memo } from "react";
import {
  GESTIONALE_LIST_DESKTOP_ONLY_CLASS,
  GESTIONALE_LIST_MOBILE_ONLY_CLASS,
} from "@/lib/ui/use-gestionale-list-layout";
import { dsStackPage } from "@/lib/ui/design-system";
import { SkeletonBlock, SkeletonCard, SkeletonTable } from "./skeleton-primitives";
import { SKELETON_GRID, SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingFatturazioneSkeletonProps = {
  className?: string;
  /** Solo area contenuto (header già visibile). */
  embedded?: boolean;
};

/** Fatturazione: KPI + toolbar + tabella. */
export const LoadingFatturazioneSkeleton = memo(function LoadingFatturazioneSkeleton({
  className = "",
  embedded = false,
}: LoadingFatturazioneSkeletonProps) {
  return (
    <div
      className={`${dsStackPage} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento fatturazione"
    >
      {!embedded ? <SkeletonBlock className={SKELETON_MIN_HEIGHT.pageHeader} /> : null}
      <LoadingFatturazioneListSkeleton />
    </div>
  );
});

export const LoadingFatturazioneListSkeleton = memo(function LoadingFatturazioneListSkeleton({
  className = "",
  withToolbar = true,
}: {
  className?: string;
  withToolbar?: boolean;
}) {
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.kpiRow} />
      {withToolbar ? <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="p-0" /> : null}
      <SkeletonTable visibilityClass={GESTIONALE_LIST_DESKTOP_ONLY_CLASS} wrapClassName="mt-0" />
      <div className={`${SKELETON_GRID.lavorazioniMobileStack} ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`} aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} minHeightClass={SKELETON_MIN_HEIGHT.cardMobile} />
        ))}
      </div>
    </div>
  );
});
