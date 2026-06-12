import { auditInterventoContext } from "@/lib/domain/intervento-context/intervento-audit";
import type { InterventoIdent } from "@/lib/domain/intervento-context/intervento-context.types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import {
  listSchedaIngressoMatchesForIdent,
  mergeSchedaIngressoFields,
  type LastSchedaIngressoMatch,
} from "@/lib/schede/scheda-ingresso-reuse";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

export type CopyLastMode = "merge-empty" | "full-snapshot";

export type CopyLastLookupParams = {
  ident: InterventoIdent;
  mezzi: readonly MezzoGestito[];
  schedeStore: LavorazioneSchedeStore;
  attive: readonly LavorazioneAttiva[];
  storico: readonly LavorazioneArchiviata[];
  excludeLavorazioneId?: string;
};

export type CopyLastSchedaIngressoParams = CopyLastLookupParams & {
  mode: CopyLastMode;
  currentFields?: SchedaIngressoFields;
};

export type CopyLastResult =
  | { kind: "none" }
  | { kind: "single"; match: LastSchedaIngressoMatch; fields: SchedaIngressoFields }
  | { kind: "pick"; candidates: LastSchedaIngressoMatch[] };

function applyCopyStrategy(
  mode: CopyLastMode,
  currentFields: SchedaIngressoFields | undefined,
  match: LastSchedaIngressoMatch,
): SchedaIngressoFields {
  if (mode === "full-snapshot") {
    return { ...match.campi };
  }
  if (!currentFields) {
    throw new Error("copyLastSchedaIngresso: currentFields richiesto per mode merge-empty");
  }
  return mergeSchedaIngressoFields(currentFields, match.campi);
}

/** Elenco candidati per banner / pick dialog. */
export function listCopyLastSchedaIngressoCandidates(
  params: CopyLastLookupParams,
): LastSchedaIngressoMatch[] {
  return listSchedaIngressoMatchesForIdent(
    params.ident.targa,
    params.ident.matricola,
    params.ident.nScuderia,
    params.mezzi,
    params.schedeStore,
    params.attive,
    params.storico,
    params.excludeLavorazioneId ? { excludeLavorazioneId: params.excludeLavorazioneId } : undefined,
  );
}

/**
 * Entrypoint unico copia ultima scheda ingresso.
 * Lookup: targa / matricola / n. scuderia (+ mezzo collegato).
 */
export function copyLastSchedaIngresso(params: CopyLastSchedaIngressoParams): CopyLastResult {
  const candidates = listCopyLastSchedaIngressoCandidates(params);

  auditInterventoContext(null, "copy-last", {
    copyMode: params.mode,
    candidateCount: candidates.length,
    extra: { ident: params.ident },
  });

  if (candidates.length === 0) return { kind: "none" };
  if (candidates.length > 1) return { kind: "pick", candidates };

  const match = candidates[0]!;
  return {
    kind: "single",
    match,
    fields: applyCopyStrategy(params.mode, params.currentFields, match),
  };
}

/** Applica copia su match già selezionato (dialog pick). */
export function applyCopyLastSchedaMatch(
  mode: CopyLastMode,
  currentFields: SchedaIngressoFields | undefined,
  match: LastSchedaIngressoMatch,
): SchedaIngressoFields {
  return applyCopyStrategy(mode, currentFields, match);
}
