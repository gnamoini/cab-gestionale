import { dehydrate } from "@tanstack/react-query";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchDeferredPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import type { ReactNode } from "react";

/** RSC: BFF preventivi — streamabile via Suspense. */
export async function PreventiviDeferredHydration({ children }: { children: ReactNode }) {
  const qc = createServerQueryClient();
  await prefetchDeferredPage(qc, "preventivi");
  return <GestionaleHydrationBoundary state={dehydrate(qc)}>{children}</GestionaleHydrationBoundary>;
}
