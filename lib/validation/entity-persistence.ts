import { entityAutocompleteKey, normalizeEntityString } from "@/lib/validation/global-entity-validation";
import { buildMezzoPersistEntityKey, buildRicambioPersistEntityKey } from "@/lib/validation/entity-keys";
import type { MezzoInsert, MezzoUpdate } from "@/src/services/mezzi.service";
import type { MagazzinoInsert, MagazzinoUpdate } from "@/src/services/magazzino.service";

export function attachMezzoEntityKey<T extends MezzoInsert | MezzoUpdate>(data: T): T & { entity_key?: string | null } {
  const key = buildMezzoPersistEntityKey({
    cliente: data.cliente ?? "",
    marca: data.marca ?? "",
    modello: data.modello ?? "",
    targa: data.targa ?? null,
    matricola: data.matricola ?? null,
  });
  if (!key) return data;
  return { ...data, entity_key: key };
}

export function attachMagazzinoEntityKey<T extends MagazzinoInsert | MagazzinoUpdate>(
  data: T,
): T & { entity_key?: string | null } {
  const key = buildRicambioPersistEntityKey({ codice: data.codice ?? "" });
  if (!key) return data;
  return { ...data, entity_key: key };
}

/** Confronto duplicati lato service (non bloccante — solo rilevamento). */
export function detectDuplicateEntityKey(
  candidateKey: string | null | undefined,
  existingKeys: readonly (string | null | undefined)[],
): boolean {
  if (!candidateKey?.trim()) return false;
  const cNorm = normalizeEntityString(candidateKey);
  const cLoose = entityAutocompleteKey(candidateKey);
  for (const existing of existingKeys) {
    if (!existing?.trim()) continue;
    if (normalizeEntityString(existing) === cNorm) return true;
    if (cLoose && entityAutocompleteKey(existing) === cLoose) return true;
  }
  return false;
}
