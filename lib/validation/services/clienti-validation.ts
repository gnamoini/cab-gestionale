/**
 * Validazione clienti (liste globali app_settings) — layer condiviso.
 * Non esiste tabella `clienti`: i clienti vivono in `mezziListe.clienti`.
 */
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import { findSimilarEntityInPool } from "@/lib/validation/global-entity-validation";

export { buildClienteEntityKey };

export function findSimilarCliente(
  candidate: string,
  existingClienti: readonly string[],
  exclude?: string,
): string | null {
  return findSimilarEntityInPool(candidate, existingClienti, {
    exclude,
    standardizeLegalSuffix: true,
  });
}

export function clienteEntityKeyForPersist(label: string): string | null {
  const key = buildClienteEntityKey(label);
  return key || null;
}
