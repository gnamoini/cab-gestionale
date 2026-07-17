
import { memo } from "react";
import { SkeletonShellCardPulseBody } from "./skeleton-shell-card";

export const LoadingKanbanSkeleton = memo(function LoadingKanbanSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[20rem] w-full flex-row flex-nowrap gap-3 overflow-x-hidden overscroll-y-contain [touch-action:pan-y] ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento kanban"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonShellCardPulseBody
          key={i}
          minHeightClass="min-h-[20rem] min-w-0 flex-1 basis-0 rounded-[var(--ds-radius-xl)] border border-[color:var(--cab-border)]"
        />
      ))}
    </div>
  );
});
