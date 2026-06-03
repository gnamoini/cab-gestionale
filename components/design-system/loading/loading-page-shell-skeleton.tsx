"use client";

import { memo } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { SkeletonBlock } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingPageShellSkeletonProps = {
  className?: string;
  /** Altezza blocco contenuto principale */
  contentMinHeightClass?: string;
};

/**
 * Fallback Suspense minimale: header + un solo contenitore.
 * Le view gestiscono il dettaglio con initialLoading usando gli stessi preset.
 */
export const LoadingPageShellSkeleton = memo(function LoadingPageShellSkeleton({
  className = "",
  contentMinHeightClass = SKELETON_MIN_HEIGHT.tableDesktop,
}: LoadingPageShellSkeletonProps) {
  return (
    <div
      className={`${dsStackPage} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento pagina"
    >
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.pageHeader} />
      <SkeletonBlock className={`w-full ${contentMinHeightClass}`} />
    </div>
  );
});
