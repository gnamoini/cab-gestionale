import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import type { RouteSkeletonScope } from "@/lib/ui/route-skeleton-scope";
import {
  ReportV2RouteSkeleton,
} from "@/components/report/report-v2-route-skeleton";

export type ReportPageStructureProps = {
  mode?: SkeletonMode;
  /** full: route/Suspense (con command bar). content: solo body sotto toolbar live. */
  scope?: RouteSkeletonScope;
  className?: string;
};

export function ReportPageStructure({
  mode = "skeleton",
  scope = "full",
  className = "",
}: ReportPageStructureProps) {
  if (mode !== "skeleton") {
    return null;
  }
  return <ReportV2RouteSkeleton scope={scope} className={className} />;
}

export const ReportRouteStructure = ReportPageStructure;

export { ErpTableSection as ReportBodySection } from "@/components/design-system/layout/combined-list-section";
