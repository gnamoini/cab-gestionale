import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { SistemaImpostazioniPageView } from "@/components/configurazione/sistema-impostazioni-page";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import { prefetchImpostazioniPage } from "@/src/lib/react-query/prefetch-gestionale-page";

export default async function ImpostazioniPage() {
  const dehydratedState = await prefetchImpostazioniPage();
  return (
    <Suspense fallback={<LoadingSuspenseFallback variant="impostazioni" />}>
      <GestionaleHydrationBoundary state={dehydratedState}>
        <SistemaImpostazioniPageView />
      </GestionaleHydrationBoundary>
    </Suspense>
  );
}
