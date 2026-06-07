"use client";

import { memo } from "react";
import { SETTINGS_PAGE_GRID, SETTINGS_PAGE_SHELL } from "@/components/dashboard/settings-list-ui";
import { SkeletonBlock, SkeletonForm } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingImpostazioniSkeleton = memo(function LoadingImpostazioniSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`${SETTINGS_PAGE_SHELL} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento configurazione"
    >
      <div className={SETTINGS_PAGE_GRID}>
        <SkeletonBlock
          className={`hidden w-full shrink-0 md:block md:w-[15rem] md:rounded-[var(--ds-radius-xl)] md:border md:border-[color:var(--cab-border)] ${SKELETON_MIN_HEIGHT.settingsNav}`}
        />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2 border-b border-[color:var(--cab-border)] pb-3">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="h-3 w-full max-w-md" />
          </div>
          <SkeletonForm sections={1} minHeightClass={SKELETON_MIN_HEIGHT.settingsContent} />
        </div>
      </div>
    </div>
  );
});
