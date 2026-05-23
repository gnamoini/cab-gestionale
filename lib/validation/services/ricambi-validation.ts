import { buildRicambioCodiceEntityKey } from "@/lib/validation/entity-keys";
import { findSimilarEntityInPool } from "@/lib/validation/global-entity-validation";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { findFirstDuplicateByCodiceOriginale } from "@/lib/magazzino/duplicates";

export { buildRicambioCodiceEntityKey };

export function ricambioEntityKeyForPersist(codice: string): string | null {
  return buildRicambioCodiceEntityKey(codice);
}

/** Duplicato codice OE (esatto o normalizzato). Non bloccante — solo rilevamento UI/service. */
export function findSimilarRicambioCodice(
  items: readonly RicambioMagazzino[],
  codiceRaw: string,
  options?: { excludeId?: string },
): RicambioMagazzino | null {
  return findFirstDuplicateByCodiceOriginale([...items], codiceRaw, options);
}

export function findSimilarRicambioMarca(
  candidate: string,
  existingMarche: readonly string[],
  exclude?: string,
): string | null {
  return findSimilarEntityInPool(candidate, existingMarche, { exclude });
}

export function findSimilarRicambioNome(
  candidate: string,
  existingNomi: readonly string[],
  exclude?: string,
): string | null {
  return findSimilarEntityInPool(candidate, existingNomi, { exclude });
}
