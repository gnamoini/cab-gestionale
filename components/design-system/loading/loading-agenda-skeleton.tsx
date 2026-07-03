"use client";

import { memo } from "react";
import { dsStackPage } from "@/lib/ui/design-system";
import { SkeletonBlock, SkeletonCard } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";

export type LoadingAgendaSkeletonProps = {
  className?: string;
  /** Solo area contenuto (header già visibile). */
  embedded?: boolean;
};

/** Agenda: toolbar + griglia calendario / timeline / sidebar. */
export const LoadingAgendaSkeleton = memo(function LoadingAgendaSkeleton({
  className = "",
  embedded = false,
}: LoadingAgendaSkeletonProps) {
  return (
    <div
      className={`${dsStackPage} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-label="Caricamento agenda"
    >
      {!embedded ? <SkeletonBlock className={SKELETON_MIN_HEIGHT.pageHeader} /> : null}
      {!embedded ? <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.toolbar} className="p-0" /> : null}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(220px,280px)_1fr_minmax(220px,300px)]">
        <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.agendaCalendar} />
        <SkeletonCard minHeightClass={SKELETON_MIN_HEIGHT.agendaMain} />
        <SkeletonCard
          minHeightClass={SKELETON_MIN_HEIGHT.agendaSidebar}
          className="hidden xl:block"
        />
      </div>
    </div>
  );
});

/** Solo pannello centrale agenda (fetch sessioni). */
export const LoadingAgendaContentSkeleton = memo(function LoadingAgendaContentSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <SkeletonCard
      minHeightClass={SKELETON_MIN_HEIGHT.agendaMain}
      className={className}
    />
  );
});
