import type { ReactNode } from "react";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";
import { SkeletonBlock } from "./skeleton-primitives";
import { SkeletonShellCard } from "./skeleton-shell-card";
import { SkeletonTable } from "./skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "./skeleton-layout-presets";
import { GESTIONALE_COMBINED_LIST_GEOMETRY_MIN } from "./skeleton-geometry-tokens";

export function RouteSkeletonRoot({
  children,
  ariaLabel,
  testId,
  scope,
  className = "",
}: {
  children: ReactNode;
  ariaLabel: string;
  testId: string;
  scope: RouteSkeletonScope;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-4 ${className}`.trim()}
      role="status"
      aria-label={ariaLabel}
      data-testid={testId}
      data-skeleton-scope={scope}
    >
      {children}
    </div>
  );
}

export function RouteSkeletonActionsRow() {
  return (
    <div className="mb-2 flex justify-end" data-testid="route-skeleton-actions">
      <SkeletonBlock minHeightClass="min-h-11" className="w-28" />
    </div>
  );
}

export function RouteSkeletonCombinedList({ sectionLabel }: { sectionLabel?: string }) {
  return (
    <SkeletonShellCard
      bodyMinHeightClass={GESTIONALE_COMBINED_LIST_GEOMETRY_MIN}
      sectionLabel={sectionLabel}
    />
  );
}

export function RouteSkeletonTable({
  geometry = "table",
}: {
  geometry?: "table" | "table-documenti" | "table-compact";
}) {
  const minHeight =
    geometry === "table-documenti"
      ? SKELETON_MIN_HEIGHT.tableDocumenti
      : geometry === "table-compact"
        ? SKELETON_MIN_HEIGHT.tableCompact
        : SKELETON_MIN_HEIGHT.tableDesktop;
  return <SkeletonTable minHeightClass={minHeight} />;
}

export function RouteSkeletonTabBar() {
  return <SkeletonBlock minHeightClass={SKELETON_MIN_HEIGHT.tabBar} className="w-full rounded-md" />;
}

export function RouteSkeletonKpiRow({ count = 4 }: { count?: 4 | 6 }) {
  const gridClass = count === 6 ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" : "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`grid min-w-0 gap-3 ${gridClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} minHeightClass="min-h-[5.5rem]" className="w-full" />
      ))}
    </div>
  );
}

export function RouteSkeletonCardsStack({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`.trim()}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} minHeightClass={SKELETON_MIN_HEIGHT.cardMobile} className="w-full" />
      ))}
    </div>
  );
}
