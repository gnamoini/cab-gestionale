import { dehydrate } from "@tanstack/react-query";
import { PageLayout } from "@/components/design-system";
import { SistemaImpostazioniPageViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchGestionalePage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { OperatorGlobalSettingsPilotBadge } from "@/components/gestionale/operator-global-settings-pilot-badge";

export default async function ImpostazioniPage() {
  const qc = createServerQueryClient();
  await prefetchGestionalePage(qc, "impostazioni");
  return (
    <PageLayout
      title={STRUCTURAL_ROUTE_PAGE_TITLES.impostazioni}
      titleAddon={<OperatorGlobalSettingsPilotBadge />}
      contentReveal
    >
      <GestionaleHydrationBoundary state={dehydrate(qc)}>
        <SistemaImpostazioniPageViewLazy />
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
