import { dehydrate } from "@tanstack/react-query";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchDeferredPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import type { ReactNode } from "react";

/** RSC: BFF preventivi (+ ordini se deep link tab) — streamabile via Suspense. */
export async function PreventiviDeferredHydration({
  children,
  includeOrdini = false,
}: {
  children: ReactNode;
  includeOrdini?: boolean;
}) {
  const qc = createServerQueryClient();
  await prefetchDeferredPage(qc, "preventivi", { includeOrdini });
  return <GestionaleHydrationBoundary state={dehydrate(qc)}>{children}</GestionaleHydrationBoundary>;
}
