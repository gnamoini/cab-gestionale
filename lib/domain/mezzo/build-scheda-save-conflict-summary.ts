import {
  MEZZO_PERMANENT_FIELDS,
  type MezzoPermanentFieldKey,
} from "@/lib/schede/scheda-ingresso-field-roles";
import {
  isMezzoSnapshotStale,
  type LinkedMezzoSnapshot,
} from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import { evaluateMezzoMeteringUpdate } from "@/lib/domain/mezzo/evaluate-mezzo-metering-update";
import { isMezzoAssociationField } from "@/lib/domain/mezzo/mezzo-association";
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
  const anagraficaChanges: AnagraficaChangeRow[] = [];

  const baseline = linkedSnapshot?.fieldsAtLinkTime;
  if (baseline) {
    for (const key of MEZZO_PERMANENT_FIELDS) {
      if (isMezzoAssociationField(key)) continue;
      const prima = fieldStr(baseline[key]);
      const dopo = fieldStr(fields[key]);
      if (prima !== dopo) {
        anagraficaChanges.push({
          field: key,
          label: MEZZO_PERMANENT_FIELD_LABELS[key],
          prima: prima || "—",
          dopo: dopo || "—",
        });
      }
    }
  } else if (mezzo) {
    const fromMezzo = {
      cliente: mezzo.cliente,
      marcaAttrezzatura: mezzo.marca,
      modelloAttrezzatura: mezzo.modello,
      matricola: mezzo.matricola,
      targa: mezzo.targa,
      nScuderia: mezzo.numeroScuderia ?? "",
    };
    for (const key of ["marcaAttrezzatura", "modelloAttrezzatura", "matricola", "targa", "nScuderia"] as const) {
      const prima = fieldStr(fromMezzo[key]);
      const dopo = fieldStr(fields[key]);
      if (prima !== dopo && dopo) {
        anagraficaChanges.push({
          field: key,
          label: MEZZO_PERMANENT_FIELD_LABELS[key],
          prima: prima || "—",
          dopo,
        });
      }
    }
  }

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
  const hasIssues =
    anagraficaChanges.length > 0 || meteringWarnings.length > 0 || mezzoStale;

  return { hasIssues, mezzoStale, anagraficaChanges, meteringWarnings };
}
