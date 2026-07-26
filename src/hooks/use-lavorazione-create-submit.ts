"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGlobalOptions, type GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { buildSchedaIngressoFieldsFromMezzo } from "@/lib/schede/scheda-ingresso-mezzo-autofill";
import { useMezzoCreateMutation, useMezzoUpdateMutation } from "@/src/hooks/gestionale/use-mezzo-mutations";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { commitLavorazioneCreateSuccess } from "@/src/lib/react-query/invalidate-related";
import { executeInterventoWriteEntry } from "@/lib/domain/intervento-entry";
import { useLavorazioneCreateMutation } from "@/src/hooks/gestionale/use-lavorazione-mutations";
import { resolveMezzoFromScheda } from "@/lib/domain/mezzo/resolve-mezzo-from-scheda";
import { logMezzoSchedaConflictTelemetry } from "@/lib/domain/mezzo/mezzo-scheda-conflict-telemetry";
import { upsertMezzoFromSchedaIngresso } from "@/lib/mezzi/upsert-mezzo-from-scheda";
import { applyMezzoAssociationChangeOrThrow } from "@/lib/mezzi/mezzo-association-write-bridge";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { loadLavorazioneSchedeStore } from "@/lib/schede/lavorazioni-schede-storage";
import { persistSchedeStore } from "@/lib/schede/schede-sync-adapter";
import { newSchedaMeta } from "@/lib/schede/schede-ui";
import { isStatoInConfig, resolveDefaultLavorazioneStatoId } from "@/src/shared/selectors";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import {
  initSchedaIngressoFieldsForCreate,
  mergeSchedaIngressoFields,
} from "@/lib/schede/scheda-ingresso-reuse";
import { parseItalianDayDisplayToIso } from "@/lib/ui/italian-date-input-mask";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import { useSchedaIngressoMezzoPrompt } from "@/src/hooks/use-scheda-ingresso-mezzo-prompt";
import { useFormEngineSections } from "@/lib/forms/form-engine";
import {
  emptySchedaIngressoFields,
  todayItDate,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-form-modal";
import { mezziListQueryKey } from "@/lib/render/query-key-factory";
import { QK } from "@/src/lib/react-query/invalidate-related";
import { useGestionaleToast } from "@/src/hooks/use-gestionale-toast";
import { incrementHealthCounter } from "@/lib/observability/runtime-health";
import { useSchedaIngressoUnknownSettingsGate } from "@/src/hooks/use-scheda-ingresso-unknown-settings-gate";
import { useSchedaIngressoSaveGate } from "@/src/hooks/use-scheda-ingresso-save-gate";
import { maybePublishTagliandoDueOnInterventoCreate } from "@/lib/maintenance-plans/tagliando-due-notification.client";
import { assignTagliandoPresetToMezzoOnSave } from "@/lib/maintenance-plans/assign-tagliando-preset-to-mezzo.client";
import {
  DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
  tagliandoFieldsToLavorazionePatch,
  type TagliandoLavorazioneFields,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";

type LavorazioneCreateFormSections = {
  fields: SchedaIngressoFields;
  meta: { stato: string; priorita: PrioritaLavorazione; mezzoId: string };
};

function ymdToIsoMidUtc(ymd: string): string {
  const p = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return new Date().toISOString();
  const [y, m, d] = p.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date().toISOString();
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)).toISOString();
}

