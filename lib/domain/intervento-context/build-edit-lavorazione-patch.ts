import { parseItalianDayDisplayToIso } from "@/lib/ui/italian-date-input-mask";
import type { UpsertMezzoFromSchedaResult } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { LavorazioneListRow, LavorazioneUpdate } from "@/src/services/lavorazioni.service";
import type { SchedaIngressoFields } from "@/types/schede";

/** Patch lavorazione da upsert mezzo edit — non applicata; merge in ingresso-backend-sync. */
export function buildEditLavorazionePatchFromUpsert(
  row: LavorazioneListRow,
  fields: SchedaIngressoFields,
  upsert: Pick<UpsertMezzoFromSchedaResult, "mezzoId" | "targetType" | "attrezzaturaId">,
): LavorazioneUpdate {
  const lavPatch: LavorazioneUpdate = {};
  const parsedIngresso = parseItalianDayDisplayToIso(fields.dataIngresso.trim());
  if (parsedIngresso.ok) lavPatch.data_ingresso = parsedIngresso.iso;

  const mezzoId = upsert.mezzoId?.trim() || null;
  const targetType = upsert.targetType ?? row.target_type;
  const attrezzaturaId = upsert.attrezzaturaId ?? null;

  const currentFk = row.mezzo_id?.trim() || "";
  if (mezzoId && mezzoId !== currentFk) lavPatch.mezzo_id = mezzoId;
  if (targetType && targetType !== row.target_type) lavPatch.target_type = targetType;
  const nextAttId = targetType === "attrezzatura" ? attrezzaturaId : null;
  if ((row.attrezzatura_id ?? null) !== nextAttId) lavPatch.attrezzatura_id = nextAttId;

  return lavPatch;
}

/** Edit: mezzo_id invariato salvo cambio esplicito. */
export function applyMezzoIdImmutabilityGuard(
  row: LavorazioneListRow,
  patch: LavorazioneUpdate,
  explicitMezzoChange = false,
): LavorazioneUpdate {
  const next = { ...patch };
  const current = row.mezzo_id?.trim() || "";
  const proposed = typeof next.mezzo_id === "string" ? next.mezzo_id.trim() : "";
  if (current && proposed && proposed !== current && !explicitMezzoChange) {
    delete next.mezzo_id;
  }
  return next;
}

export function mergeLavorazionePatches(
  ...patches: Array<LavorazioneUpdate | Record<string, unknown>>
): LavorazioneUpdate {
  return Object.assign({}, ...patches) as LavorazioneUpdate;
}
