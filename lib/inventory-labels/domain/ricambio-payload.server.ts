import "server-only";

import type { MagazzinoRicambioRow } from "@/src/types/supabase-tables";
import type { LabelPayload } from "@/lib/inventory-labels/domain/types";
import { labelMarcaToken } from "@/lib/inventory-labels/domain/label-display";
import { labelSuppliersFromAlternativi } from "@/lib/inventory-labels/domain/label-suppliers";
import { INVENTORY_ENTITY_MAGAZZINO_RICAMBIO } from "@/lib/inventory-labels/domain/types";
import { metaFieldsToRicambioUi, parseMagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import { resolveFornitoriAlternativiFromMeta } from "@/lib/magazzino/ricambio-fornitori-alternativi";
import { normalizeRicambioCodice, ricambioCodiceForUi } from "@/lib/magazzino/ricambio-codice";

export function labelPayloadFromMagazzinoRow(row: MagazzinoRicambioRow): LabelPayload {
  const meta = parseMagazzinoRicambioMeta(row.meta ?? {});
  const fromMeta = metaFieldsToRicambioUi(meta);
  const alternativi = resolveFornitoriAlternativiFromMeta(meta);
  const fornitoriAlternativi = labelSuppliersFromAlternativi(alternativi);

  const fornitoreAlternativo = fornitoriAlternativi.map((s) => s.name).filter(Boolean).join(" / ");
  const codiceAlternativo = fornitoriAlternativi
    .map((s) => s.code)
    .filter((c): c is string => Boolean(c))
    .join(" / ");

  return {
    marca: labelMarcaToken(row.marca ?? ""),
    marcaSecondaria: labelMarcaToken(fromMeta.marcaOriginaleSecondaria ?? ""),
    descrizione: (row.nome ?? "").trim(),
    codice: ricambioCodiceForUi(row.codice),
    codiceSecondario: normalizeRicambioCodice(fromMeta.codiceFornitoreOriginaleSecondario ?? ""),
    fornitoriAlternativi,
    fornitoreAlternativo,
    codiceAlternativo,
  };
}

export function magazzinoRicambioEntityType(): typeof INVENTORY_ENTITY_MAGAZZINO_RICAMBIO {
  return INVENTORY_ENTITY_MAGAZZINO_RICAMBIO;
}
