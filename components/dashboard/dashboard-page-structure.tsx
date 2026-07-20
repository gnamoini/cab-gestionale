import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { DashboardRouteSkeleton } from "@/components/design-system/loading/route-skeletons";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";

export function DashboardPageStructure({
  mode = "skeleton",
  scope = "full",
}: {
  mode?: SkeletonMode;
  scope?: RouteSkeletonScope;
}) {
  if (mode !== "skeleton") return null;
  return <DashboardRouteSkeleton scope={scope} />;
}

/** @deprecated Usare DashboardPageStructure */
export const DashboardRouteStructure = DashboardPageStructure;
