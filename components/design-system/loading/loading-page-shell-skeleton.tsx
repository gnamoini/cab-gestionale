"use client";

import { memo } from "react";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingPageShellSkeletonProps = {
  className?: string;
  /** Altezza blocco contenuto principale */
  contentMinHeightClass?: string;
};

/**
 * Fallback generico: header + un ShellCard con corpo pulse.
 */
export const LoadingPageShellSkeleton = memo(function LoadingPageShellSkeleton({
  className = "",
  contentMinHeightClass = SKELETON_MIN_HEIGHT.tableDesktop,
}: LoadingPageShellSkeletonProps) {
  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento pagina">
      <SkeletonShellCard bodyMinHeightClass={contentMinHeightClass} />
    </LoadingListPageShell>
  );
});
