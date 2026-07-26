import { MezzoSchedaValidationError } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { ApplyAssociationChangeInput } from "@/lib/domain/mezzo/apply-association-change";
import { mezziService } from "@/src/services/mezzi.service";
import type { MezzoRow } from "@/src/types/supabase-tables";

/** Browser write bridge per upsert scheda / intervento. */
export async function applyMezzoAssociationChangeOrThrow(
  input: ApplyAssociationChangeInput,
): Promise<MezzoRow> {
  const res = await mezziService.applyAssociationChange(input);
  if (!res.success) {
    throw new MezzoSchedaValidationError(res.error ?? "Errore aggiornamento associazione mezzo.");
  }
  if (!res.data) {
    throw new MezzoSchedaValidationError("Aggiornamento associazione mezzo senza riga.");
  }
  return res.data;
}
