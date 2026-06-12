"use client";

import { useQuery } from "@tanstack/react-query";
import { GESTIONALE_PROFILE_NAMES_STALE_MS, semiDynamicQueryOpts } from "@/lib/react-query/data-cache-tiers";
import { fetchProfileNamesByIdsAuthorized } from "@/lib/lavorazioni/lavorazioni-profile-names-fetch";

function stableProfileIdsKey(userIds: readonly string[]): string {
  return [...new Set(userIds.map((id) => id.trim()).filter(Boolean))].sort().join("|");
}

/** Nomi profilo lazy per «ultima modifica» mobile (no embed lista). */
export function useLavorazioneProfileNamesQuery(userIds: readonly string[], enabled = true) {
  const idsKey = stableProfileIdsKey(userIds);
  const uniqueIds = idsKey ? idsKey.split("|") : [];
  const semiOpts = semiDynamicQueryOpts();

  const q = useQuery({
    queryKey: ["lavorazioni", "profileNames", idsKey] as const,
    queryFn: () => fetchProfileNamesByIdsAuthorized(uniqueIds),
    enabled: enabled && uniqueIds.length > 0,
    staleTime: GESTIONALE_PROFILE_NAMES_STALE_MS,
    gcTime: semiOpts.gcTime,
    refetchOnWindowFocus: semiOpts.refetchOnWindowFocus,
  });

  return q.data ?? new Map<string, string>();
}
