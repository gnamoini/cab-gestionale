
import { memo } from "react";
import { SkeletonShellCard, SkeletonShellCardPulseBody } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

/** Toolbar + tabella nello stesso ShellCard (mezzi, documenti, magazzino, preventivi). */
const GESTIONALE_COMBINED_LIST_CARD_MIN = "min-h-[33rem]";

export type LoadingMagazzinoListSkeletonProps = {
  withToolbar?: boolean;
  className?: string;
};

export const LoadingMagazzinoListSkeleton = memo(function LoadingMagazzinoListSkeleton({
  withToolbar = true,
  className = "",
}: LoadingMagazzinoListSkeletonProps) {
  if (!withToolbar) {
    return (
      <SkeletonShellCardPulseBody
        minHeightClass={SKELETON_MIN_HEIGHT.tableDesktop}
        className={className}
      />
    );
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento magazzino">
      <SkeletonShellCard
        sectionLabel="Azioni e filtri magazzino"
        bodyMinHeightClass={GESTIONALE_COMBINED_LIST_CARD_MIN}
      />
    </LoadingListPageShell>
  );
});
