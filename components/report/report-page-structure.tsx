import { PageSection } from "@/components/design-system/layout/page-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { STRUCTURAL_ROUTE_SKELETON_CONTRACTS } from "@/lib/ui/structural-route-skeleton-contracts";

export function ReportPageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento report"
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.report}
    />
  );
}

export const ReportRouteStructure = ReportPageStructure;

export { ErpTableSection as ReportBodySection } from "@/components/design-system/layout/combined-list-section";
