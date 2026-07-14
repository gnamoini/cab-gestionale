import "server-only";

import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { LabelPayload } from "@/lib/inventory-labels/domain/types";
import { INVENTORY_ENTITY_MAGAZZINO_RICAMBIO } from "@/lib/inventory-labels/domain/types";
import { metaFieldsToRicambioUi, parseMagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";

export function labelPayloadFromMagazzinoRow(row: MagazzinoRicambioRow): LabelPayload {
  const fromMeta = metaFieldsToRicambioUi(parseMagazzinoRicambioMeta(row.meta ?? {}));
  const alt0 = fromMeta.fornitoriAlternativi?.[0];

  return {
    marca: (row.marca ?? "").trim(),
    descrizione: (row.nome ?? "").trim(),
    codice: (row.codice ?? "").trim(),
    fornitoreAlternativo: (fromMeta.fornitoreNonOriginale || alt0?.fornitore || "").trim(),
    codiceAlternativo: (fromMeta.codiceFornitoreNonOriginale || alt0?.codice || "").trim(),
  };
}

export function magazzinoRicambioEntityType(): typeof INVENTORY_ENTITY_MAGAZZINO_RICAMBIO {
  return INVENTORY_ENTITY_MAGAZZINO_RICAMBIO;
}
