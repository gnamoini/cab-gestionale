import { detectMezzoAnagraficaChanges } from "@/lib/domain/mezzo/detect-mezzo-anagrafica-changes";
import { evaluateMezzoMeteringUpdate } from "@/lib/domain/mezzo/evaluate-mezzo-metering-update";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { pickMezzoPermanentFields } from "@/lib/schede/scheda-ingresso-field-roles";
import {
  isMezzoSnapshotStale,
  type LinkedMezzoSnapshot,
} from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import type { MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type AnagraficaChangeRow = {
  field: MezzoPermanentFieldKey;
  label: string;
  prima: string;
  dopo: string;
};

export type MeteringWarningRow = {
  tipo: "km" | "ore";
  prima: number | null;
  dopo: number | null;
  severity: "lower" | "empty";
};

export type ConflictSummary = {
  hasIssues: boolean;
  mezzoStale: boolean;
  anagraficaChanges: AnagraficaChangeRow[];
  meteringWarnings: MeteringWarningRow[];
};

export const MEZZO_PERMANENT_FIELD_LABELS: Record<MezzoPermanentFieldKey, string> = {
  targetType: "Oggetto intervento",
  attrezzaturaId: "Attrezzatura",
  cliente: "Cliente",
  cantiere: "Cantiere",
  utilizzatore: "Utilizzatore",
  richiedente: "Richiedente",
  richiedenteTelefono: "Telefono richiedente",
  tipoAttrezzatura: "Tipo attrezzatura",
  marcaAttrezzatura: "Marca",
  modelloAttrezzatura: "Modello",
  matricola: "Matricola",
  nScuderia: "N. scuderia",
  tipoTelaio: "Tipo telaio",
  marcaTelaio: "Marca telaio",
  modelloTelaio: "Modello telaio",
  vin: "VIN",
  targa: "Targa",
};

function fieldStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

export function buildSchedaSaveConflictSummary(input: {
  fields: SchedaIngressoFields;
  linkedSnapshot: LinkedMezzoSnapshot | null;
  mezzo: MezzoGestito | null | undefined;
}): ConflictSummary {
  const { fields, linkedSnapshot, mezzo } = input;

  const baseline =
    linkedSnapshot?.fieldsAtLinkTime ??
    (mezzo ? pickMezzoPermanentFields(buildSchedaIngressoFieldsFromMezzo(mezzo)) : null);
  const detected = baseline
    ? detectMezzoAnagraficaChanges(baseline, fields)
    : { hasChanges: false, changes: [] };
  const anagraficaChanges: AnagraficaChangeRow[] = detected.changes.map((c) => ({
    field: c.field,
    label: c.label,
    prima: c.oldValue,
    dopo: c.newValue,
  }));

  const meteringWarnings: MeteringWarningRow[] = [];
  const kmEv = evaluateMezzoMeteringUpdate("km", fields.km, mezzo);
  if (kmEv.action === "warn_lower") {
    meteringWarnings.push({
      tipo: "km",
      prima: kmEv.current,
      dopo: kmEv.incoming,
      severity: "lower",
    });
  }
  const oreEv = evaluateMezzoMeteringUpdate("oreLavoro", fields.oreLavoro, mezzo);
  if (oreEv.action === "warn_lower") {
    meteringWarnings.push({
      tipo: "ore",
      prima: oreEv.current,
      dopo: oreEv.incoming,
      severity: "lower",
    });
  }

  const mezzoStale = linkedSnapshot ? isMezzoSnapshotStale(linkedSnapshot, mezzo) : false;
  const hasIssues = anagraficaChanges.length > 0;

  return { hasIssues, mezzoStale, anagraficaChanges, meteringWarnings };
}
