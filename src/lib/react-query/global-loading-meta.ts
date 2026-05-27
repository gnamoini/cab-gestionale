import type { MutationMeta, QueryMeta } from "@tanstack/react-query";
import { GLOBAL_LOADING_MESSAGES } from "@/lib/ui/global-loading-messages";

/** Meta opt-in per overlay globale su mutation/query (non attivo di default). */
export type GlobalLoadingMeta = {
  globalLoading?: boolean;
  globalLoadingMessage?: string;
};

export function globalLoadingMutationMeta(message = GLOBAL_LOADING_MESSAGES.saving): MutationMeta & GlobalLoadingMeta {
  return { globalLoading: true, globalLoadingMessage: message };
}

export function globalLoadingQueryMeta(message = GLOBAL_LOADING_MESSAGES.default): QueryMeta & GlobalLoadingMeta {
  return { globalLoading: true, globalLoadingMessage: message };
}

export function readGlobalLoadingMeta(meta: unknown): GlobalLoadingMeta | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as GlobalLoadingMeta;
  if (!m.globalLoading) return null;
  return m;
}
