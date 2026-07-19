import type { ReactNode } from "react";
import { PageSection } from "@/components/design-system/layout/page-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { STRUCTURAL_ROUTE_SKELETON_CONTRACTS } from "@/lib/ui/structural-route-skeleton-contracts";

/** Stack pagina portale clienti — stesso spacing della view caricata. */
export const clientPortalPageStack =
  "cab-layout-page-stack min-w-0 max-w-full space-y-[length:var(--ds-space-lg)]";

export function ClientiPageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento portale clienti"
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.clienti}
    />
  );
}

export function ClientiStackSection({
  mode = "content",
  children,
  className,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <PageSection
      mode={mode}
      className={className ?? clientPortalPageStack}
      ariaLabel="Caricamento lavorazioni clienti"
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.clienti}
    >
      {children}
    </PageSection>
  );
}
