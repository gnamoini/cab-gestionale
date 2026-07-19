import { PageSection } from "@/components/design-system/layout/page-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { STRUCTURAL_ROUTE_SKELETON_CONTRACTS } from "@/lib/ui/structural-route-skeleton-contracts";

export function ImpostazioniPageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento configurazione"
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.impostazioni}
    />
  );
}
