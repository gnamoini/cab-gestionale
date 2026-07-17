import { dehydrate } from "@tanstack/react-query";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchDeferredPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import type { ReactNode } from "react";

/** RSC: BFF dipendenti (registro + presenze) — streamabile via Suspense sulla page. */
export async function DipendentiDeferredHydration({ children }: { children: ReactNode }) {
  const qc = createServerQueryClient();
  await prefetchDeferredPage(qc, "dipendenti");
  return <GestionaleHydrationBoundary state={dehydrate(qc)}>{children}</GestionaleHydrationBoundary>;
}
