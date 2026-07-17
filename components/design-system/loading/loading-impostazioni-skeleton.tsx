
import { memo } from "react";
import {
  SETTINGS_MAIN_PANEL,
  SETTINGS_PAGE_GRID,
  SETTINGS_PAGE_SHELL_PAGE,
  SETTINGS_SIDEBAR_SHELL,
} from "@/components/dashboard/settings-list-ui";
import { SkeletonBlock, SkeletonForm } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingImpostazioniSkeleton = memo(function LoadingImpostazioniSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`${SETTINGS_PAGE_SHELL_PAGE} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento configurazione"
    >
      <div className={SETTINGS_PAGE_GRID}>
        <SkeletonBlock className={`${SETTINGS_SIDEBAR_SHELL} ${SKELETON_MIN_HEIGHT.settingsNav}`} />
        <div className={`${SETTINGS_MAIN_PANEL} ${SKELETON_MIN_HEIGHT.settingsContent} space-y-4`}>
          <SkeletonBlock className="min-h-[3rem] w-full" />
          <SkeletonForm sections={1} minHeightClass="min-h-[12rem]" />
        </div>
      </div>
    </div>
  );
});
