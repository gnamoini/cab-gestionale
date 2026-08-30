"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createSubmitLock, type FormSubmitLock } from "@/lib/forms/form-engine/submit-lock";
import type { TagliandoLavorazioneFields } from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  runIngressoSavePipeline,
  type IngressoLavorazioneGestionePatch,
  type IngressoSaveCommitInput,
  type IngressoSaveCommitResult,
  type IngressoSaveResult,
} from "@/lib/schede/scheda-ingresso-save-pipeline";
import type { SchedaIngressoFields } from "@/types/schede";
import type { SchedaIngressoSaveGateResult } from "@/src/hooks/use-scheda-ingresso-save-gate";

export type UseSchedaIngressoSavePipelineOptions = {
  /** Lock condiviso col parent (es. hub schede) — evita doppio lock formEngine/parent. */
  submitLock?: FormSubmitLock;
  mezziCatalog: readonly MezzoGestito[];
  gateSubmit: (
    fields: SchedaIngressoFields,
    proceed: (fields: SchedaIngressoFields) => void | Promise<void>,
  ) => Promise<void>;
  gateSave: (fields: SchedaIngressoFields) => Promise<SchedaIngressoSaveGateResult>;
  gateMezzoLink?: (fields: SchedaIngressoFields) => Promise<import("@/src/hooks/use-scheda-ingresso-mezzo-link-gate").SchedaIngressoMezzoLinkGateResult>;
  commit: (input: IngressoSaveCommitInput) => Promise<IngressoSaveCommitResult>;
};

export function useSchedaIngressoSavePipeline(opts: UseSchedaIngressoSavePipelineOptions) {
  const internalLock = useMemo(() => createSubmitLock(), []);
  const lock = opts.submitLock ?? internalLock;
  const [isPending, setIsPending] = useState(false);
  const commitRef = useRef(opts.commit);
  const gateSubmitRef = useRef(opts.gateSubmit);
  const gateSaveRef = useRef(opts.gateSave);
  const gateMezzoLinkRef = useRef(opts.gateMezzoLink);
  const mezziCatalogRef = useRef(opts.mezziCatalog);

  useLayoutEffect(() => {
    commitRef.current = opts.commit;
    gateSubmitRef.current = opts.gateSubmit;
    gateSaveRef.current = opts.gateSave;
    gateMezzoLinkRef.current = opts.gateMezzoLink;
    mezziCatalogRef.current = opts.mezziCatalog;
  }, [opts.commit, opts.gateSubmit, opts.gateSave, opts.gateMezzoLink, opts.mezziCatalog]);

  const run = useCallback(
    async (input: {
      fields: SchedaIngressoFields;
      lavorazioneNote: string;
      tagliandoFields: TagliandoLavorazioneFields;
      lavorazioneGestione?: IngressoLavorazioneGestionePatch;
    }): Promise<IngressoSaveResult> => {
      return runIngressoSavePipeline({
        lock,
        fields: input.fields,
        lavorazioneNote: input.lavorazioneNote,
        tagliandoFields: input.tagliandoFields,
        lavorazioneGestione: input.lavorazioneGestione,
        mezziCatalog: mezziCatalogRef.current,
        gateSubmit: (fields, proceed) => gateSubmitRef.current(fields, proceed),
        gateSave: (fields) => gateSaveRef.current(fields),
        gateMezzoLink: gateMezzoLinkRef.current
          ? (fields) => gateMezzoLinkRef.current!(fields)
          : undefined,
        commit: (commitInput) => commitRef.current(commitInput),
        onPendingChange: setIsPending,
      });
    },
    [lock],
  );

  return { run, isPending, lock };
}
