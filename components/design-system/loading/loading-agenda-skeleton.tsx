"use client";

import { memo } from "react";
import { SkeletonBlock } from "./skeleton-primitives";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { LoadingListPageShell } from "./loading-list-page-shell";
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
  const body = (
    <>
      {embedded ? null : <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.toolbar} />}
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(220px,280px)_1fr_minmax(220px,300px)]">
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.agendaCalendar} />
        <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.agendaMain} />
        <SkeletonShellCard
          bodyMinHeightClass={SKELETON_MIN_HEIGHT.agendaSidebar}
          className="hidden xl:block"
        />
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className={className} role="status" aria-busy="true" aria-label="Caricamento agenda">
        {body}
      </div>
    );
  }

  return (
    <LoadingListPageShell className={className} ariaLabel="Caricamento agenda">
      {body}
    </LoadingListPageShell>
  );
});

/** Solo pannello centrale agenda (fetch sessioni). */
export const LoadingAgendaContentSkeleton = memo(function LoadingAgendaContentSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <SkeletonShellCard
      bodyMinHeightClass={SKELETON_MIN_HEIGHT.agendaMain}
      className={className}
    />
  );
});
