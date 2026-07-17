import "server-only";

import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { LabelPayload } from "@/lib/inventory-labels/domain/types";
import { labelMarcaToken } from "@/lib/inventory-labels/domain/label-display";
import { INVENTORY_ENTITY_MAGAZZINO_RICAMBIO } from "@/lib/inventory-labels/domain/types";
import { metaFieldsToRicambioUi, parseMagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";

export function labelPayloadFromMagazzinoRow(row: MagazzinoRicambioRow): LabelPayload {
  const fromMeta = metaFieldsToRicambioUi(parseMagazzinoRicambioMeta(row.meta ?? {}));
  const alt0 = fromMeta.fornitoriAlternativi?.[0];

  return {
    marca: labelMarcaToken(row.marca ?? ""),
    marcaSecondaria: labelMarcaToken(fromMeta.marcaOriginaleSecondaria ?? ""),
    descrizione: (row.nome ?? "").trim(),
    codice: normalizeRicambioCodice((row.codice ?? "").trim()),
    codiceSecondario: normalizeRicambioCodice(fromMeta.codiceFornitoreOriginaleSecondario ?? ""),
    fornitoreAlternativo: (fromMeta.fornitoreNonOriginale || alt0?.fornitore || "").trim(),
    codiceAlternativo: normalizeRicambioCodice(
      fromMeta.codiceFornitoreNonOriginale || alt0?.codice || "",
    ),
  };
}

export function magazzinoRicambioEntityType(): typeof INVENTORY_ENTITY_MAGAZZINO_RICAMBIO {
  return INVENTORY_ENTITY_MAGAZZINO_RICAMBIO;
}
