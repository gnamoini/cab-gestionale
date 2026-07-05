"use client";

import { memo } from "react";
import { SkeletonShellCard, SkeletonShellCardPulseBody } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

const GESTIONALE_COMBINED_LIST_CARD_MIN = "min-h-[33rem]";

export const LoadingDocumentiListSkeleton = memo(function LoadingDocumentiListSkeleton({
  className = "",
  withToolbar = true,
}: {
  className?: string;
  withToolbar?: boolean;
}) {
  if (!withToolbar) {
    return (
      <SkeletonShellCardPulseBody
        minHeightClass={SKELETON_MIN_HEIGHT.tableDocumenti}
        className={className}
      />
    );
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento documenti">
      <SkeletonShellCard
        sectionLabel="Azioni e filtri documenti"
        bodyMinHeightClass={`${GESTIONALE_COMBINED_LIST_CARD_MIN} xl:min-h-[36rem]`}
      />
    </LoadingListPageShell>
  );
});
