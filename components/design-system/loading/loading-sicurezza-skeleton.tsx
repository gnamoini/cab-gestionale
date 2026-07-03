"use client";

import { memo } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { SkeletonBlock, SkeletonCard } from "./skeleton-primitives";
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
  return (
    <div
      className={`${dsStackPage} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento sicurezza"
    >
      {!embedded ? <SkeletonBlock className={SKELETON_MIN_HEIGHT.pageHeader} /> : null}
      <SkeletonBlock className={SKELETON_MIN_HEIGHT.tabBar} />
      <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.sicurezzaPanel} />
    </div>
  );
});
