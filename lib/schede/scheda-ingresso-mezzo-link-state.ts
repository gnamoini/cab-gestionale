import { detectMezzoAnagraficaChanges } from "@/lib/domain/mezzo/detect-mezzo-anagrafica-changes";
import { pickMezzoPermanentFields, type MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import type { MezzoLinkOrigin } from "@/lib/schede/scheda-ingresso-mezzo-match";
import {
  resolveMezzoPrefillPolicy,
  type MezzoPrefillPolicy,
} from "@/lib/schede/scheda-ingresso-mezzo-prefill-policy";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";
import type { SchedaIngressoIdentField } from "@/lib/schede/scheda-ingresso-ident-suggest";
import { isMezzoUpdatedAtStale } from "@/lib/domain/mezzo/mezzo-occ";

export type MezzoLinkStatus = "new" | "linked" | "unconfirmed_match";

export type LinkedMezzoSnapshot = {
  id: string;
  fieldsAtLinkTime: Pick<SchedaIngressoFields, MezzoPermanentFieldKey>;
  linkedAt: string;
  linkedViaField: SchedaIngressoIdentField;
  /** Token OCC: mezzi.updated_at al momento del link */
  mezzoUpdatedAtAtLinkTime: string;
  mezzoVersion?: number;
  linkOrigin?: MezzoLinkOrigin;
  confirmed?: boolean;
  prefillPolicy?: MezzoPrefillPolicy;
};

export type SchedaIngressoMezzoLinkState = {
  status: MezzoLinkStatus;
  /** Mezzo trovato ma non ancora confermato dall'utente */
  pendingMezzo: MezzoGestito | null;
  /** Settato solo dopo click "Usa questo mezzo" */
  linkedSnapshot: LinkedMezzoSnapshot | null;
  linkOrigin?: MezzoLinkOrigin | null;
};

export function emptySchedaIngressoMezzoLinkState(): SchedaIngressoMezzoLinkState {
  return { status: "new", pendingMezzo: null, linkedSnapshot: null, linkOrigin: null };
}

export function createLinkedMezzoSnapshot(
  mezzo: MezzoGestito,
  linkedViaField: SchedaIngressoIdentField,
  linkOrigin: MezzoLinkOrigin = "selected_by_user",
): LinkedMezzoSnapshot {
  const fromMezzo = buildSchedaIngressoFieldsFromMezzo(mezzo);
  return createLinkedMezzoSnapshotFromFields(
    mezzo,
    pickMezzoPermanentFields(fromMezzo),
    linkedViaField,
    linkOrigin,
  );
}

/** Baseline da campi scheda all'apertura (edit) invece che da anagrafica live. */
export function createLinkedMezzoSnapshotFromFields(
  mezzo: MezzoGestito,
  fieldsAtOpen: Pick<SchedaIngressoFields, MezzoPermanentFieldKey>,
  linkedViaField: SchedaIngressoIdentField = "matricola",
  linkOrigin: MezzoLinkOrigin = "selected_by_user",
  confirmed = true,
): LinkedMezzoSnapshot {
  const prefillPolicy = resolveMezzoPrefillPolicy({
    linkOrigin,
    linkStatus: "linked",
    confirmed,
  });
  return {
    id: mezzo.id,
    fieldsAtLinkTime: fieldsAtOpen,
    linkedAt: new Date().toISOString(),
    linkedViaField,
    mezzoUpdatedAtAtLinkTime: mezzo.ultimaModifica?.trim() || new Date().toISOString(),
    linkOrigin,
    confirmed,
    prefillPolicy,
  };
}

/** preferredMezzoId al save solo se status === linked */
export function resolvePreferredMezzoIdForSave(state: SchedaIngressoMezzoLinkState): string | null {
  if (state.status !== "linked" || !state.linkedSnapshot) return null;
  return state.linkedSnapshot.id;
}

export function resolvePrefillPolicyFromLinkState(
  state: SchedaIngressoMezzoLinkState,
): MezzoPrefillPolicy {
  if (state.linkedSnapshot?.prefillPolicy) return state.linkedSnapshot.prefillPolicy;
  return resolveMezzoPrefillPolicy({
    linkOrigin: state.linkOrigin ?? state.linkedSnapshot?.linkOrigin,
    linkStatus: state.status,
    confirmed: state.linkedSnapshot?.confirmed,
  });
}

export function listLinkedMezzoFieldConflicts(
  fields: SchedaIngressoFields,
  snapshot: LinkedMezzoSnapshot | null,
): MezzoPermanentFieldKey[] {
  if (!snapshot) return [];
  return detectMezzoAnagraficaChanges(snapshot.fieldsAtLinkTime, fields).changes.map((c) => c.field);
}

export function hasLinkedMezzoFieldConflict(
  fields: SchedaIngressoFields,
  snapshot: LinkedMezzoSnapshot | null,
): boolean {
  return listLinkedMezzoFieldConflicts(fields, snapshot).length > 0;
}

export function isMezzoSnapshotStale(
  snapshot: LinkedMezzoSnapshot,
  mezzo: MezzoGestito | null | undefined,
): boolean {
  if (!mezzo || mezzo.id !== snapshot.id) return false;
  const live = mezzo.ultimaModifica?.trim();
  const atLink = snapshot.mezzoUpdatedAtAtLinkTime.trim();
  if (!live || !atLink) return false;
  return isMezzoUpdatedAtStale(atLink, live);
}
