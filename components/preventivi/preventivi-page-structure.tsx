import type { ReactNode } from "react";
import { CombinedListSection, ErpTableSection } from "@/components/design-system/layout/combined-list-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { STRUCTURAL_ROUTE_SKELETON_CONTRACTS } from "@/lib/ui/structural-route-skeleton-contracts";

export function PreventiviPageStructure({
  mode = "content",
  children,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
}) {
  return (
    <CombinedListSection
      mode={mode}
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.preventivi}
      sectionLabel={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.preventivi.sectionLabel}
      ariaLabel="Caricamento preventivi"
    >
      {children}
    </CombinedListSection>
  );
}

export const PreventiviRouteStructure = ({ mode = "skeleton" }: { mode?: SkeletonMode }) => (
  <PreventiviPageStructure mode={mode} />
);

export const PreventiviTableSection = ErpTableSection;
