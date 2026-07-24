import { fetchSchedeBundlesStoreAuthorized } from "@/lib/schede/schede-bundles-fetch-authorized";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  buildDescriptionInputFromBundle,
  type ResolvedDescriptionInput,
} from "@/lib/preventivi/description-engine/resolve-description-input";

/** SSOT produzione client: fetch bundle da DB (mai localStorage/capture). */
export async function resolveDescriptionInputFromDb(
  lavorazioneId: string,
  opts?: { magazzino?: RicambioMagazzino[]; noteInterneFallback?: string },
): Promise<ResolvedDescriptionInput> {
  const id = lavorazioneId.trim();
  if (!id) {
    throw new Error("ID lavorazione richiesto per generare la descrizione preventivo.");
  }

  const result = await fetchSchedeBundlesStoreAuthorized([id]);
  if (!result.success) {
    throw new Error(result.error ?? "Lettura schede dal database non riuscita.");
  }

  const bundle = result.data?.[id];
  if (!bundle) {
    throw new Error("Schede lavorazione non trovate nel database per questa lavorazione.");
  }

  return buildDescriptionInputFromBundle(bundle, opts);
}
