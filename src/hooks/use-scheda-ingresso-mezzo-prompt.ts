"use client";

import { useCallback, useRef, useState } from "react";
import { copyLastSchedaIngresso } from "@/lib/domain/scheda-ingresso/copy-last-scheda";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { mergeSchedaIngressoWithMezzoPriority } from "@/lib/schede/merge-scheda-ingresso-with-mezzo-priority";
import {
  createLinkedMezzoSnapshot,
  createLinkedMezzoSnapshotFromFields,
  emptySchedaIngressoMezzoLinkState,
  listLinkedMezzoFieldConflicts,
  resolvePreferredMezzoIdForSave,
  type LinkedMezzoSnapshot,
  type SchedaIngressoMezzoLinkState,
} from "@/lib/schede/scheda-ingresso-mezzo-link-state";
import { pickMezzoPermanentFields, type MezzoPermanentFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { SchedaIngressoIdentField } from "@/lib/schede/scheda-ingresso-ident-suggest";
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
    emptySchedaIngressoMezzoLinkState,
  );
  const [activeMatchField, setActiveMatchField] = useState<SchedaIngressoIdentField | null>(null);
  const [dismissedMezzoIds, setDismissedMezzoIds] = useState<Set<string>>(() => new Set());
  const userEditedPermanentRef = useRef<Set<MezzoPermanentFieldKey>>(new Set());

  const resetUserPermanentEdits = useCallback(() => {
    userEditedPermanentRef.current = new Set();
  }, []);

  const notifyPermanentFieldUserEdit = useCallback(
    (key: MezzoPermanentFieldKey | readonly MezzoPermanentFieldKey[]) => {
      const keys = Array.isArray(key) ? key : [key];
      for (const k of keys) userEditedPermanentRef.current.add(k);
    },
    [],
  );

  const onExactMezzoMatch = useCallback(
    (mezzo: MezzoGestito, field: SchedaIngressoIdentField) => {
      if (dismissedMezzoIds.has(mezzo.id)) return;
      if (linkState.status === "linked" && linkState.linkedSnapshot?.id === mezzo.id) return;
      setActiveMatchField(field);
      setLinkState({
        status: "unconfirmed_match",
        pendingMezzo: mezzo,
        linkedSnapshot: linkState.linkedSnapshot,
      });
    },
    [dismissedMezzoIds, linkState.linkedSnapshot, linkState.status],
  );

  const dismissPendingMatch = useCallback(() => {
    const id = linkState.pendingMezzo?.id;
    if (id) setDismissedMezzoIds((prev) => new Set(prev).add(id));
    setActiveMatchField(null);
    setLinkState((prev) => ({
      ...prev,
      status: prev.linkedSnapshot ? "linked" : "new",
      pendingMezzo: null,
    }));
  }, [linkState.pendingMezzo?.id]);

  const acceptLinkMezzo = useCallback(
    (field: SchedaIngressoIdentField = activeMatchField ?? "matricola") => {
      const mezzo = linkState.pendingMezzo;
      if (!mezzo) return;
      const fromMezzo = buildSchedaIngressoFieldsFromMezzo(mezzo);
      let next = mergeSchedaIngressoWithMezzoPriority(fields, { linkedMezzo: mezzo });
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
      } else {
        next = mergeSchedaIngressoWithMezzoPriority(next, { linkedMezzo: mezzo });
        void fromMezzo;
      }
      setFields(next);
      setLinkState({
        status: "linked",
        pendingMezzo: null,
        linkedSnapshot: createLinkedMezzoSnapshotFromFields(
          mezzo,
          pickMezzoPermanentFields(next),
          field,
        ),
      });
      setActiveMatchField(null);
      resetUserPermanentEdits();
    },
    [
      activeMatchField,
      attive,
      excludeLavorazioneId,
      fields,
      linkState.pendingMezzo,
      mezzi,
      resetUserPermanentEdits,
      schedeStore,
      setFields,
      storico,
    ],
  );

  const clearLink = useCallback(() => {
    setLinkState(emptySchedaIngressoMezzoLinkState());
    setActiveMatchField(null);
    resetUserPermanentEdits();
  }, [resetUserPermanentEdits]);

  const linkMezzoExplicit = useCallback(
    (mezzo: MezzoGestito, field: SchedaIngressoIdentField = "matricola") => {
      setLinkState({
        status: "linked",
        pendingMezzo: null,
        linkedSnapshot: createLinkedMezzoSnapshot(mezzo, field),
      });
      setActiveMatchField(null);
      resetUserPermanentEdits();
    },
    [resetUserPermanentEdits],
  );

  const bootstrapLinkedMezzo = useCallback(
    (
      mezzo: MezzoGestito,
      fieldsAtOpen: Pick<SchedaIngressoFields, MezzoPermanentFieldKey>,
      field: SchedaIngressoIdentField = "matricola",
    ) => {
      setLinkState((prev) => {
        if (prev.status === "linked" && prev.linkedSnapshot?.id === mezzo.id) return prev;
        resetUserPermanentEdits();
        return {
          status: "linked",
          pendingMezzo: null,
          linkedSnapshot: createLinkedMezzoSnapshotFromFields(mezzo, fieldsAtOpen, field),
        };
      });
      setActiveMatchField(null);
    },
    [resetUserPermanentEdits],
  );

  const conflictFields = listLinkedMezzoFieldConflicts(fields, linkState.linkedSnapshot);
  const userEditedConflictFields = conflictFields.filter((key) =>
    userEditedPermanentRef.current.has(key),
  );
  const hasConflict = userEditedConflictFields.length > 0;
  const preferredMezzoId = resolvePreferredMezzoIdForSave(linkState);

  return {
    linkState,
    activeMatchField,
    onExactMezzoMatch,
    dismissPendingMatch,
    acceptLinkMezzo,
    linkMezzoExplicit,
    bootstrapLinkedMezzo,
    clearLink,
    hasConflict,
    conflictFields: userEditedConflictFields,
    allConflictFields: conflictFields,
    notifyPermanentFieldUserEdit,
    preferredMezzoId,
    editedPermanentFields: [...userEditedPermanentRef.current],
    linkedSnapshot: linkState.linkedSnapshot as LinkedMezzoSnapshot | null,
    pendingMezzo: linkState.pendingMezzo,
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
