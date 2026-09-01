"use client";

import { useCallback, useState } from "react";
import { copyLastSchedaIngresso } from "@/lib/domain/scheda-ingresso/copy-last-scheda";
import { mergeSchedaIngressoWithMezzoPriority } from "@/lib/schede/merge-scheda-ingresso-with-mezzo-priority";
import {
  canPrefillSchedaFromMezzo,
  type MezzoPrefillPolicy,
} from "@/lib/schede/scheda-ingresso-mezzo-prefill-policy";
import {
  createLinkedMezzoSnapshotFromFields,
  emptySchedaIngressoMezzoLinkState,
  listLinkedMezzoFieldConflicts,
  resolvePreferredMezzoIdForSave,
  resolvePrefillPolicyFromLinkState,
  type LinkedMezzoSnapshot,
  type SchedaIngressoMezzoLinkState,
} from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import type { MezzoLinkOrigin } from "@/lib/schede/scheda-ingresso-mezzo-match";
import { pickMezzoPermanentFields, type MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { SchedaIngressoIdentField } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { SchedaIngressoIdentMatchKind } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

export function useSchedaIngressoMezzoLink({
  fields,
  setFields,
  mezzi,
  schedeStore,
  attive = [],
  storico = [],
  excludeLavorazioneId,
}: {
  fields: SchedaIngressoFields;
  setFields: (f: SchedaIngressoFields) => void;
  mezzi: readonly MezzoGestito[];
  schedeStore?: LavorazioneSchedeStore;
  attive?: readonly LavorazioneAttiva[];
  storico?: readonly LavorazioneArchiviata[];
  excludeLavorazioneId?: string;
}) {
  const [linkState, setLinkState] = useState<SchedaIngressoMezzoLinkState>(
    emptySchedaIngressoMezzoLinkState(),
  );
  const [activeMatchField, setActiveMatchField] = useState<SchedaIngressoIdentField | null>(null);
  const [pendingMatchKind, setPendingMatchKind] = useState<SchedaIngressoIdentMatchKind | null>(null);
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<MezzoGestito[] | null>(null);
  const [dismissedMezzoIds, setDismissedMezzoIds] = useState<Set<string>>(() => new Set());
  const [userEditedPermanent, setUserEditedPermanent] = useState<Set<MezzoPermanentFieldKey>>(
    () => new Set(),
  );

  const resetUserPermanentEdits = useCallback(() => {
    setUserEditedPermanent(new Set());
  }, []);

  const notifyPermanentFieldUserEdit = useCallback(
    (key: MezzoPermanentFieldKey | readonly MezzoPermanentFieldKey[]) => {
      const keys = Array.isArray(key) ? key : [key];
      setUserEditedPermanent((prev) => {
        const next = new Set(prev);
        for (const k of keys) next.add(k);
        return next;
      });
    },
    [],
  );

  const onMezzoIdentMatch = useCallback(
    (mezzo: MezzoGestito, field: SchedaIngressoIdentField, kind: SchedaIngressoIdentMatchKind) => {
      // Edit con mezzo collegato: nessun rematch automatico (solo Cambia mezzo esplicito).
      if (linkState.status === "linked" && linkState.linkedSnapshot) return;
      if (kind === "none" || kind === "ambiguous") return;
      if (dismissedMezzoIds.has(mezzo.id)) return;
      if (linkState.status === "linked" && linkState.linkedSnapshot?.id === mezzo.id) return;
      setAmbiguousCandidates(null);
      setPendingMatchKind(kind);
      setActiveMatchField(field);
      setLinkState({
        status: "unconfirmed_match",
        pendingMezzo: mezzo,
        linkedSnapshot: linkState.linkedSnapshot,
        linkOrigin: null,
      });
    },
    [dismissedMezzoIds, linkState.linkedSnapshot, linkState.status],
  );

  const onExactMezzoMatch = useCallback(
    (mezzo: MezzoGestito, field: SchedaIngressoIdentField) => {
      onMezzoIdentMatch(mezzo, field, "exact");
    },
    [onMezzoIdentMatch],
  );

  const onAmbiguousMezzoMatch = useCallback(
    (candidates: readonly MezzoGestito[], field: SchedaIngressoIdentField) => {
      if (linkState.status === "linked" && linkState.linkedSnapshot) return;
      if (candidates.length === 0) return;
      setLinkState((prev) => ({
        ...prev,
        status: prev.linkedSnapshot ? "linked" : "new",
        pendingMezzo: null,
        linkOrigin: prev.linkOrigin,
      }));
      setPendingMatchKind(null);
      setActiveMatchField(field);
      setAmbiguousCandidates([...candidates]);
    },
    [linkState.linkedSnapshot, linkState.status],
  );

  const resolverDisabled =
    linkState.status === "linked" && linkState.linkedSnapshot != null;

  const dismissAmbiguousMatch = useCallback(() => {
    setAmbiguousCandidates(null);
    setActiveMatchField(null);
  }, []);

  const dismissPendingMatch = useCallback(() => {
    const id = linkState.pendingMezzo?.id;
    if (id) setDismissedMezzoIds((prev) => new Set(prev).add(id));
    setActiveMatchField(null);
    setPendingMatchKind(null);
    setAmbiguousCandidates(null);
    setLinkState((prev) => ({
      ...prev,
      status: prev.linkedSnapshot ? "linked" : "new",
      pendingMezzo: null,
    }));
  }, [linkState.pendingMezzo?.id]);

  const linkMezzoWithPolicy = useCallback(
    (
      mezzo: MezzoGestito,
      field: SchedaIngressoIdentField,
      linkOrigin: MezzoLinkOrigin,
      prefillPolicy: MezzoPrefillPolicy,
      confirmed: boolean,
    ) => {
      let next = { ...fields };
      if (canPrefillSchedaFromMezzo(prefillPolicy)) {
        next = mergeSchedaIngressoWithMezzoPriority(fields, {
          linkedMezzo: mezzo,
          prefillPolicy,
        });
        if (schedeStore) {
          const copyResult = copyLastSchedaIngresso({
            ident: { targa: next.targa, matricola: next.matricola, nScuderia: next.nScuderia },
            mode: "merge-empty",
            currentFields: next,
            mezzi,
            schedeStore,
            attive,
            storico,
            excludeLavorazioneId,
            linkedMezzo: mezzo,
          });
          if (copyResult.kind === "single") next = copyResult.fields;
        }
      }
      setFields(next);
      setLinkState({
        status: "linked",
        pendingMezzo: null,
        linkOrigin,
        linkedSnapshot: createLinkedMezzoSnapshotFromFields(
          mezzo,
          pickMezzoPermanentFields(next),
          field,
          linkOrigin,
          confirmed,
        ),
      });
      setActiveMatchField(null);
      setPendingMatchKind(null);
      setAmbiguousCandidates(null);
      resetUserPermanentEdits();
    },
    [
      attive,
      excludeLavorazioneId,
      fields,
      mezzi,
      resetUserPermanentEdits,
      schedeStore,
      setFields,
      storico,
    ],
  );

  const acceptLinkMezzo = useCallback(
    (field: SchedaIngressoIdentField = activeMatchField ?? "matricola") => {
      const mezzo = linkState.pendingMezzo;
      if (!mezzo) return;
      linkMezzoWithPolicy(mezzo, field, "selected_by_user", "manual_selected", true);
    },
    [activeMatchField, linkMezzoWithPolicy, linkState.pendingMezzo],
  );

  const selectAmbiguousCandidate = useCallback(
    (mezzo: MezzoGestito, field: SchedaIngressoIdentField = activeMatchField ?? "matricola") => {
      linkMezzoWithPolicy(mezzo, field, "selected_by_user", "manual_selected", true);
    },
    [activeMatchField, linkMezzoWithPolicy],
  );

  const clearLink = useCallback(() => {
    setLinkState(emptySchedaIngressoMezzoLinkState());
    setActiveMatchField(null);
    setPendingMatchKind(null);
    setAmbiguousCandidates(null);
    resetUserPermanentEdits();
  }, [resetUserPermanentEdits]);

  const linkMezzoExplicit = useCallback(
    (mezzo: MezzoGestito, field: SchedaIngressoIdentField = "matricola") => {
      linkMezzoWithPolicy(mezzo, field, "selected_by_user", "manual_selected", true);
    },
    [linkMezzoWithPolicy],
  );

  const confirmAutoMatchedMezzo = useCallback(
    (
      mezzo: MezzoGestito,
      field: SchedaIngressoIdentField = "matricola",
    ) => {
      linkMezzoWithPolicy(mezzo, field, "auto_confirmed", "confirmed_match", true);
    },
    [linkMezzoWithPolicy],
  );

  const markCreatedNewMezzo = useCallback(() => {
    setLinkState((prev) => ({
      ...prev,
      status: "new",
      pendingMezzo: null,
      linkedSnapshot: null,
      linkOrigin: "created_new",
    }));
    setActiveMatchField(null);
    setPendingMatchKind(null);
    setAmbiguousCandidates(null);
  }, []);

  const bootstrapLinkedMezzo = useCallback(
    (
      mezzo: MezzoGestito,
      fieldsAtOpen: Pick<SchedaIngressoFields, MezzoPermanentFieldKey>,
      field: SchedaIngressoIdentField = "matricola",
      linkOrigin: MezzoLinkOrigin = "selected_by_user",
    ) => {
      setLinkState((prev) => {
        if (prev.status === "linked" && prev.linkedSnapshot?.id === mezzo.id) return prev;
        resetUserPermanentEdits();
        return {
          status: "linked",
          pendingMezzo: null,
          linkOrigin,
          linkedSnapshot: createLinkedMezzoSnapshotFromFields(
            mezzo,
            fieldsAtOpen,
            field,
            linkOrigin,
            true,
          ),
        };
      });
      setActiveMatchField(null);
      setPendingMatchKind(null);
      setAmbiguousCandidates(null);
    },
    [resetUserPermanentEdits],
  );

  const reconcileLinkedSnapshotAfterSave = useCallback(
    (
      fields: SchedaIngressoFields,
      mezzoFromCatalog?: MezzoGestito | null,
      savedFieldKeys?: readonly MezzoPermanentFieldKey[],
    ) => {
      setLinkState((prev) => {
        if (prev.status !== "linked" || !prev.linkedSnapshot) return prev;
        const mezzo =
          mezzoFromCatalog?.id === prev.linkedSnapshot.id
            ? mezzoFromCatalog
            : null;
        return {
          ...prev,
          linkedSnapshot: {
            ...prev.linkedSnapshot,
            fieldsAtLinkTime: pickMezzoPermanentFields(fields),
            mezzoUpdatedAtAtLinkTime:
              mezzo?.ultimaModifica?.trim() ||
              prev.linkedSnapshot.mezzoUpdatedAtAtLinkTime,
          },
        };
      });
      if (savedFieldKeys?.length) {
        setUserEditedPermanent((prev) => {
          const next = new Set(prev);
          for (const key of savedFieldKeys) next.delete(key);
          return next;
        });
      } else {
        resetUserPermanentEdits();
      }
    },
    [resetUserPermanentEdits],
  );

  const conflictFields = listLinkedMezzoFieldConflicts(fields, linkState.linkedSnapshot);
  const userEditedConflictFields = conflictFields.filter((key) => userEditedPermanent.has(key));
  const hasConflict = userEditedConflictFields.length > 0;
  const preferredMezzoId = resolvePreferredMezzoIdForSave(linkState);
  const prefillPolicy = resolvePrefillPolicyFromLinkState(linkState);

  return {
    linkState,
    activeMatchField,
    pendingMatchKind,
    ambiguousCandidates,
    dismissedMezzoIds,
    onExactMezzoMatch,
    onMezzoIdentMatch,
    onAmbiguousMezzoMatch,
    dismissAmbiguousMatch,
    dismissPendingMatch,
    acceptLinkMezzo,
    selectAmbiguousCandidate,
    linkMezzoExplicit,
    confirmAutoMatchedMezzo,
    markCreatedNewMezzo,
    bootstrapLinkedMezzo,
    reconcileLinkedSnapshotAfterSave,
    clearLink,
    hasConflict,
    conflictFields: userEditedConflictFields,
    allConflictFields: conflictFields,
    notifyPermanentFieldUserEdit,
    preferredMezzoId,
    prefillPolicy,
    resolverDisabled,
    editedPermanentFields: [...userEditedPermanent],
    linkedSnapshot: linkState.linkedSnapshot as LinkedMezzoSnapshot | null,
    pendingMezzo: linkState.pendingMezzo,
    linkOrigin: linkState.linkOrigin ?? linkState.linkedSnapshot?.linkOrigin ?? null,
  };
}

export type UseSchedaIngressoMezzoLinkResult = ReturnType<typeof useSchedaIngressoMezzoLink>;

/** @deprecated Usare useSchedaIngressoMezzoLink */
export function useSchedaIngressoMezzoPrompt(
  args: Parameters<typeof useSchedaIngressoMezzoLink>[0],
) {
  const link = useSchedaIngressoMezzoLink(args);
  return {
    promptMezzo: link.pendingMezzo,
    promptOpen: link.linkState.status === "unconfirmed_match" && link.pendingMezzo != null,
    requestPrompt: (mezzo: MezzoGestito) => link.onExactMezzoMatch(mezzo, "matricola"),
    dismissPrompt: link.dismissPendingMatch,
    acceptAutofill: () => link.acceptLinkMezzo("matricola"),
    ...link,
  };
}

export type UseSchedaIngressoMezzoPromptResult = ReturnType<typeof useSchedaIngressoMezzoPrompt>;
