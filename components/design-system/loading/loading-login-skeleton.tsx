
import { memo } from "react";
import { SkeletonShellCardPulseBody } from "./skeleton-shell-card";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingLoginSkeleton = memo(function LoadingLoginSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-dvh min-w-0 max-w-full items-center justify-center px-4 ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento login"
    >
      <SkeletonShellCardPulseBody
        minHeightClass={`${SKELETON_MIN_HEIGHT.loginCard} w-full max-w-md rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)]`}
      />
    </div>
  );
});
