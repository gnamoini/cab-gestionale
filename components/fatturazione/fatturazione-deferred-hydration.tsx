import { dehydrate } from "@tanstack/react-query";
import { GestionaleHydrationBoundary } from "@/src/components/gestionale/gestionale-hydration-boundary";
import {
  createServerQueryClient,
  prefetchDeferredPage,
} from "@/src/lib/react-query/prefetch-gestionale-page";
import type { ReactNode } from "react";

/** RSC: BFF fatturazione (+ open-items/payments se deep link tab) — streamabile via Suspense. */
export async function FatturazioneDeferredHydration({
  children,
  includeOpenItems = false,
  includePayments = false,
}: {
  children: ReactNode;
  includeOpenItems?: boolean;
  includePayments?: boolean;
}) {
  const qc = createServerQueryClient();
  await prefetchDeferredPage(qc, "fatturazione", { includeOpenItems, includePayments });
  return <GestionaleHydrationBoundary state={dehydrate(qc)}>{children}</GestionaleHydrationBoundary>;
}
