"use client";

import { maintenancePlansEntry } from "@/lib/domain/maintenance-plans-entry";
import type { TagliandoLavorazioneFields } from "@/lib/maintenance-plans/tagliando-lavorazione-fields";

/** Persiste il preset sul mezzo (sezione tagliandi) quando richiesto dal flusso lavorazione. */
export async function assignTagliandoPresetToMezzoOnSave(input: {
  mezzoId: string | null | undefined;
  tagliandoFields: TagliandoLavorazioneFields;
}): Promise<{ ok: true; assigned: boolean } | { ok: false; error: string }> {
  const mezzoId = input.mezzoId?.trim() ?? "";
  const { tagliandoFields } = input;
  if (
    !tagliandoFields.isTagliando ||
    !tagliandoFields.tagliandoAssignPresetToMezzo ||
    !tagliandoFields.tagliandoPresetRef?.trim() ||
    !mezzoId
  ) {
    return { ok: true, assigned: false };
  }

  const res = await maintenancePlansEntry.bulkAssignPresetToMezzi({
    presetId: tagliandoFields.tagliandoPresetRef.trim(),
    mezzoIds: [mezzoId],
  });
  if (!res.success) {
    return { ok: false, error: res.error ?? "Assegnazione preset al mezzo fallita." };
  }
  return { ok: true, assigned: (res.data?.assigned ?? 0) > 0 };
}
