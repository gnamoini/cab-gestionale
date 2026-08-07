import type { LavorazioneMezzoEntryOrigin } from "@/lib/lavorazioni/selected-mezzo-context";
import { isNeutralListOptionLabel } from "@/lib/ui/list-select-utils";
import { entityAutocompleteKey } from "@/lib/validation/global-entity-validation";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  resolveIngressoMezzoMatchFromCatalog,
  type IngressoMezzoMatchReason,
  type IngressoMezzoMatchResult,
  type IngressoMezzoScoredCandidate,
  type MezzoLinkOrigin,
} from "@/lib/schede/scheda-ingresso-mezzo-match";
import type { SchedaIngressoFields } from "@/types/schede";

export type MezzoLinkSkipReason =
  | "catalog_prelinked"
  | "already_linked"
  | "no_trusted_match"
  | "create_new";

export type MezzoLinkConfirmationDecision =
  | {
      action: "skip";
      reason: MezzoLinkSkipReason;
      preferredMezzoId: string | null;
      linkOrigin: MezzoLinkOrigin;
    }
  | {
      action: "confirm";
      match: Extract<IngressoMezzoMatchResult, { status: "needs_confirm" }>;
    }
  | {
      action: "pick";
      match: Extract<IngressoMezzoMatchResult, { status: "ambiguous" }>;
    };

const STRONG_GAP_THRESHOLD = 20;

function normEquipmentField(value: string): string {
  if (isNeutralListOptionLabel(value)) return "";
  return entityAutocompleteKey(value);
}

/** Equivalenza marca/modello attrezzatura scheda vs anagrafica mezzo. */
export function isEquipmentIdentityEquivalent(
  schedaMarca: string,
  schedaModello: string,
  mezzoMarca: string,
  mezzoModello: string,
): boolean {
  const sm = normEquipmentField(schedaMarca);
  const sMod = normEquipmentField(schedaModello);
  const mm = normEquipmentField(mezzoMarca);
  const mMod = normEquipmentField(mezzoModello);
  if (!sm || !sMod || !mm || !mMod) return false;
  return sm === mm && sMod === mMod;
}

/** Match affidabile per il modal di collegamento (policy UI — scorer invariato). */
export function isTrustedMezzoMatch(
  scheda: SchedaIngressoFields,
  candidate: IngressoMezzoScoredCandidate,
): boolean {
  const { matchedFields } = candidate;
  if (matchedFields.includes("targa") || matchedFields.includes("vin")) return true;
  if (!matchedFields.includes("matricola")) return false;
  return isEquipmentIdentityEquivalent(
    scheda.marcaAttrezzatura,
    scheda.modelloAttrezzatura,
    candidate.mezzo.marca,
    candidate.mezzo.modello,
  );
}

function skipDecision(
  reason: MezzoLinkSkipReason,
  preferredMezzoId: string | null,
  linkOrigin: MezzoLinkOrigin,
): MezzoLinkConfirmationDecision {
  return { action: "skip", reason, preferredMezzoId, linkOrigin };
}

function collectScoredCandidates(match: IngressoMezzoMatchResult): IngressoMezzoScoredCandidate[] {
  if (match.status === "needs_confirm") return match.candidates;
  if (match.status === "ambiguous") return match.candidates;
  return [];
}

function buildConfirmMatch(
  top: IngressoMezzoScoredCandidate,
  trusted: IngressoMezzoScoredCandidate[],
  reason: IngressoMezzoMatchReason,
): Extract<MezzoLinkConfirmationDecision, { action: "confirm" }> {
  return {
    action: "confirm",
    match: {
      status: "needs_confirm",
      candidate: top,
      candidates: trusted,
      reason,
    },
  };
}

function buildPickMatch(
  trusted: IngressoMezzoScoredCandidate[],
  reason: IngressoMezzoMatchReason | undefined,
): Extract<MezzoLinkConfirmationDecision, { action: "pick" }> {
  const top = trusted[0]!;
  return {
    action: "pick",
    match: {
      status: "ambiguous",
      candidates: trusted,
      reason: reason ?? {
        matchedFields: top.matchedFields,
        score: top.score,
        confidence: top.confidence,
      },
    },
  };
}

function resolveTrustedMatchDecision(
  scheda: SchedaIngressoFields,
  raw: IngressoMezzoMatchResult,
): MezzoLinkConfirmationDecision {
  if (raw.status === "not_found") {
    return skipDecision("create_new", null, "created_new");
  }

  const trusted = collectScoredCandidates(raw)
    .filter((c) => isTrustedMezzoMatch(scheda, c))
    .sort((a, b) => b.score - a.score);

  if (trusted.length === 0) {
    return skipDecision("no_trusted_match", null, "created_new");
  }

  const top = trusted[0]!;
  const second = trusted[1];
  const gap = second ? top.score - second.score : top.score;
  const ambiguousByGap = second != null && second.score > 0 && gap < STRONG_GAP_THRESHOLD;

  if (trusted.length > 1 && ambiguousByGap) {
    return buildPickMatch(trusted, raw.reason);
  }

  const reason =
    raw.status === "needs_confirm"
      ? raw.reason
      : {
          matchedFields: top.matchedFields,
          score: top.score,
          confidence: top.confidence,
        };

  return buildConfirmMatch(top, trusted, reason);
}

export function resolveMezzoLinkConfirmationDecision(input: {
  entryOrigin: LavorazioneMezzoEntryOrigin;
  scheda: SchedaIngressoFields;
  catalog: readonly MezzoGestito[];
  prelinkedMezzoId?: string | null;
  preferredMezzoId?: string | null;
  linkedOrigin?: MezzoLinkOrigin | null;
}): MezzoLinkConfirmationDecision {
  const {
    entryOrigin,
    scheda,
    catalog,
    prelinkedMezzoId,
    preferredMezzoId,
    linkedOrigin,
  } = input;

  const prelinked = prelinkedMezzoId?.trim();
  if (entryOrigin === "catalog_selected" && prelinked) {
    return skipDecision("catalog_prelinked", prelinked, "selected_by_user");
  }

  const preferred = preferredMezzoId?.trim();
  if (
    preferred &&
    (linkedOrigin === "selected_by_user" || linkedOrigin === "auto_confirmed")
  ) {
    return skipDecision("already_linked", preferred, linkedOrigin ?? "selected_by_user");
  }

  const raw = resolveIngressoMezzoMatchFromCatalog(scheda, catalog);
  return resolveTrustedMatchDecision(scheda, raw);
}
