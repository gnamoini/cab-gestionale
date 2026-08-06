import {
  PreferredMezzoInvalidError,
  resolveExplicitMezzoFromCatalog,
  type MezzoResolutionResult,
} from "@/lib/domain/mezzo/mezzo-resolution";
import { resolveMezzoBySchedaFromCatalog } from "@/lib/mezzi/find-mezzo-by-ident";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type MezzoMatchKind =
  | "explicit"
  | "needs_confirm"
  | "ambiguous"
  | "none"
  | "error";

export type ResolveMezzoFromSchedaParams = {
  scheda: SchedaIngressoFields;
  existingMezzi: readonly MezzoGestito[];
  preferredMezzoId?: string | null;
};

export type ResolveMezzoFromSchedaResult = {
  mezzoId: string | null;
  matchKind: MezzoMatchKind;
  mezzo: MezzoGestito | null;
  resolution?: MezzoResolutionResult;
  errorCode?: string;
  errorMessage?: string;
};

/**
 * Risolve il mezzo target da scheda ingresso.
 * preferredMezzoId valido = SSOT esplicito (nessun override ident).
 * Senza preferred → needs_confirm | ambiguous | none — mai auto-link ident.
 */
export function resolveMezzoFromScheda(params: ResolveMezzoFromSchedaParams): ResolveMezzoFromSchedaResult {
  const { scheda, existingMezzi, preferredMezzoId } = params;
  const preferred = preferredMezzoId?.trim();

  if (preferred) {
    const explicit = resolveExplicitMezzoFromCatalog(preferred, existingMezzi);
    if (explicit.status === "error") {
      return {
        mezzoId: null,
        matchKind: "error",
        mezzo: null,
        resolution: explicit,
        errorCode: explicit.code,
        errorMessage: explicit.message,
      };
    }
    if (explicit.status !== "resolved") {
      return {
        mezzoId: null,
        matchKind: "error",
        mezzo: null,
        resolution: explicit,
        errorCode: "PREFERRED_MEZZO_UNRESOLVED",
        errorMessage: "Mezzo preferito non risolvibile.",
      };
    }
    const mezzo = existingMezzi.find((m) => m.id === explicit.mezzoId) ?? null;
    return {
      mezzoId: explicit.mezzoId,
      matchKind: "explicit",
      mezzo,
      resolution: explicit,
    };
  }

  const identResult = resolveMezzoBySchedaFromCatalog(scheda, existingMezzi);
  if (identResult.status === "needs_confirm") {
    const topId = identResult.topCandidateId;
    const mezzo = topId ? existingMezzi.find((m) => m.id === topId) ?? null : null;
    return {
      mezzoId: null,
      matchKind: "needs_confirm",
      mezzo,
      resolution: identResult,
    };
  }
  if (identResult.status === "ambiguous") {
    return {
      mezzoId: null,
      matchKind: "ambiguous",
      mezzo: null,
      resolution: identResult,
    };
  }

  return { mezzoId: null, matchKind: "none", mezzo: null, resolution: identResult };
}

/** Lancia se preferred invalido — per write path che non ammette fallback. */
export function assertResolvableMezzoFromScheda(params: ResolveMezzoFromSchedaParams): ResolveMezzoFromSchedaResult {
  const result = resolveMezzoFromScheda(params);
  if (result.matchKind === "error" && result.errorCode) {
    throw new PreferredMezzoInvalidError(
      result.errorCode as "preferred_mezzo_not_found" | "preferred_mezzo_forbidden",
      result.errorMessage ?? "Mezzo selezionato non valido.",
    );
  }
  return result;
}
