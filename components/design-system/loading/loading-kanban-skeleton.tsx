"use client";

import { memo } from "react";
import { SkeletonCard } from "./skeleton-primitives";

export const LoadingKanbanSkeleton = memo(function LoadingKanbanSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`grid min-h-[24rem] grid-cols-1 gap-3 overscroll-y-contain [touch-action:pan-y] sm:grid-cols-2 lg:grid-cols-4 ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento kanban"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} minHeightClass="min-h-[20rem]" />
      ))}
    </div>
  );
});
