import {
  findActiveLavorazioneWithIngressoForCaptureIdent,
  type CaptureIdent,
} from "@/lib/document-capture/capture-lavorazione-match";
import { hasSchedaIngressoIdentLookup } from "@/lib/schede/scheda-ingresso-reuse";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import type { MezzoGestito } from "@/lib/mezzi/types";

export type SchedaIngressoInOfficinaHit = {
  lavorazioneId: string;
  cliente: string;
};

export function schedaIngressoFieldsToCaptureIdent(fields: SchedaIngressoFields): CaptureIdent {
  return {
    targa: fields.targa?.trim() ?? "",
    matricola: fields.matricola?.trim() ?? "",
    nScuderia: fields.nScuderia?.trim() ?? "",
    vin: fields.vin?.trim() ?? "",
    cliente: fields.cliente?.trim() ?? "",
  };
}

/** Lavorazione in corso con identificativi scheda ingresso in esatta corrispondenza. */
export function findActiveLavorazioneForSchedaIngressoIdent(
  fields: SchedaIngressoFields,
  mezzi: readonly MezzoGestito[],
  schedeStore: LavorazioneSchedeStore,
  attive: readonly LavorazioneAttiva[],
  excludeLavorazioneId?: string,
): SchedaIngressoInOfficinaHit | null {
  const ident = schedaIngressoFieldsToCaptureIdent(fields);
  if (
    !hasSchedaIngressoIdentLookup(ident.targa, ident.matricola, ident.nScuderia) &&
    !ident.vin.trim()
  ) {
    return null;
  }

  const filteredAttive = excludeLavorazioneId
    ? attive.filter((lav) => lav.id !== excludeLavorazioneId)
    : attive;
  if (filteredAttive.length === 0) return null;

  return findActiveLavorazioneWithIngressoForCaptureIdent(
    ident,
    mezzi,
    schedeStore,
    filteredAttive,
  );
}
