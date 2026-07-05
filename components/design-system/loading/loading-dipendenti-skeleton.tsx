"use client";

import { memo } from "react";
import { SkeletonBlock } from "./skeleton-primitives";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
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
  const body = (
    <>
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.kpiRow} />
      <SkeletonShellCard bodyMinHeightClass="min-h-[32rem]" />
    </>
  );

  if (embedded) {
    return (
      <div className={className} role="status" aria-busy="true" aria-label="Caricamento dipendenti">
        {body}
      </div>
    );
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento dipendenti">
      {body}
    </LoadingListPageShell>
  );
});
