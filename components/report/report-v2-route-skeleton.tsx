import { SkeletonBlock } from "@/components/design-system/loading/skeleton-primitives";
import { SKELETON_MIN_HEIGHT } from "@/components/design-system/loading/skeleton-layout-presets";
import { SkeletonShellCard } from "@/components/design-system/loading/skeleton-shell-card";
import { reportCommandFiltersShellClass } from "@/components/report/report-ui-tokens";

import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

function ReportV2CommandBarSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-2" data-testid="report-v2-skeleton-command-bar">
      <SkeletonBlock minHeightClass="min-h-11" className="w-full" />
      <div
        className={`min-w-0 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3 sm:p-4 ${reportCommandFiltersShellClass}`}
      >
        <SkeletonBlock minHeightClass="min-h-[8rem]" className="w-full" />
      </div>
    </div>
  );
}

function ReportV2ExecutiveSkeleton() {
  return (
    <SkeletonShellCard title="Executive" bodyMinHeightClass="min-h-0">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} minHeightClass="h-24" className="w-full" />
        ))}
      </div>
    </SkeletonShellCard>
  );
}

function ReportV2InsightSkeleton() {
  return (
    <SkeletonShellCard title="Insight" bodyMinHeightClass="min-h-0">
      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkeletonBlock key={i} minHeightClass="h-10" className="w-full rounded-md" />
        ))}
      </div>
    </SkeletonShellCard>
  );
}

function ReportV2SectionsSkeleton() {
  return (
    <>
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.tableDesktop} />
      <SkeletonShellCard bodyMinHeightClass={SKELETON_MIN_HEIGHT.cardWidgetSm} />
    </>
  );
}

/** Skeleton Report V2 — parity toolbar + executive + insight + sezioni. RSC-safe. */
export function ReportV2RouteSkeleton({
  scope = "full",
  className = "",
}: {
  scope?: RouteSkeletonScope;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-4 ${className}`.trim()}
      role="status"
      aria-label="Caricamento report"
      data-testid="report-v2-route-skeleton"
      data-skeleton-scope={scope}
    >
      {scope === "full" ? <ReportV2CommandBarSkeleton /> : null}
      <ReportV2ExecutiveSkeleton />
      <ReportV2InsightSkeleton />
      <ReportV2SectionsSkeleton />
    </div>
  );
}
