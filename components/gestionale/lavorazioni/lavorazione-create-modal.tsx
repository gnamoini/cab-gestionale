"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
import { useGlobalOptions, type GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { useLavorazioneCreateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { useMezzoCreateMutation, useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useQueryClient } from "@tanstack/react-query";
import { dispatchGestionaleLocalMutation } from "@/lib/sync/gestionale-sync-dispatch";
import { executeInterventoWriteEntry } from "@/lib/domain/intervento-entry";
import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import { upsertMezzoFromSchedaIngresso } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { loadLavorazioneSchedeStore } from "@/lib/schede/lavorazioni-schede-storage";
import { persistSchedeStore } from "@/lib/schede/schede-sync-adapter";
import { newSchedaMeta } from "@/lib/schede/schede-ui";
import { isStatoInConfig, resolveDefaultLavorazioneStatoId } from "@/src/shared/selectors";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import { mergeSchedaIngressoFields } from "@/lib/schede/scheda-ingresso-reuse";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import { useSchedaIngressoMezzoPrompt } from "@/src/hooks/use-scheda-ingresso-mezzo-prompt";
import { useFormEngineSections } from "@/lib/forms/form-engine";
import { LoadingButton } from "@/components/design-system";
import { erpBtnAccent } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import {
  emptySchedaIngressoFields,
  SchedaIngressoFormBody,
  SchedaIngressoFormModalShell,
  todayItDate,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
import { mezziListQueryKey } from "@/lib/render/query-key-factory";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";

export { SchedaIngressoEditModal } from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";

type LavorazioneCreateFormSections = {
  fields: SchedaIngressoFields;
  meta: { stato: string; priorita: PrioritaLavorazione; mezzoId: string };
};

function itDateToYmd(it: string): string {
  const p = it.trim().split(/[/.-]/);
  if (p.length !== 3) return "";
  const [d, m, y] = p;
  if (!d || !m || !y) return "";
  const yy = y.length === 2 ? `20${y}` : y;
  return `${yy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function ymdToIsoMidUtc(ymd: string): string {
  const p = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return new Date().toISOString();
  const [y, m, d] = p.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date().toISOString();
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)).toISOString();
}

export function LavorazioneCreateModal({
  open,
  onClose,
  defaultMezzoId,
  createdBy,
  onCreated,
  mezzi = [],
  schedeStore = {},
  attive = [],
  storico = [],
  sharedGlobalOpts,
  sharedMezziCatalog,
}: {
  open: boolean;
  onClose: () => void;
  defaultMezzoId?: string | null;
  createdBy: string | null;
  onCreated?: (id: string) => void;
  mezzi?: readonly MezzoGestito[];
  schedeStore?: LavorazioneSchedeStore;
  attive?: readonly LavorazioneAttiva[];
  storico?: readonly LavorazioneArchiviata[];
  sharedGlobalOpts?: GlobalOptionsSlice;
  sharedMezziCatalog?: readonly MezzoGestito[];
}) {
  const hookGlobalOpts = useGlobalOptions({
    enabled: open && !sharedGlobalOpts,
    debugTag: "LavorazioneCreateModal",
  });
  const globalOpts = sharedGlobalOpts ?? hookGlobalOpts;
  const qc = useQueryClient();
  const gestToast = useGestionaleToast();
  const create = useLavorazioneCreateMutation();
  const createMezzo = useMezzoCreateMutation();
  const updateMezzo = useMezzoUpdateMutation();
  const mezziQ = useMezziListQuery(undefined, {
    enabled: open && !sharedMezziCatalog,
    staleTime: 30_000,
  });

  const stati = useMemo(
    () => globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata"),
    [globalOpts.lavorazioni.stati],
  );
  const defaultAccettazioneStatoId = useMemo(() => {
    const hit = stati.find((s) => {
      const hay = `${s.id} ${s.label}`.toLowerCase();
      return hay.includes("accettazione");
    });
    return hit?.id ?? resolveDefaultLavorazioneStatoId(stati);
  }, [stati]);
  const prioritaOpts = useMemo(
    () => orderPrioritaList(globalOpts.lavorazioni.prioritaDb),
    [globalOpts.lavorazioni.prioritaDb],
  );
  const addettiOpts = globalOpts.lavorazioni.addetti;
  const mezziUi = mezziQ.data ?? [];
  const mezziCatalog = useMemo(
    () => sharedMezziCatalog ?? (mezziUi.length > 0 ? mezziUi : [...mezzi]),
    [sharedMezziCatalog, mezziUi, mezzi],
  );

  const formEngine = useFormEngineSections<LavorazioneCreateFormSections>({
    sections: {
      fields: { initial: emptySchedaIngressoFields("") },
      meta: { initial: { stato: "", priorita: "media", mezzoId: "" } },
    },
  });
  const { values, setSection, patchSection, resetSections, runSubmit, formProps, getSnapshot } =
    formEngine;
  const fields = values.fields;
  const { stato, priorita, mezzoId } = values.meta;
  const baselineRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);

  const syncBaseline = useCallback(() => {
    baselineRef.current = JSON.stringify(getSnapshot());
  }, [getSnapshot]);

  const setFields = useCallback(
    (next: SchedaIngressoFields | ((prev: SchedaIngressoFields) => SchedaIngressoFields)) => {
      setSection("fields", next);
    },
    [setSection],
  );
  const setMezzoId = useCallback(
    (next: string) => {
      patchSection("meta", { mezzoId: next });
    },
    [patchSection],
  );
  const setStato = useCallback(
    (next: string) => {
      patchSection("meta", { stato: next });
    },
    [patchSection],
  );
  const setPriorita = useCallback(
    (next: PrioritaLavorazione) => {
      patchSection("meta", { priorita: next });
    },
    [patchSection],
  );
  const [mezzoHint, setMezzoHint] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [schedaSyncError, setSchedaSyncError] = useState<string | null>(null);
  const [submitPending, setSubmitPending] = useState(false);
  const formInitRef = useRef(false);
  const defaultMezzoAppliedRef = useRef<string | null>(null);
  /** Lavorazione già creata ma scheda ingresso non sincronizzata — retry solo persist. */
  const createdLavorazioneIdRef = useRef<string | null>(null);
  const idempotencyKeyRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `lav-create-${Date.now()}`,
  );
  /** True se INSERT riuscito ma persist scheda fallito (retry manuale, no auto-loop). */
  const partialSuccessRef = useRef(false);

  const patch = useCallback(
    (p: Partial<SchedaIngressoFields>) => setFields((f) => ({ ...f, ...p })),
    [setFields],
  );

  const mezzoPrompt = useSchedaIngressoMezzoPrompt({
    fields,
    setFields,
    mezzi: mezziCatalog,
    schedeStore,
    attive,
    storico,
  });

  const applyMezzo = useCallback((m: MezzoGestito) => {
    const fromMezzo = buildSchedaIngressoFieldsFromMezzo(m);
    setFields((f) => {
      const merged = mergeSchedaIngressoFields(
        { ...f, dataIngresso: f.dataIngresso || todayItDate() },
        fromMezzo,
      );
      return {
        ...merged,
        addettoAccettazione: f.addettoAccettazione || merged.addettoAccettazione || addettiOpts[0] || "",
      };
    });
    setMezzoId(m.id);
    setMezzoHint(`Mezzo riconosciuto: ${m.marca} ${m.modello !== "—" ? m.modello : ""}`.trim());
  }, [addettiOpts]);

  const acceptMezzoPrompt = useCallback(() => {
    const m = mezzoPrompt.promptMezzo;
    mezzoPrompt.acceptAutofill();
    if (!m) return;
    setMezzoId(m.id);
    setMezzoHint(`Mezzo collegato: ${m.marca} ${m.modello !== "—" ? m.modello : ""}`.trim());
  }, [mezzoPrompt]);

  const dismissMezzoPrompt = useCallback(() => {
    mezzoPrompt.dismissPrompt();
    setMezzoId("");
    if (fields.targa.trim() || fields.matricola.trim()) {
      setMezzoHint("Continua manualmente: i dati restano editabili.");
    } else {
      setMezzoHint(null);
    }
  }, [fields.matricola, fields.targa, mezzoPrompt]);

  const resolveFreshCatalog = useCallback(async (): Promise<MezzoGestito[]> => {
    await qc.refetchQueries({ queryKey: QK.mezzi });
    const freshRows =
      qc.getQueryData<MezzoGestito[]>(mezziListQueryKey("list", null)) ??
      qc.getQueriesData<MezzoGestito[]>({ queryKey: QK.mezzi }).find(([, data]) => data?.length)?.[1];
    if (freshRows?.length) return freshRows;
    return [...mezziCatalog];
  }, [qc, mezziCatalog]);

  useEffect(() => {
    if (!open) {
      formInitRef.current = false;
      defaultMezzoAppliedRef.current = null;
      baselineRef.current = null;
      setUnsavedExitOpen(false);
      return;
    }
    if (formInitRef.current) return;
    formInitRef.current = true;
    const addetto0 = addettiOpts[0] ?? "";
    resetSections({
      fields: emptySchedaIngressoFields(addetto0),
      meta: {
        mezzoId: (defaultMezzoId ?? "").trim(),
        stato: defaultAccettazioneStatoId,
        priorita: prioritaOpts.includes("media") ? "media" : (prioritaOpts[0] ?? "media"),
      },
    });
    setMezzoHint(null);
    setSubmitError(null);
    setSchedaSyncError(null);
    createdLavorazioneIdRef.current = null;
    partialSuccessRef.current = false;
    queueMicrotask(() => syncBaseline());
  }, [
    open,
    defaultMezzoId,
    prioritaOpts,
    addettiOpts,
    defaultAccettazioneStatoId,
    resetSections,
    syncBaseline,
  ]);

  useEffect(() => {
    if (!open || !defaultMezzoId) return;
    if (defaultMezzoAppliedRef.current === defaultMezzoId) return;
    const m = mezziUi.find((x) => x.id === defaultMezzoId);
    if (!m) return;
    defaultMezzoAppliedRef.current = defaultMezzoId;
    applyMezzo(m);
    queueMicrotask(() => syncBaseline());
  }, [open, defaultMezzoId, mezziUi, applyMezzo, syncBaseline]);

  useEffect(() => {
    if (!open || prioritaOpts.length === 0) return;
    if (!prioritaOpts.includes(priorita)) {
      setPriorita(prioritaOpts[0]!);
      queueMicrotask(() => syncBaseline());
    }
  }, [open, priorita, prioritaOpts, setPriorita, syncBaseline]);

  const requestClose = useCallback(() => {
    const dirty =
      partialSuccessRef.current ||
      createdLavorazioneIdRef.current != null ||
      (baselineRef.current != null && JSON.stringify(getSnapshot()) !== baselineRef.current);
    if (!dirty) {
      setUnsavedExitOpen(false);
      onClose();
      return;
    }
    setUnsavedExitOpen(true);
  }, [getSnapshot, onClose]);

  if (!open) return null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitPending(true);
    try {
    await runSubmit(e.currentTarget, async (snap) => {
      const currentFields = snap.fields;
      const { stato: metaStato, priorita: metaPriorita, mezzoId: metaMezzoId } = snap.meta;

      if (!createdBy) {
        gestToast.validation("Devi essere autenticato per creare una lavorazione.");
        return;
      }
      const sid = metaStato.trim() || defaultAccettazioneStatoId;
      if (!sid || !isStatoInConfig(sid, stati)) {
        gestToast.validation("Seleziona uno stato tra quelli configurati in Configurazione globale.");
        return;
      }
      if (!currentFields.cliente.trim() || !currentFields.marcaAttrezzatura.trim()) {
        gestToast.validation("Cliente e marca attrezzatura sono obbligatori.");
        return;
      }
      if (!prioritaOpts.includes(metaPriorita)) {
        gestToast.validation("Seleziona una priorità dalla configurazione globale.");
        return;
      }

      const ymd = itDateToYmd(currentFields.dataIngresso) || new Date().toISOString().slice(0, 10);
      const noteBlob = currentFields.noteIntervento.trim() || null;
      setSubmitError(null);
      setSchedaSyncError(null);

      try {
        const existingLavId = createdLavorazioneIdRef.current;
        if (existingLavId) {
          incrementHealthCounter("lavCreatePartialRetry");
        }

        const catalog = await resolveFreshCatalog();
        const mezzoHint = metaMezzoId.trim() || null;
        const resolvedMezzo = resolveMezzoFromScheda({
          scheda: currentFields,
          existingMezzi: catalog,
          preferredMezzoId: mezzoHint,
        });
        if (mezzoHint && resolvedMezzo.mezzoId && resolvedMezzo.mezzoId !== mezzoHint) {
          gestToast.warning(
            "Targa/matricola/scuderia indicano un mezzo diverso da quello selezionato: al salvataggio verrà collegato il mezzo risolto.",
          );
        }

        const { result: tx } = await executeInterventoWriteEntry(
          {
            mode: "create",
            idempotencyKey: idempotencyKeyRef.current,
            fields: currentFields,
            lavorazioneId: existingLavId,
            mezziCatalog: catalog,
            meta: {
              statoId: sid,
              priorita: metaPriorita,
              mezzoIdHint: mezzoHint,
              dataIngressoIso: ymdToIsoMidUtc(ymd),
              note: noteBlob,
              createdBy,
            },
          },
          {
            upsertMezzo: ({ fields, preferredMezzoId }) =>
              upsertMezzoFromSchedaIngresso({
                fields,
                mezziCatalog: catalog,
                preferredMezzoId,
                create: (data) => createMezzo.mutateAsync(data),
                update: (id, data) => updateMezzo.mutateAsync({ id, data }),
              }),
            createLavorazione: (input) =>
              create.mutateAsync({
                mezzo_id: input.mezzo_id,
                stato: input.stato,
                priorita: input.priorita,
                data_ingresso: input.data_ingresso,
                data_uscita: null,
                note: input.note,
                created_by: input.created_by,
                target_type: input.target_type,
                attrezzatura_id: input.attrezzatura_id,
              }),
            persistScheda: async ({ lavorazioneId, fields, createdBy: by }) => {
              const store = loadLavorazioneSchedeStore();
              store[lavorazioneId] = {
                lavorazioneId,
                codice: store[lavorazioneId]?.codice ?? null,
                ingresso: {
                  ...newSchedaMeta("ingresso", by),
                  tipo: "ingresso",
                  campi: { ...fields },
                },
                lavorazioni: store[lavorazioneId]?.lavorazioni ?? null,
                ricambi: store[lavorazioneId]?.ricambi ?? null,
              };
              return persistSchedeStore(store, lavorazioneId);
            },
          },
        );

        if (!tx.ok) {
          if (tx.stage === "persist-scheda") {
            if (tx.lavorazioneId) createdLavorazioneIdRef.current = tx.lavorazioneId;
            partialSuccessRef.current = true;
            incrementHealthCounter("lavCreateSchedaSyncFail");
            const schedaMsg =
              tx.error ||
              "Lavorazione creata ma la scheda ingresso non è stata sincronizzata. Riprova il salvaggio o contatta l’amministratore.";
            setSchedaSyncError(schedaMsg);
            gestToast.errorOnce("lav-create-scheda", schedaMsg, {
              module: "lavorazioni",
            });
            dispatchGestionaleLocalMutation(qc, ["lavorazioni"]);
            return;
          }
          throw new Error(tx.error);
        }

        dispatchGestionaleLocalMutation(qc, ["scheda_lavorazione"]);
        createdLavorazioneIdRef.current = null;
        partialSuccessRef.current = false;
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `lav-create-${Date.now()}`;
        setUnsavedExitOpen(false);
        onCreated?.(tx.lavorazioneId);
        onClose();
      } catch (err) {
        const mutationMsg =
          create.error?.message ?? createMezzo.error?.message ?? updateMezzo.error?.message ?? null;
        if (mutationMsg) return;
        const msg = err instanceof Error ? err.message : "Salvataggio fallito.";
        setSubmitError(msg);
        gestToast.error(msg, { module: "lavorazioni" });
      }
    });
    } finally {
      setSubmitPending(false);
    }
  }

  const pending =
    submitPending || create.isPending || createMezzo.isPending || updateMezzo.isPending;
  const mutationError =
    create.isError || createMezzo.isError || updateMezzo.isError
      ? (create.error?.message ?? createMezzo.error?.message ?? updateMezzo.error?.message ?? "Salvataggio fallito.")
      : null;
  const saveError = schedaSyncError ?? submitError ?? mutationError;

  return (
    <>
      <SchedaIngressoFormModalShell
        open={open}
        onRequestClose={requestClose}
        variant="create-lavorazione"
        footer={
          <LoadingButton
            type="submit"
            form="lavorazione-create-form"
            className={`${erpBtnAccent} min-h-11 w-full sm:ml-auto sm:w-auto sm:min-w-[10rem]`}
            loading={pending}
            loadingLabel="Salvataggio…"
            disabled={!createdBy || stati.length === 0 || globalOpts.isLoading}
          >
            Salva lavorazione
          </LoadingButton>
        }
      >
        <form
          ref={formRef}
          id="lavorazione-create-form"
          {...formProps}
          onSubmit={onSubmit}
          className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}
        >
        <SchedaIngressoFormBody
          variant="create-lavorazione"
          fields={fields}
          setFields={setFields}
          onPatch={patch}
          pending={pending}
          mezzi={mezzi}
          schedeStore={schedeStore}
          attive={attive}
          storico={storico}
          stato={stato}
          onStatoChange={setStato}
          priorita={priorita}
          onPrioritaChange={setPriorita}
          mezzoHint={mezzoHint}
          errorMessage={saveError}
          mezzoPrompt={mezzoPrompt}
          onMezzoDialogAccept={acceptMezzoPrompt}
          onMezzoDialogDismiss={dismissMezzoPrompt}
          mezzoLinked={Boolean(mezzoId.trim())}
          mezzoId={mezzoId}
          sharedGlobalOpts={globalOpts}
          sharedMezziCatalog={mezziCatalog}
        />
        </form>
      </SchedaIngressoFormModalShell>

      <GestionaleUnsavedChangesDialog
        open={unsavedExitOpen}
        placement="stacked"
        message="Hai modifiche non salvate. Vuoi uscire senza salvare?"
        pending={pending}
        onStay={() => setUnsavedExitOpen(false)}
        onDiscard={() => {
          setUnsavedExitOpen(false);
          onClose();
        }}
        onSaveAndExit={() => {
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
