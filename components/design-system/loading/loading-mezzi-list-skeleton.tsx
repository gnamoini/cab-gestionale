
import { memo } from "react";
import { GESTIONALE_LIST_DESKTOP_ONLY_CLASS } from "@/lib/ui/use-gestionale-list-layout";
import { SkeletonShellCard, SkeletonShellCardPulseBody } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

const GESTIONALE_COMBINED_LIST_CARD_MIN = "min-h-[33rem]";

export type LoadingMezziListSkeletonProps = {
  withToolbar?: boolean;
  className?: string;
};

export const LoadingMezziListSkeleton = memo(function LoadingMezziListSkeleton({
  withToolbar = true,
  className = "",
}: LoadingMezziListSkeletonProps) {
  if (!withToolbar) {
    return (
      <SkeletonShellCardPulseBody
        minHeightClass={`${SKELETON_MIN_HEIGHT.tableCompact} ${GESTIONALE_LIST_DESKTOP_ONLY_CLASS}`}
        className={className}
      />
    );
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento mezzi">
      <SkeletonShellCard sectionLabel="Azioni e filtri mezzi" bodyMinHeightClass={GESTIONALE_COMBINED_LIST_CARD_MIN} />
    </LoadingListPageShell>
  );
});
