import type { ReactNode } from "react";
import { PageSection } from "@/components/design-system/layout/page-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import {
  DIPENDENTI_TIMESHEET_BODY_SKELETON_CONTRACT,
  STRUCTURAL_ROUTE_SKELETON_CONTRACTS,
} from "@/lib/ui/structural-route-skeleton-contracts";

export function DipendentiPageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento dipendenti"
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.dipendenti}
    />
  );
}

export function DipendentiTimesheetSection({
  mode = "content",
  children,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
}) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento tabella presenze"
      skeleton={DIPENDENTI_TIMESHEET_BODY_SKELETON_CONTRACT}
    >
      {children}
    </PageSection>
  );
}
