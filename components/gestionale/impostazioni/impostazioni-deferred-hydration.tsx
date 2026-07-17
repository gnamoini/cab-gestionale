import { dehydrate } from "@tanstack/react-query";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchDeferredPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import type { ReactNode } from "react";

/** RSC: settings payload — streamabile via Suspense sulla page (pattern mezzi-invertito). */
export async function ImpostazioniDeferredHydration({ children }: { children: ReactNode }) {
  const qc = createServerQueryClient();
  await prefetchDeferredPage(qc, "impostazioni");
  return <GestionaleHydrationBoundary state={dehydrate(qc)}>{children}</GestionaleHydrationBoundary>;
}
