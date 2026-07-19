import type { ReactNode } from "react";
import { CombinedListSection, ErpTableSection } from "@/components/design-system/layout/combined-list-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { STRUCTURAL_ROUTE_SKELETON_CONTRACTS } from "@/lib/ui/structural-route-skeleton-contracts";

export function MezziPageStructure({ mode = "content", children }: { mode?: SkeletonMode; children?: ReactNode }) {
  return (
    <CombinedListSection
      mode={mode}
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.mezzi}
      sectionLabel={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.mezzi.sectionLabel}
      ariaLabel="Caricamento mezzi"
    >
      {children}
    </CombinedListSection>
  );
}

export const MezziRouteStructure = ({ mode = "skeleton" }: { mode?: SkeletonMode }) => (
  <MezziPageStructure mode={mode} />
);

export const MezziTableSection = ErpTableSection;
