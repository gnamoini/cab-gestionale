import type { ReactNode } from "react";
import { CombinedListSection, ErpTableSection } from "@/components/design-system/layout/combined-list-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { STRUCTURAL_ROUTE_SKELETON_CONTRACTS } from "@/lib/ui/structural-route-skeleton-contracts";

const MAGAZZINO_CONTRACT = STRUCTURAL_ROUTE_SKELETON_CONTRACTS.magazzino;

/** SSOT struttura pagina — route loading + view (toolbar + tabella in ShellCard). */
export function MagazzinoPageStructure({
  mode = "content",
  children,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
}) {
  return (
    <CombinedListSection
      mode={mode}
      sectionLabel={MAGAZZINO_CONTRACT.sectionLabel}
      ariaLabel="Caricamento magazzino"
      skeleton={MAGAZZINO_CONTRACT}
    >
      {children}
    </CombinedListSection>
  );
}

/** @deprecated Usare MagazzinoPageStructure */
export const MagazzinoRouteStructure = ({ mode = "skeleton" }: { mode?: SkeletonMode }) => (
  <MagazzinoPageStructure mode={mode} />
);

/** Primo fetch dati — solo area tabella (toolbar già montata). */
export const MagazzinoTableSection = ErpTableSection;
