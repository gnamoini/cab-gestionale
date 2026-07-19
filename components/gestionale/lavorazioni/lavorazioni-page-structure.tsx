import type { ReactNode } from "react";
import { PageSection } from "@/components/design-system/layout/page-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import {
  LAVORAZIONI_LIST_BODY_SKELETON_CONTRACT,
  STRUCTURAL_ROUTE_SKELETON_CONTRACTS,
} from "@/lib/ui/structural-route-skeleton-contracts";

export function LavorazioniPageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento lavorazioni"
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.lavorazioni}
    />
  );
}

export const LavorazioniRouteStructure = LavorazioniPageStructure;

export function LavorazioniListBodySection({
  mode = "content",
  children,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
}) {
  return (
    <PageSection
      mode={mode}
      skeleton={LAVORAZIONI_LIST_BODY_SKELETON_CONTRACT}
      ariaLabel="Caricamento elenco lavorazioni"
    >
      {children}
    </PageSection>
  );
}

export { ErpTableSection as LavorazioniTableSection } from "@/components/design-system/layout/combined-list-section";
