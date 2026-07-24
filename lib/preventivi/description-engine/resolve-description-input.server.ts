import "server-only";

import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { fetchSchedeRowsByLavorazioneIds, schedeRowsToBundlesStore } from "@/lib/schede/schede-bundles-fetch";
import {
  buildDescriptionInputFromBundle,
  type ResolvedDescriptionInput,
} from "@/lib/preventivi/description-engine/resolve-description-input";

export async function resolveDescriptionInputFromDbServer(
  lavorazioneId: string,
): Promise<ResolvedDescriptionInput> {
  const id = lavorazioneId.trim();
  if (!id) {
    throw new Error("ID lavorazione richiesto per generare la descrizione preventivo.");
  }

  const sb = await createSupabaseServerUserClient();
  const rowsResult = await fetchSchedeRowsByLavorazioneIds(sb, [id]);
  if (!rowsResult.success) {
    throw new Error(rowsResult.error ?? "Lettura schede dal database non riuscita.");
  }

  const store = schedeRowsToBundlesStore(rowsResult.data ?? [], [id]);
  const bundle = store[id];
  if (!bundle) {
    throw new Error("Schede lavorazione non trovate nel database per questa lavorazione.");
  }

  return buildDescriptionInputFromBundle(bundle);
}
