"use client";

import { useCallback, useRef, useState } from "react";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { findLastSchedaIngressoForIdent, mergeSchedaIngressoFields } from "@/lib/schede/scheda-ingresso-reuse";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

export function useSchedaIngressoMezzoPrompt({
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
  const [promptMezzo, setPromptMezzo] = useState<MezzoGestito | null>(null);
  const dismissedIds = useRef(new Set<string>());

  const requestPrompt = useCallback((mezzo: MezzoGestito) => {
    if (dismissedIds.current.has(mezzo.id)) return;
    setPromptMezzo(mezzo);
  }, []);

  const dismissPrompt = useCallback(() => {
    if (promptMezzo) dismissedIds.current.add(promptMezzo.id);
    setPromptMezzo(null);
  }, [promptMezzo]);

  const acceptAutofill = useCallback(() => {
    if (!promptMezzo) return;
    const fromMezzo = buildSchedaIngressoFieldsFromMezzo(promptMezzo);
    let next = mergeSchedaIngressoFields(fields, fromMezzo);
    if (schedeStore) {
      const last = findLastSchedaIngressoForIdent(
        next.targa,
        next.matricola,
        mezzi,
        schedeStore,
        attive,
        storico,
        excludeLavorazioneId ? { excludeLavorazioneId } : undefined,
      );
      if (last) next = mergeSchedaIngressoFields(next, last.campi);
    }
    setFields(next);
    setPromptMezzo(null);
  }, [attive, excludeLavorazioneId, fields, mezzi, promptMezzo, schedeStore, setFields, storico]);

  return {
    promptMezzo,
    promptOpen: promptMezzo != null,
    requestPrompt,
    dismissPrompt,
    acceptAutofill,
  };
}

export type UseSchedaIngressoMezzoPromptResult = ReturnType<typeof useSchedaIngressoMezzoPrompt>;
