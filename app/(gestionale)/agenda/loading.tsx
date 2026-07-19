import { PageLayout } from "@/components/design-system";
import { AgendaPageStructure } from "@/components/workshop-schedule/agenda-page-structure";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";

export default function AgendaLoading() {
  return (
    <PageLayout title={STRUCTURAL_ROUTE_PAGE_TITLES.agenda} description="Pianificazione sessioni di lavoro">
      <AgendaPageStructure mode="skeleton" />
    </PageLayout>
  );
}
