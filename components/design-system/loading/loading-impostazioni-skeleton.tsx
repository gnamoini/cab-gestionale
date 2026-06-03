"use client";

import { memo } from "react";
import { SkeletonBlock, SkeletonForm } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingImpostazioniSkeleton = memo(function LoadingImpostazioniSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col gap-4 md:flex-row ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento configurazione"
    >
      <SkeletonBlock className={`w-full shrink-0 md:w-[15rem] ${SKELETON_MIN_HEIGHT.settingsNav}`} />
      <SkeletonForm sections={1} minHeightClass={SKELETON_MIN_HEIGHT.settingsContent} className="min-w-0 flex-1" />
    </div>
  );
});
