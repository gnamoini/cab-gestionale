import type { GestionaleListTier, ListSurface } from "@/lib/ui/resolve-list-surface";

/** Props comuni pagine lista — listSurface server per SSR; sul client usare `useListSurface`. */
export type GestionaleListPageProps = {
  listSurface: ListSurface;
  listTier?: GestionaleListTier;
};

export const GESTIONALE_LIST_PAGE_DEFAULT_TIER: GestionaleListTier = "xl";
