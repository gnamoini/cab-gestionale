import { PageSection } from "@/components/design-system/layout/page-section";
import type { SkeletonMode } from "@/components/design-system/loading/skeleton-contract";
import {
  AGENDA_CONTENT_SKELETON_CONTRACT,
  STRUCTURAL_ROUTE_SKELETON_CONTRACTS,
} from "@/lib/ui/structural-route-skeleton-contracts";

export function AgendaPageStructure({ mode = "skeleton" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento agenda"
      skeleton={STRUCTURAL_ROUTE_SKELETON_CONTRACTS.agenda}
    />
  );
}

export function AgendaContentSection({ mode = "content" }: { mode?: SkeletonMode }) {
  return (
    <PageSection
      mode={mode}
      ariaLabel="Caricamento sessioni agenda"
      skeleton={AGENDA_CONTENT_SKELETON_CONTRACT}
    />
  );
}