export function useLavorazioneCreateSubmit({
  enabled,
  createdBy,
  defaultMezzoId,
  initialFields,
  initialMeta,
  mezzi = [],
  schedeStore = {},
  attive = [],
  storico = [],
  sharedGlobalOpts,
  sharedMezziCatalog,
  onCreated,
  onClose,
}: {
  enabled: boolean;
  createdBy: string | null;
  defaultMezzoId?: string | null;
  initialFields?: SchedaIngressoFields | null;
  initialMeta?: Partial<{ stato: string; priorita: PrioritaLavorazione; mezzoId: string }>;
  mezzi?: readonly MezzoGestito[];
  schedeStore?: LavorazioneSchedeStore;
  attive?: readonly LavorazioneAttiva[];
  storico?: readonly LavorazioneArchiviata[];
  sharedGlobalOpts?: GlobalOptionsSlice;
  sharedMezziCatalog?: readonly MezzoGestito[];
  onCreated?: (id: string) => void;
  onClose?: () => void;
}) {
  const hookGlobalOpts = useGlobalOptions({
    enabled: enabled && !sharedGlobalOpts,
    debugTag: "LavorazioneCreate",
  });
  const globalOpts = sharedGlobalOpts ?? hookGlobalOpts;
  const qc = useQueryClient();
  const gestToast = useGestionaleToast();
  const createLav = useLavorazioneCreateMutation({ deferInvalidation: true });
  const createMezzo = useMezzoCreateMutation();
  const updateMezzo = useMezzoUpdateMutation();
  const mezziQ = useMezziListQuery(undefined, {
    enabled: enabled && !sharedMezziCatalog,
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

  const [tagliandoFields, setTagliandoFields] = useState<TagliandoLavorazioneFields>(
    DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
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
  const [partialCloseConfirmOpen, setPartialCloseConfirmOpen] = useState(false);
  const [mezzoHint, setMezzoHint] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [schedaSyncError, setSchedaSyncError] = useState<string | null>(null);
  const [submitPending, setSubmitPending] = useState(false);
  const [lavorazioneNote, setLavorazioneNote] = useState("");
  const formInitRef = useRef(false);
  const defaultMezzoAppliedRef = useRef<string | null>(null);
  const createdLavorazioneIdRef = useRef<string | null>(null);
  const idempotencyKeyRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `lav-create-${Date.now()}`,
  );
  const partialSuccessRef = useRef(false);

  const { gateSubmit, dialog: unknownSettingsDialog } = useSchedaIngressoUnknownSettingsGate(globalOpts);

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

  const saveGate = useSchedaIngressoSaveGate({
    mezziCatalog,
    linkedSnapshot: mezzoPrompt.linkedSnapshot,
  });

  const applyMezzo = useCallback(
    (m: MezzoGestito) => {
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
    },
    [addettiOpts, setFields, setMezzoId],
  );

  const acceptMezzoPrompt = useCallback(() => {
    const m = mezzoPrompt.pendingMezzo;
    mezzoPrompt.acceptLinkMezzo(mezzoPrompt.activeMatchField ?? "matricola");
    if (!m) return;
    setMezzoId(m.id);
    setMezzoHint(`Mezzo collegato: ${m.marca} ${m.modello !== "—" ? m.modello : ""}`.trim());
  }, [mezzoPrompt, setMezzoId]);

  const dismissMezzoPrompt = useCallback(() => {
    mezzoPrompt.dismissPrompt();
    setMezzoId("");
    if (fields.targa.trim() || fields.matricola.trim()) {
      setMezzoHint("Continua manualmente: i dati restano editabili.");
    } else {
      setMezzoHint(null);
    }
  }, [fields.matricola, fields.targa, mezzoPrompt, setMezzoId]);

  const resolveFreshCatalog = useCallback(async (): Promise<MezzoGestito[]> => {
    await qc.refetchQueries({ queryKey: QK.mezzi });
    const freshRows =
      qc.getQueryData<MezzoGestito[]>(mezziListQueryKey("list", null)) ??
      qc.getQueriesData<MezzoGestito[]>({ queryKey: QK.mezzi }).find(([, data]) => data?.length)?.[1];
    if (freshRows?.length) return freshRows;
    return [...mezziCatalog];
  }, [qc, mezziCatalog]);

  useEffect(() => {
    if (!enabled) {
      formInitRef.current = false;
      defaultMezzoAppliedRef.current = null;
      baselineRef.current = null;
      setUnsavedExitOpen(false);
      setPartialCloseConfirmOpen(false);
      setSubmitError(null);
      setSchedaSyncError(null);
      createdLavorazioneIdRef.current = null;
      partialSuccessRef.current = false;
      return;
    }
    if (formInitRef.current) return;
    formInitRef.current = true;
    const addetto0 = addettiOpts[0] ?? "";
    const emptyFields = emptySchedaIngressoFields(addetto0);
    const fieldsInit = initSchedaIngressoFieldsForCreate(emptyFields, initialFields, {
      copySignatures: true,
    });
    if (!fieldsInit.addettoAccettazione.trim()) {
      fieldsInit.addettoAccettazione = addetto0;
    }
    resetSections({
      fields: fieldsInit,
      meta: {
        mezzoId: (initialMeta?.mezzoId ?? defaultMezzoId ?? "").trim(),
        stato: initialMeta?.stato?.trim() || defaultAccettazioneStatoId,
        priorita:
          initialMeta?.priorita && prioritaOpts.includes(initialMeta.priorita)
            ? initialMeta.priorita
            : prioritaOpts.includes("media")
              ? "media"
              : (prioritaOpts[0] ?? "media"),
      },
    });
    setMezzoHint(null);
    setSubmitError(null);
    setSchedaSyncError(null);
    createdLavorazioneIdRef.current = null;
    partialSuccessRef.current = false;
    queueMicrotask(() => syncBaseline());
  }, [
    enabled,
    defaultMezzoId,
    initialFields,
    initialMeta,
    prioritaOpts,
    addettiOpts,
    defaultAccettazioneStatoId,
    resetSections,
    syncBaseline,
  ]);

  useEffect(() => {
    if (!enabled || !defaultMezzoId) return;
    if (defaultMezzoAppliedRef.current === defaultMezzoId) return;
    const m = mezziUi.find((x) => x.id === defaultMezzoId);
    if (!m) return;
    defaultMezzoAppliedRef.current = defaultMezzoId;
    applyMezzo(m);
    queueMicrotask(() => syncBaseline());
  }, [enabled, defaultMezzoId, mezziUi, applyMezzo, syncBaseline]);

  useEffect(() => {
    if (!enabled || prioritaOpts.length === 0) return;
    if (!prioritaOpts.includes(priorita)) {
      setPriorita(prioritaOpts[0]!);
      queueMicrotask(() => syncBaseline());
    }
  }, [enabled, priorita, prioritaOpts, setPriorita, syncBaseline]);

  const requestClose = useCallback(() => {
    const dirty =
      partialSuccessRef.current ||
      createdLavorazioneIdRef.current != null ||
      (baselineRef.current != null && JSON.stringify(getSnapshot()) !== baselineRef.current);
    if (!dirty) {
      setUnsavedExitOpen(false);
      onClose?.();
      return;
    }
    setUnsavedExitOpen(true);
  }, [getSnapshot, onClose]);

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
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
          if (!prioritaOpts.includes(metaPriorita)) {
            gestToast.validation("Seleziona una priorità dalla configurazione globale.");
            return;
          }

          const dataIngressoTrimmed = currentFields.dataIngresso.trim();
          if (!dataIngressoTrimmed) {
            gestToast.validation("Data ingresso obbligatoria.");
            return;
          }
          const parsedDataIngresso = parseItalianDayDisplayToIso(dataIngressoTrimmed);
          if (!parsedDataIngresso.ok) {
            gestToast.validation("Data ingresso: usa il formato GG/MM/AAAA.");
            return;
          }
          const ymd = parsedDataIngresso.iso.slice(0, 10);
          const noteBlob = lavorazioneNote.trim() || null;
          setSubmitError(null);
          setSchedaSyncError(null);

          await gateSubmit(currentFields, async (gatedFields) => {
          let mezzoUpdatePlan: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan | undefined;
          try {
            mezzoUpdatePlan = await saveGate.gateSave(gatedFields);
          } catch (gateErr) {
            if (gateErr instanceof Error && gateErr.message === "SAVE_CANCELLED") return;
            throw gateErr;
          }
          try {
            const existingLavId = createdLavorazioneIdRef.current;
            if (existingLavId) {
              incrementHealthCounter("lavCreatePartialRetry");
            }

            const catalog = await resolveFreshCatalog();
            const mezzoHintVal = mezzoPrompt.preferredMezzoId ?? null;
            const resolvedMezzo = resolveMezzoFromScheda({
              scheda: gatedFields,
              existingMezzi: catalog,
              preferredMezzoId: mezzoHintVal,
            });
            if (mezzoHintVal && resolvedMezzo.mezzoId && resolvedMezzo.mezzoId !== mezzoHintVal) {
              gestToast.warning(
                "Targa/matricola/scuderia indicano un mezzo diverso da quello selezionato: al salvataggio verrà collegato il mezzo risolto.",
              );
            }

            const { result: tx } = await executeInterventoWriteEntry(
              {
                mode: "create",
                idempotencyKey: idempotencyKeyRef.current,
                fields: gatedFields,
                lavorazioneId: existingLavId,
                mezziCatalog: catalog,
                meta: {
                  statoId: sid,
                  priorita: metaPriorita,
                  mezzoIdHint: mezzoHintVal,
                  dataIngressoIso: ymdToIsoMidUtc(ymd),
                  note: noteBlob,
                  createdBy,
                  writeContext: { source: "manual", mezzoUpdatePlan },
                },
              },
              {
                upsertMezzo: ({ fields: f, preferredMezzoId, updatePlan, lavorazioneId, writeContext }) =>
                  upsertMezzoFromSchedaIngresso({
                    fields: f,
                    mezziCatalog: catalog,
                    preferredMezzoId,
                    updatePlan: updatePlan ?? mezzoUpdatePlan,
                    lavorazioneId,
                    writeContext: writeContext ?? { source: "manual", mezzoUpdatePlan },
                    create: (data) => createMezzo.mutateAsync(data),
                    update: (id, data) => updateMezzo.mutateAsync({ id, data }),
                    applyAssociationChange: applyMezzoAssociationChangeOrThrow,
                  }),
                createLavorazione: async (input) => {
                  if (!input.mezzo_id) {
                    throw new Error("mezzo_id obbligatorio per la creazione lavorazione.");
                  }
                  return createLav.mutateAsync({
                    mezzo_id: input.mezzo_id,
                    stato: input.stato,
                    priorita: input.priorita,
                    data_ingresso: input.data_ingresso,
                    data_uscita: null,
                    note: input.note,
                    created_by: input.created_by,
                    target_type: input.target_type,
                    attrezzatura_id: input.attrezzatura_id,
                    ...tagliandoFieldsToLavorazionePatch(tagliandoFields),
                  });
                },
                persistScheda: async ({ lavorazioneId, fields: f, createdBy: by }) => {
                  const store = loadLavorazioneSchedeStore();
                  store[lavorazioneId] = {
                    lavorazioneId,
                    codice: store[lavorazioneId]?.codice ?? null,
                    ingresso: {
                      ...newSchedaMeta("ingresso", by),
                      tipo: "ingresso",
                      campi: { ...f },
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
                  action: "create",
                });
                if (tx.lavorazioneId) {
                  await commitLavorazioneCreateSuccess(qc, tx.lavorazioneId);
                  if (createdBy) {
                    const partialMezzoId = resolvedMezzo.mezzoId ?? mezzoHintVal;
                    maybePublishTagliandoDueOnInterventoCreate({
                      userId: createdBy,
                      lavorazioneId: tx.lavorazioneId,
                      mezzoId: partialMezzoId,
                      fields: gatedFields,
                      mezzo: catalog.find((m) => m.id === partialMezzoId) ?? null,
                    });
                  }
                }
                return;
              }
              throw new Error(tx.error);
            }

            await commitLavorazioneCreateSuccess(qc, tx.lavorazioneId);
            const assignRes = await assignTagliandoPresetToMezzoOnSave({
              mezzoId: tx.mezzoId,
              tagliandoFields,
            });
            if (!assignRes.ok) {
              gestToast.warning(assignRes.error);
            } else if (assignRes.assigned) {
              gestToast.successOnce(
                `tagliando-preset-assigned-${tx.lavorazioneId}`,
                "Preset assegnato al mezzo nella sezione tagliandi.",
              );
            }
            if (createdBy) {
              maybePublishTagliandoDueOnInterventoCreate({
                userId: createdBy,
                lavorazioneId: tx.lavorazioneId,
                mezzoId: tx.mezzoId,
                fields: gatedFields,
                mezzo: catalog.find((m) => m.id === tx.mezzoId) ?? null,
              });
            }
            createdLavorazioneIdRef.current = null;
            partialSuccessRef.current = false;
            idempotencyKeyRef.current =
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `lav-create-${Date.now()}`;
            setUnsavedExitOpen(false);
            setPartialCloseConfirmOpen(false);
            onCreated?.(tx.lavorazioneId);
            onClose?.();
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Salvataggio fallito.";
            if (msg === "MEZZO_STALE_CONFLICT") {
              logMezzoSchedaConflictTelemetry({
                event: "MEZZO_STALE_CONFLICT",
                mezzoId: mezzoPrompt.preferredMezzoId,
              });
            }
            setSubmitError(msg);
            gestToast.error(err, { module: "lavorazioni", action: "create" });
          }
          });
        });
      } finally {
        setSubmitPending(false);
      }
    },
    [
      runSubmit,
      gateSubmit,
      saveGate,
      mezzoPrompt.preferredMezzoId,
      createdBy,
      defaultAccettazioneStatoId,
      stati,
      prioritaOpts,
      gestToast,
      resolveFreshCatalog,
      createMezzo,
      updateMezzo,
      createLav,
      qc,
      onCreated,
      onClose,
      tagliandoFields,
    ],
  );

  const pending =
    submitPending || createLav.isPending || createMezzo.isPending || updateMezzo.isPending;
  const mutationError =
    createLav.isError || createMezzo.isError || updateMezzo.isError
      ? (createLav.error?.message ??
        createMezzo.error?.message ??
        updateMezzo.error?.message ??
        "Salvataggio fallito.")
      : null;
  const inlineError = submitError ?? mutationError;

  return {
    fields,
    setFields,
    patch,
    stato,
    setStato,
    priorita,
    setPriorita,
    mezzoId,
    mezzoHint,
    inlineError,
    schedaSyncError,
    pending,
    globalOpts,
    mezziCatalog,
    stati,
    prioritaOpts,
    mezzoPrompt,
    acceptMezzoPrompt,
    dismissMezzoPrompt,
    formProps,
    formRef,
    onSubmit,
    requestClose,
    unsavedExitOpen,
    setUnsavedExitOpen,
    partialCloseConfirmOpen,
    setPartialCloseConfirmOpen,
    partialSuccessRef,
    createdLavorazioneIdRef,
    unknownSettingsDialog,
    saveGateDialog: saveGate.dialog,
    gateSave: saveGate.gateSave,
    lavorazioneNote,
    setLavorazioneNote,
    tagliandoFields,
    setTagliandoFields,
  };
}
