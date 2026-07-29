export type MaintenanceExecutionKind = "scheduled" | "extraordinary";

/** UI: tipo intervento lavorazione (mappa su is_tagliando + repair_present). */
export type LavorazioneInterventionType = "riparazione" | "tagliando" | "riparazione_tagliando";

export type TagliandoLavorazioneFields = {
  isTagliando: boolean;
  isGaranzia: boolean;
  isRecidivo: boolean;
  maintenanceExecutionKind: MaintenanceExecutionKind;
  repairPresent: boolean;
  tagliandoPresetRef: string | null;
  tagliandoPresetVersionRef: string | null;
  tagliandoAssignPresetToMezzo: boolean | null;
  tagliandoNoPresetReason: string | null;
};

export const DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS: TagliandoLavorazioneFields = {
  isTagliando: false,
  isGaranzia: false,
  isRecidivo: false,
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
  if (!fields.isTagliando) return fields.repairPresent ? "riparazione" : "riparazione";
  return fields.repairPresent ? "riparazione_tagliando" : "tagliando";
}

/** Label composita per hub/liste quando i flag sono indipendenti. */
export function interventionLabelsFromTagliandoFields(
  fields: Pick<TagliandoLavorazioneFields, "repairPresent" | "isTagliando" | "isGaranzia" | "isRecidivo">,
): string[] {
  const labels: string[] = [];
  if (fields.repairPresent) labels.push("Riparazione");
  if (fields.isTagliando) labels.push("Tagliando");
  if (fields.isGaranzia) labels.push("Garanzia");
  if (fields.isRecidivo) labels.push("Recidivo");
  return labels;
}

export function interventionLabelFromTagliandoFields(
  fields: Pick<TagliandoLavorazioneFields, "repairPresent" | "isTagliando" | "isGaranzia" | "isRecidivo">,
): string | null {
  const labels = interventionLabelsFromTagliandoFields(fields);
  return labels.length > 0 ? labels.join(" + ") : null;
}

/** Etichetta pill hub / liste (stesso casing della scheda ingresso). */
export function interventionTypePillLabel(type: LavorazioneInterventionType): string {
  return interventionTypeShortBadge(type).title;
}

/** Badge compatto liste: solo tagliando → T (anche tagliando+riparazione). */
export function interventionTypeShortBadge(type: LavorazioneInterventionType): {
  code: "R" | "T";
  title: string;
} {
  switch (type) {
    case "riparazione":
      return { code: "R", title: "Riparazione" };
    case "tagliando":
      return { code: "T", title: "Tagliando" };
    case "riparazione_tagliando":
      return { code: "T", title: "Tagliando + riparazione" };
  }
}

export function tagliandoFieldsFromInterventionType(
  type: LavorazioneInterventionType,
): Pick<TagliandoLavorazioneFields, "isTagliando" | "repairPresent"> {
  switch (type) {
    case "riparazione":
      return { isTagliando: false, repairPresent: true };
    case "tagliando":
      return { isTagliando: true, repairPresent: false };
    case "riparazione_tagliando":
      return { isTagliando: true, repairPresent: true };
  }
}

export function tagliandoFieldsToLavorazionePatch(fields: TagliandoLavorazioneFields): Record<string, unknown> {
  return {
    is_tagliando: fields.isTagliando,
    is_garanzia: fields.isGaranzia,
    is_recidivo: fields.isRecidivo,
    maintenance_execution_kind: fields.isTagliando ? fields.maintenanceExecutionKind : null,
    repair_present: fields.repairPresent,
    tagliando_preset_ref: fields.tagliandoPresetRef,
    tagliando_preset_version_ref: fields.tagliandoPresetVersionRef,
    tagliando_assign_preset_to_mezzo: fields.tagliandoAssignPresetToMezzo,
    tagliando_no_preset_reason: fields.tagliandoNoPresetReason,
  };
}

export function lavorazioneRowToTagliandoFields(row: {
  is_tagliando?: boolean | null;
  is_garanzia?: boolean | null;
  is_recidivo?: boolean | null;
  maintenance_execution_kind?: MaintenanceExecutionKind | null;
  repair_present?: boolean | null;
  tagliando_preset_ref?: string | null;
  tagliando_preset_version_ref?: string | null;
  tagliando_assign_preset_to_mezzo?: boolean | null;
  tagliando_no_preset_reason?: string | null;
}): TagliandoLavorazioneFields {
  return {
    isTagliando: Boolean(row.is_tagliando),
    isGaranzia: Boolean(row.is_garanzia),
    isRecidivo: Boolean(row.is_recidivo),
    maintenanceExecutionKind: row.maintenance_execution_kind ?? "scheduled",
    repairPresent: Boolean(row.repair_present),
    tagliandoPresetRef: row.tagliando_preset_ref ?? null,
    tagliandoPresetVersionRef: row.tagliando_preset_version_ref ?? null,
    tagliandoAssignPresetToMezzo: row.tagliando_assign_preset_to_mezzo ?? null,
    tagliandoNoPresetReason: row.tagliando_no_preset_reason ?? null,
  };
}
