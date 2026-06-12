import { findMezzoByIngressoIdent } from "@/lib/mezzi/find-mezzo-by-ident";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type MezzoMatchKind = "ident" | "preferred" | "none";

export type ResolveMezzoFromSchedaParams = {
  scheda: SchedaIngressoFields;
  existingMezzi: readonly MezzoGestito[];
  preferredMezzoId?: string | null;
};

export type ResolveMezzoFromSchedaResult = {
  mezzoId: string | null;
  matchKind: MezzoMatchKind;
  mezzo: MezzoGestito | null;
};

/**
 * Risolve il mezzo target da scheda ingresso.
 * Priorità assoluta: ident (targa / matricola / scuderia) > preferredMezzoId.
 */
export function resolveMezzoFromScheda(params: ResolveMezzoFromSchedaParams): ResolveMezzoFromSchedaResult {
  const { scheda, existingMezzi, preferredMezzoId } = params;

  const byIdent = findMezzoByIngressoIdent(existingMezzi, {
    targa: scheda.targa,
    matricola: scheda.matricola,
    nScuderia: scheda.nScuderia,
  });
  if (byIdent) {
    return { mezzoId: byIdent.id, matchKind: "ident", mezzo: byIdent };
  }

  const preferred = preferredMezzoId?.trim();
  if (preferred) {
    const hit = existingMezzi.find((m) => m.id === preferred) ?? null;
    if (hit) {
      return { mezzoId: hit.id, matchKind: "preferred", mezzo: hit };
    }
  }

  return { mezzoId: null, matchKind: "none", mezzo: null };
}
