import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { PreventiviDeferredHydration } from "@/components/preventivi/preventivi-deferred-hydration";
import { PreventiviViewLazy } from "@/components/gestionale/lazy-route-views";
import { Q_PREVENTIVI_TAB } from "@/lib/preventivi/preventivi-query";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchCriticalPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";

type PreventiviPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PreventiviPage({ searchParams }: PreventiviPageProps) {
  const sp = await searchParams;
  const tabRaw = sp[Q_PREVENTIVI_TAB];
  const includeOrdini = tabRaw === "ordini";

  const qc = createServerQueryClient();
  await prefetchCriticalPage(qc, "preventivi");
  const criticalState = dehydrate(qc);

  return (
    <GestionaleHydrationBoundary state={criticalState}>
      <Suspense fallback={null}>
        <PreventiviDeferredHydration includeOrdini={includeOrdini}>
          <PreventiviViewLazy />
        </PreventiviDeferredHydration>
      </Suspense>
    </GestionaleHydrationBoundary>
  );
}
