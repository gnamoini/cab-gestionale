"use client";

import { memo } from "react";
import { SkeletonShellCard, SkeletonShellCardPulseBody } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

const GESTIONALE_COMBINED_LIST_CARD_MIN = "min-h-[33rem]";

export const LoadingPreventiviListSkeleton = memo(function LoadingPreventiviListSkeleton({
  className = "",
  withToolbar = true,
}: {
  className?: string;
  withToolbar?: boolean;
}) {
  if (!withToolbar) {
    return (
      <SkeletonShellCardPulseBody
        minHeightClass={SKELETON_MIN_HEIGHT.tableDesktop}
        className={className}
      />
    );
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento preventivi">
      <SkeletonShellCard
        sectionLabel="Azioni e filtri preventivi"
        bodyMinHeightClass={GESTIONALE_COMBINED_LIST_CARD_MIN}
      />
    </LoadingListPageShell>
  );
});
