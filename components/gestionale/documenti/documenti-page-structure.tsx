import { PageSection } from "@/components/design-system/layout/page-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { STRUCTURAL_ROUTE_SKELETON_CONTRACTS } from "@/lib/ui/structural-route-skeleton-contracts";

export function DocumentiPageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento documenti"
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.documenti}
    />
  );
}

export const DocumentiRouteStructure = DocumentiPageStructure;

export { ErpTableSection as DocumentiTableSection } from "@/components/design-system/layout/combined-list-section";
