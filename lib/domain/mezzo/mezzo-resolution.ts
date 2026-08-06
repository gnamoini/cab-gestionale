import type { SupabaseClient } from "@supabase/supabase-js";
import type { IngressoMezzoMatchReason } from "@/lib/schede/scheda-ingresso-mezzo-match";
import type { MezzoGestito } from "@/lib/mezzi/types";

export type MezzoIngressoIdent = {
  targa?: string;
  matricola?: string;
  nScuderia?: string;
  vin?: string;
};

export type MezzoCandidate = {
  mezzoId: string;
  cliente: string;
  targa?: string | null;
  matricola?: string | null;
  numeroScuderia?: string | null;
  matchSignals: string[];
  score?: number;
};

export type MezzoResolutionResult =
  | {
      status: "resolved";
      mezzoId: string;
      source: "explicit" | "ident";
    }
  | {
      status: "needs_confirm";
      candidates: MezzoCandidate[];
      identUsed?: MezzoIngressoIdent;
      topCandidateId?: string;
      matchReason?: IngressoMezzoMatchReason;
    }
  | {
      status: "ambiguous";
      candidates: MezzoCandidate[];
      identUsed?: MezzoIngressoIdent;
      matchReason?: IngressoMezzoMatchReason;
    }
  | {
      status: "not_found";
      identUsed?: MezzoIngressoIdent;
    }
  | {
      status: "error";
      code: "preferred_mezzo_not_found" | "preferred_mezzo_forbidden";
      message: string;
    };

export class PreferredMezzoInvalidError extends Error {
  readonly code: "preferred_mezzo_not_found" | "preferred_mezzo_forbidden";

  constructor(code: PreferredMezzoInvalidError["code"], message: string) {
    super(message);
    this.name = "PreferredMezzoInvalidError";
    this.code = code;
  }
}

export function mezzoGestitoToCandidate(
  m: MezzoGestito,
  matchSignals: string[],
  score?: number,
): MezzoCandidate {
  return {
    mezzoId: m.id,
    cliente: m.cliente,
    targa: m.targa,
    matricola: m.matricola,
    numeroScuderia: m.numeroScuderia,
    matchSignals,
    score,
  };
}

/** Verifica esistenza mezzo nel catalogo in-memory (client / scheda ingresso). */
export function verifyMezzoExistsInCatalog(
  mezzoId: string,
  catalog: readonly MezzoGestito[],
): MezzoGestito | null {
  const id = mezzoId.trim();
  if (!id) return null;
  return catalog.find((m) => m.id === id) ?? null;
}

/** Verifica esistenza mezzo su DB (server). RLS applica ownership/tenant. */
export async function verifyMezzoExistsServer(
  sb: SupabaseClient,
  mezzoId: string,
): Promise<boolean> {
  const id = mezzoId.trim();
  if (!id) return false;
  const { data, error } = await sb.from("mezzi").select("id").eq("id", id).maybeSingle();
  if (error) return false;
  return Boolean(data?.id);
}

/**
 * preferredMezzoId valido nel catalogo = SSOT esplicito.
 * Invalido = errore, mai fallback su ident.
 */
export function resolveExplicitMezzoFromCatalog(
  preferredMezzoId: string | null | undefined,
  catalog: readonly MezzoGestito[],
): MezzoResolutionResult {
  const id = preferredMezzoId?.trim();
  if (!id) return { status: "not_found" };
  const hit = verifyMezzoExistsInCatalog(id, catalog);
  if (!hit) {
    return {
      status: "error",
      code: "preferred_mezzo_not_found",
      message: `Mezzo selezionato non trovato (${id}).`,
    };
  }
  return { status: "resolved", mezzoId: hit.id, source: "explicit" };
}

export function assertExplicitMezzoFromCatalog(
  preferredMezzoId: string,
  catalog: readonly MezzoGestito[],
): MezzoGestito {
  const result = resolveExplicitMezzoFromCatalog(preferredMezzoId, catalog);
  if (result.status === "resolved") {
    const hit = verifyMezzoExistsInCatalog(result.mezzoId, catalog);
    if (hit) return hit;
  }
  if (result.status === "error") {
    throw new PreferredMezzoInvalidError(result.code, result.message);
  }
  throw new PreferredMezzoInvalidError(
    "preferred_mezzo_not_found",
    `Mezzo selezionato non trovato (${preferredMezzoId}).`,
  );
}

export function resolutionToMezzoId(result: MezzoResolutionResult): string | null {
  return result.status === "resolved" ? result.mezzoId : null;
}

export function isAmbiguousResolution(result: MezzoResolutionResult): result is Extract<
  MezzoResolutionResult,
  { status: "ambiguous" }
> {
  return result.status === "ambiguous";
}
