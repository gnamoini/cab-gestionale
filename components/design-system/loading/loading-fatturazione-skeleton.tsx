
import { memo } from "react";
import { GESTIONALE_LIST_MOBILE_ONLY_CLASS } from "@/lib/ui/use-gestionale-list-layout";
import { SkeletonBlock } from "./skeleton-primitives";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_GRID, SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingFatturazioneSkeletonProps = {
  className?: string;
  /** Solo area contenuto (header già visibile). */
  embedded?: boolean;
};

export const LoadingFatturazioneListSkeleton = memo(function LoadingFatturazioneListSkeleton({
  className = "",
  withToolbar = true,
}: {
  className?: string;
  withToolbar?: boolean;
}) {
  return (
    <div className={className} role="status" aria-busy="true" aria-label="Caricamento fatturazione">
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.kpiRow} />
      {withToolbar ? <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.toolbar} /> : null}
      <SkeletonShellCard bodyMinHeightClass="min-h-[33rem]" />
      <div className={`${SKELETON_GRID.lavorazioniMobileStack} ${GESTIONALE_LIST_MOBILE_ONLY_CLASS}`} aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonShellCard key={i} bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardMobile} />
        ))}
      </div>
    </div>
  );
});

/** Fatturazione: KPI + toolbar + tabella. */
export const LoadingFatturazioneSkeleton = memo(function LoadingFatturazioneSkeleton({
  className = "",
  embedded = false,
}: LoadingFatturazioneSkeletonProps) {
  if (embedded) {
    return <LoadingFatturazioneListSkeleton className={className} />;
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento fatturazione">
      <LoadingFatturazioneListSkeleton />
    </LoadingListPageShell>
  );
});
