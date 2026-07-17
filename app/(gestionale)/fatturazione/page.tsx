import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { LoadingSuspenseFallback } from "@/components/design-system";
import { FatturazioneDeferredHydration } from "@/components/fatturazione/fatturazione-deferred-hydration";
import { FatturazioneViewLazy } from "@/components/gestionale/lazy-route-views";
import { parseFatturazioneTab } from "@/lib/fatturazione/fatturazione-sections-config";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

type FatturazionePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FatturazionePage({ searchParams }: FatturazionePageProps) {
  const sp = await searchParams;
  const tabRaw = sp.tab;
  const tab = parseFatturazioneTab(typeof tabRaw === "string" ? tabRaw : null);
  const includeOpenItems = tab === "scadenziario";
  const includePayments = tab === "pagamenti";

  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "fatturazione");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={<LoadingSuspenseFallback variant="fatturazione" />}>
        <FatturazioneDeferredHydration includeOpenItems={includeOpenItems} includePayments={includePayments}>
          <FatturazioneViewLazy />
        </FatturazioneDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
