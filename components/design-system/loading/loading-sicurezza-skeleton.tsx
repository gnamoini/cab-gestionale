"use client";

import { memo } from "react";
import { SkeletonBlock } from "./skeleton-primitives";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingSicurezzaSkeletonProps = {
  className?: string;
  /** Solo area contenuto (header già visibile). */
  embedded?: boolean;
};

/** Sicurezza: tab bar + pannello principale. */
export const LoadingSicurezzaSkeleton = memo(function LoadingSicurezzaSkeleton({
  className = "",
  embedded = false,
}: LoadingSicurezzaSkeletonProps) {
  const body = (
    <>
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.tabBar} />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.sicurezzaPanel} />
    </>
  );

  if (embedded) {
    return (
      <div className={className} role="status" aria-busy="true" aria-label="Caricamento sicurezza">
        {body}
      </div>
    );
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento sicurezza">
      {body}
    </LoadingListPageShell>
  );
});
