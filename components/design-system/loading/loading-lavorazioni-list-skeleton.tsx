"use client";

import { memo } from "react";
import { SkeletonBlock } from "./skeleton-primitives";
import { SkeletonShellCard, SkeletonShellCardPulseBody } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingLavorazioniListSkeletonProps = {
  /** @deprecated */
  mobileCards?: number;
  /** @deprecated */
  tableRows?: number;
  /** @deprecated */
  actionButtonCount?: number;
  withToolbar?: boolean;
  className?: string;
};

export const LoadingLavorazioniListSkeleton = memo(function LoadingLavorazioniListSkeleton({
  withToolbar = true,
  className = "",
}: LoadingLavorazioniListSkeletonProps) {
  if (!withToolbar) {
    return (
      <>
        <SkeletonShellCard
          title="Lavorazioni in corso"
          collapsible
          defaultCollapsed={false}
          bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop}
        />
        <SkeletonShellCard title="Lavorazioni completate" collapsible defaultCollapsed bodyMinHeightClass="min-h-0" />
      </>
    );
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento lavorazioni">
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.toolbar} />
      <SkeletonShellCard
        title="Lavorazioni in corso"
        collapsible
        defaultCollapsed={false}
        bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop}
      />
      <SkeletonShellCard title="Lavorazioni completate" collapsible defaultCollapsed bodyMinHeightClass="min-h-0" />
    </LoadingListPageShell>
  );
});
