"use client";

import type { QueryClient } from "@tanstack/react-query";
import { flushGestionaleDirty } from "@/lib/sync/gestionale-dirty-flush";
import { PTR_REFRESH_EVENT } from "@/lib/ui/pull-to-refresh-contract";

export type GestionalePageRefreshRouter = {
  refresh: () => void;
};

/** SSOT refresh pagina: dirty → query attive → RSC. */
export async function runGestionalePageRefresh(
  qc: QueryClient,
  router: GestionalePageRefreshRouter,
): Promise<void> {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PTR_REFRESH_EVENT, { detail: { phase: "before" } }));
  }

  await flushGestionaleDirty(qc, { reason: "user_requested" });
  await qc.refetchQueries({ type: "active" });
  router.refresh();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PTR_REFRESH_EVENT, { detail: { phase: "after" } }));
  }
}
