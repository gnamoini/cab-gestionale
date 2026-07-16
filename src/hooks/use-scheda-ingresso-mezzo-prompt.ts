"use client";

import { useCallback, useRef, useState } from "react";
import { copyLastSchedaIngresso } from "@/lib/domain/scheda-ingresso/copy-last-scheda";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { mergeSchedaIngressoFields } from "@/lib/schede/scheda-ingresso-reuse";
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
  const promptedIdRef = useRef<string | null>(null);

  const requestPrompt = useCallback((mezzo: MezzoGestito) => {
    if (dismissedIds.current.has(mezzo.id)) return;
    if (promptedIdRef.current === mezzo.id) return;
    promptedIdRef.current = mezzo.id;
    setPromptMezzo(mezzo);
  }, []);

  const dismissPrompt = useCallback(() => {
    if (promptMezzo) dismissedIds.current.add(promptMezzo.id);
    promptedIdRef.current = null;
    setPromptMezzo(null);
  }, [promptMezzo]);

  const acceptAutofill = useCallback(() => {
    if (!promptMezzo) return;
    const fromMezzo = buildSchedaIngressoFieldsFromMezzo(promptMezzo);
    let next = mergeSchedaIngressoFields(fields, fromMezzo);
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
      });
      if (copyResult.kind === "single") next = copyResult.fields;
    }
    setFields(next);
    promptedIdRef.current = null;
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
