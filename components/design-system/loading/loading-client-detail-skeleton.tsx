"use client";

import { memo } from "react";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export const LoadingClientDetailSkeleton = memo(function LoadingClientDetailSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento dettaglio">
      <SkeletonShellCard bodyMinHeightClass="min-h-[12rem]" />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidget} />
    </LoadingListPageShell>
  );
});
