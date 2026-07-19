import type { ReactNode } from "react";
import { PageSection } from "@/components/design-system/layout/page-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { STRUCTURAL_ROUTE_SKELETON_CONTRACTS } from "@/lib/ui/structural-route-skeleton-contracts";

export function DashboardPageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento dashboard"
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.dashboard}
    />
  );
}

/** @deprecated Usare DashboardPageStructure */
export const DashboardRouteStructure = DashboardPageStructure;
