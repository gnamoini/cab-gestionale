import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { PageLayout, PageTransitionLoader } from "@/components/design-system";
import { ImpostazioniDeferredHydration } from "@/components/gestionale/impostazioni/impostazioni-deferred-hydration";
import { SistemaImpostazioniPageViewLazy } from "@/components/gestionale/lazy-route-views";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import { STRUCTURAL_ROUTE_PAGE_TITLES } from "@/lib/ui/structural-route-skeleton-contracts";
import { OperatorGlobalSettingsPilotBadge } from "@/components/gestionale/operator-global-settings-pilot-badge";

export default async function ImpostazioniPage() {
  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "impostazioni");
  const criticalState = dehydrate(qc);

  return (
    <PageLayout
      title={STRUCTURAL_ROUTE_PAGE_TITLES.impostazioni}
      titleAddon={<OperatorGlobalSettingsPilotBadge />}
    >
      <GestionaleHydrationBoundary state={criticalState}>
        <Suspense fallback={<PageTransitionLoader variant="impostazioni" />}>
          <ImpostazioniDeferredHydration>
            <SistemaImpostazioniPageViewLazy />
          </ImpostazioniDeferredHydration>
        </Suspense>
      </GestionaleHydrationBoundary>
    </PageLayout>
  );
}
