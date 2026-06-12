import "server-only";

import { cache } from "react";
import { fetchSchedeBundlesStore } from "@/lib/schede/schede-bundles-fetch";
import { verifyServerSectionRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { err, type ServiceResult } from "@/src/services/service-result";
import type { LavorazioneSchedeStore } from "@/types/schede";

export async function fetchSchedeBundlesStoreServer(
  lavorazioneIds: readonly string[],
  codiciByLavorazioneId?: Readonly<Record<string, string | null | undefined>>,
): Promise<ServiceResult<LavorazioneSchedeStore>> {
  const allowed = await verifyServerSectionRead("lavorazioni");
  if (!allowed) return err("Permesso richiesto.");
  const sb = await createSupabaseServerUserClient();
  return fetchSchedeBundlesStore(sb, lavorazioneIds, codiciByLavorazioneId);
}

/** Cache request-scoped per prefetch SSR (ids derivati da lista attiva). */
export const getSchedeBundlesStoreForIdsServer = cache(
  async (
    lavorazioneIds: readonly string[],
    codiciByLavorazioneId?: Readonly<Record<string, string | null | undefined>>,
  ) => fetchSchedeBundlesStoreServer(lavorazioneIds, codiciByLavorazioneId),
);
