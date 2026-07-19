import type { ReactNode } from "react";
import { PageSection } from "@/components/design-system/layout/page-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import {
  FATTURAZIONE_TAB_BODY_SKELETON_CONTRACT,
  STRUCTURAL_ROUTE_SKELETON_CONTRACTS,
} from "@/lib/ui/structural-route-skeleton-contracts";

export function FatturazionePageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento fatturazione"
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.fatturazione}
    />
  );
}

export function FatturazioneTabSection({
  mode = "content",
  children,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
}) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento sezione fatturazione"
      skeleton={FATTURAZIONE_TAB_BODY_SKELETON_CONTRACT}
    >
      {children}
    </PageSection>
  );
}
