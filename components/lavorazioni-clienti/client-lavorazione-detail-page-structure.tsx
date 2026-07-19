import type { ReactNode } from "react";
import { PageSection } from "@/components/design-system/layout/page-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import { CLIENT_DETAIL_BODY_SKELETON_CONTRACT } from "@/lib/ui/structural-route-skeleton-contracts";

export function ClientDetailPageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento dettaglio lavorazione"
      skeleton={CLIENT_DETAIL_BODY_SKELETON_CONTRACT}
    />
  );
}

export function ClientDetailBodySection({
  mode = "content",
  children,
}: {
  mode?: SkeletonMode;
  children?: ReactNode;
}) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento dettaglio"
      skeleton={CLIENT_DETAIL_BODY_SKELETON_CONTRACT}
    >
      {children}
    </PageSection>
  );
}
