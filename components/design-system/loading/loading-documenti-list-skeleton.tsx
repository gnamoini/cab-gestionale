
import { memo } from "react";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingDocumentiListSkeleton = memo(function LoadingDocumentiListSkeleton({
  className = "",
  withToolbar = true,
}: {
  className?: string;
  withToolbar?: boolean;
}) {
  if (!withToolbar) {
    return (
      <>
        <SkeletonShellCard
          title="Marca documenti"
          collapsible
          defaultCollapsed={false}
          bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDocumenti}
          className={className}
        />
        <SkeletonShellCard title="Marca documenti" collapsible defaultCollapsed bodyMinHeightClass="min-h-0" />
      </>
    );
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento documenti">
      <SkeletonShellCard sectionLabel="Azioni e filtri documenti" bodyMinHeightClass={SKELETON_MIN_HEIGHT.toolbar} />
      <SkeletonShellCard
        title="Marca documenti"
        collapsible
        defaultCollapsed={false}
        bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDocumenti}
      />
      <SkeletonShellCard title="Marca documenti" collapsible defaultCollapsed bodyMinHeightClass="min-h-0" />
    </LoadingListPageShell>
  );
});
