
import { memo } from "react";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingProductionReadinessSkeletonProps = {
  className?: string;
  /** Solo area contenuto (header già visibile). */
  embedded?: boolean;
};

/** Production readiness: esito + griglia blockers/warnings. */
export const LoadingProductionReadinessSkeleton = memo(function LoadingProductionReadinessSkeleton({
  className = "",
  embedded = false,
}: LoadingProductionReadinessSkeletonProps) {
  const body = (
    <>
      <SkeletonShellCard
        title="Esito"
        bodyMinHeightClass={SKELETON_MIN_HEIGHT.productionReadinessOutcome}
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <SkeletonShellCard
          title="Blockers"
          bodyMinHeightClass={SKELETON_MIN_HEIGHT.productionReadinessCard}
        />
        <SkeletonShellCard
          title="Warnings"
          bodyMinHeightClass={SKELETON_MIN_HEIGHT.productionReadinessCard}
        />
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className={className} role="status" aria-busy="true" aria-label="Caricamento production readiness">
        {body}
      </div>
    );
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento production readiness">
      {body}
    </LoadingListPageShell>
  );
});
