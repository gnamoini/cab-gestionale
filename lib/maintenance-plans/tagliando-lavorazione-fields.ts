export type MaintenanceExecutionKind = "scheduled" | "extraordinary";

/** UI: tipo intervento lavorazione (mappa su is_tagliando + repair_present). */
export type LavorazioneInterventionType = "riparazione" | "tagliando" | "riparazione_tagliando";

export type TagliandoLavorazioneFields = {
  isTagliando: boolean;
  maintenanceExecutionKind: MaintenanceExecutionKind;
  repairPresent: boolean;
  tagliandoPresetRef: string | null;
  tagliandoPresetVersionRef: string | null;
  tagliandoAssignPresetToMezzo: boolean | null;
  tagliandoNoPresetReason: string | null;
};

export const DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS: TagliandoLavorazioneFields = {
  isTagliando: false,
  maintenanceExecutionKind: "scheduled",
  repairPresent: false,
  tagliandoPresetRef: null,
  tagliandoPresetVersionRef: null,
  tagliandoAssignPresetToMezzo: null,
  tagliandoNoPresetReason: null,
};

export function interventionTypeFromTagliandoFields(fields: {
  isTagliando: boolean;
  repairPresent: boolean;
}): LavorazioneInterventionType {
  if (!fields.isTagliando) return "riparazione";
  return fields.repairPresent ? "riparazione_tagliando" : "tagliando";
}

/** Etichetta pill hub / liste (allineata alla scheda ingresso, uppercase). */
export function interventionTypePillLabel(type: LavorazioneInterventionType): string {
  switch (type) {
    case "riparazione":
      return "RIPARAZIONE";
    case "tagliando":
      return "TAGLIANDO";
    case "riparazione_tagliando":
      return "TAGLIANDO+RIPARAZIONE";
  }
}

export function tagliandoFieldsFromInterventionType(
  type: LavorazioneInterventionType,
): Pick<TagliandoLavorazioneFields, "isTagliando" | "repairPresent"> {
  switch (type) {
    case "riparazione":
      return { isTagliando: false, repairPresent: false };
    case "tagliando":
      return { isTagliando: true, repairPresent: false };
    case "riparazione_tagliando":
      return { isTagliando: true, repairPresent: true };
  }
}

export function tagliandoFieldsToLavorazionePatch(fields: TagliandoLavorazioneFields): Record<string, unknown> {
  return {
    is_tagliando: fields.isTagliando,
    maintenance_execution_kind: fields.isTagliando ? fields.maintenanceExecutionKind : null,
    repair_present: fields.isTagliando ? fields.repairPresent : false,
    tagliando_preset_ref: fields.tagliandoPresetRef,
    tagliando_preset_version_ref: fields.tagliandoPresetVersionRef,
    tagliando_assign_preset_to_mezzo: fields.tagliandoAssignPresetToMezzo,
    tagliando_no_preset_reason: fields.tagliandoNoPresetReason,
  };
}

export function lavorazioneRowToTagliandoFields(row: {
  is_tagliando?: boolean | null;
  maintenance_execution_kind?: MaintenanceExecutionKind | null;
  repair_present?: boolean | null;
  tagliando_preset_ref?: string | null;
  tagliando_preset_version_ref?: string | null;
  tagliando_assign_preset_to_mezzo?: boolean | null;
  tagliando_no_preset_reason?: string | null;
}): TagliandoLavorazioneFields {
  return {
    isTagliando: Boolean(row.is_tagliando),
    maintenanceExecutionKind: row.maintenance_execution_kind ?? "scheduled",
    repairPresent: Boolean(row.repair_present),
    tagliandoPresetRef: row.tagliando_preset_ref ?? null,
    tagliandoPresetVersionRef: row.tagliando_preset_version_ref ?? null,
    tagliandoAssignPresetToMezzo: row.tagliando_assign_preset_to_mezzo ?? null,
    tagliandoNoPresetReason: row.tagliando_no_preset_reason ?? null,
  };
}
