import { normCliente } from "@/lib/domain/mezzo/mezzo-identity";
import type { MezzoAnagraficaHistoryEventKind } from "@/lib/domain/mezzo/record-mezzo-anagrafica-change";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoUpdate } from "@/src/services/mezzi.service";
import type { SchedaIngressoFields } from "@/types/schede";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { MezzoUpdateFromSchedaPlan } from "@/lib/domain/mezzo/mezzo-update-from-scheda-plan";

/** SSOT: key + label — zero stringhe duplicate in dialog/timeline/audit */
export const MEZZO_ASSOCIATION_FIELD_DEFS = [
  { key: "cliente", label: "Cliente" },
  { key: "cantiere", label: "Cantiere" },
  { key: "utilizzatore", label: "Utilizzatore" },
] as const;

export type MezzoAssociationField = (typeof MEZZO_ASSOCIATION_FIELD_DEFS)[number]["key"];

export const MEZZO_ASSOCIATION_KEYS: readonly MezzoAssociationField[] = MEZZO_ASSOCIATION_FIELD_DEFS.map(
  (d) => d.key,
);

export type AssociationSnapshot = Record<MezzoAssociationField, string>;

export type AssociationChange = {
  hasChanges: boolean;
  changedFields: MezzoAssociationField[];
  oldValues: AssociationSnapshot;
  newValues: AssociationSnapshot;
  requiresConfirmation: boolean;
};

export const ASSOCIATION_FIELDS_REQUIRE_DEDICATED_PATH =
  "I campi cliente, cantiere e utilizzatore vanno aggiornati tramite applyAssociationChange.";

const EMPTY_ASSOCIATION: AssociationSnapshot = {
  cliente: "",
  cantiere: "",
  utilizzatore: "",
};

function displayValue(v: string): string {
  return v.trim() || "—";
}

export function normalizeAssociationValue(field: MezzoAssociationField, value: string): string {
  const t = value.trim();
  if (!t) return "";
  if (field === "cliente") return normCliente(t) ?? "";
  return t.toLowerCase();
}

export function associationFieldLabel(key: MezzoAssociationField): string {
  return MEZZO_ASSOCIATION_FIELD_DEFS.find((d) => d.key === key)?.label ?? key;
}

export function associationTimelineTitle(changedFields: readonly MezzoAssociationField[]): string {
  if (changedFields.length === 1) {
    return `${associationFieldLabel(changedFields[0]!)} aggiornato`;
  }
  return "Associazione mezzo aggiornata";
}

export function associationFromMezzo(mezzo: MezzoGestito): AssociationSnapshot {
  return {
    cliente: displayValue(mezzo.cliente ?? ""),
    cantiere: displayValue(mezzo.cantiere ?? ""),
    utilizzatore: displayValue(mezzo.utilizzatore ?? ""),
  };
}

export function associationFromForm(form: {
  cliente: string;
  cantiere: string;
  utilizzatore: string;
}): AssociationSnapshot {
  return {
    cliente: displayValue(form.cliente),
    cantiere: displayValue(form.cantiere),
    utilizzatore: displayValue(form.utilizzatore),
  };
}

export function associationFromScheda(fields: SchedaIngressoFields): AssociationSnapshot {
  return {
    cliente: displayValue(fields.cliente ?? ""),
    cantiere: displayValue(fields.cantiere ?? ""),
    utilizzatore: displayValue(fields.utilizzatore ?? ""),
  };
}

export function associationSnapshotsEqual(a: AssociationSnapshot, b: AssociationSnapshot): boolean {
  for (const key of MEZZO_ASSOCIATION_KEYS) {
    if (normalizeAssociationValue(key, a[key]) !== normalizeAssociationValue(key, b[key])) {
      return false;
    }
  }
  return true;
}

export function isMezzoAssociationField(key: string): key is MezzoAssociationField {
  return (MEZZO_ASSOCIATION_KEYS as readonly string[]).includes(key);
}

export function deriveEventKind(changedFields: readonly string[]): MezzoAnagraficaHistoryEventKind {
  const hasAssociation = changedFields.some((f) => isMezzoAssociationField(f));
  return hasAssociation ? "association_change" : "anagrafica_change";
}

export function mezzoUpdateTouchesAssociationFields(patch: MezzoUpdate): boolean {
  if (patch.cliente !== undefined) return true;
  if (patch.utilizzatore !== undefined) return true;
  if (patch.meta !== undefined && typeof patch.meta === "object" && patch.meta !== null) {
    if ("cantiere" in (patch.meta as Record<string, unknown>)) return true;
  }
  return false;
}

export function associationSnapshotToMezzoPatch(snapshot: AssociationSnapshot): MezzoUpdate {
  const patch: MezzoUpdate = {
    cliente: snapshot.cliente.trim() || undefined,
    utilizzatore: snapshot.utilizzatore.trim() || null,
  };
  if (snapshot.cantiere.trim()) {
    patch.meta = { cantiere: snapshot.cantiere.trim() };
  } else {
    patch.meta = { cantiere: "" };
  }
  return patch;
}

export function isAssociationHistoryEntry(changedFields: readonly string[]): boolean {
  return changedFields.some((f) => isMezzoAssociationField(f));
}

export function stripAssociationFieldsFromPlan(plan: MezzoUpdateFromSchedaPlan): MezzoUpdateFromSchedaPlan {
  if (!plan.updateAnagrafica) return plan;
  const fieldsToUpdate = plan.fieldsToUpdate.filter(
    (f) => !isMezzoAssociationField(f as MezzoAssociationField),
  ) as MezzoPermanentFieldKey[];
  return {
    ...plan,
    fieldsToUpdate,
    updateAnagrafica: fieldsToUpdate.length > 0,
  };
}

export function checkAssociationChange(input: {
  existingMezzo: MezzoGestito | null;
  incoming: AssociationSnapshot;
}): AssociationChange {
  const oldValues = input.existingMezzo ? associationFromMezzo(input.existingMezzo) : { ...EMPTY_ASSOCIATION };
  const newValues: AssociationSnapshot = {
    cliente: displayValue(input.incoming.cliente),
    cantiere: displayValue(input.incoming.cantiere),
    utilizzatore: displayValue(input.incoming.utilizzatore),
  };

  const changedFields: MezzoAssociationField[] = [];
  for (const key of MEZZO_ASSOCIATION_KEYS) {
    const a = normalizeAssociationValue(key, oldValues[key]);
    const b = normalizeAssociationValue(key, newValues[key]);
    if (a !== b) changedFields.push(key);
  }

  const hasChanges = changedFields.length > 0;
  const requiresConfirmation = input.existingMezzo !== null && hasChanges;

  return {
    hasChanges,
    changedFields,
    oldValues,
    newValues,
    requiresConfirmation,
  };
}
