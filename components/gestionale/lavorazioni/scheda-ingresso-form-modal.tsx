"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useGlobalOptions, type GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  applyCopyLastSchedaMatch,
  copyLastSchedaIngresso,
  listCopyLastSchedaIngressoCandidates,
} from "@/lib/domain/scheda-ingresso/copy-last-scheda";
import {
  hasSchedaIngressoIdentLookup,
  isIngressoIdentInMezziAnagrafica,
  type LastSchedaIngressoMatch,
} from "@/lib/schede/scheda-ingresso-reuse";
import { SchedaIngressoCopyPickDialog } from "@/components/gestionale/lavorazioni/scheda-ingresso-copy-pick-dialog";
import {
  SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL,
  SCHEDA_INGRESSO_ADDETTO_LABEL,
} from "@/lib/schede/scheda-ingresso-ui-labels";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import { normalizeLivelloCarburanteStored } from "@/lib/schede/livello-carburante-value";
import {
  applySchedaIngressoTypedFields,
  type SchedaIngressoStringKey,
} from "@/lib/schede/scheda-ingresso-typed-fields";
import { sliceInputValue, TEXT_EXTRA, TEXT_LONG } from "@/lib/validation/text-field-limits";
import type { LavorazioneArchiviata, LavorazioneAttiva, PrioritaLav } from "@/lib/lavorazioni/types";
import { MezzoRegistratoIngressoDialog } from "@/components/lavorazioni/schede/mezzo-registrato-ingresso-dialog";
import {
  useSchedaIngressoMezzoPrompt,
  type UseSchedaIngressoMezzoPromptResult,
} from "@/src/hooks/use-scheda-ingresso-mezzo-prompt";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { useFormEngine } from "@/lib/forms/form-engine";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { LoadingButton } from "@/components/design-system";
import {
  addettoPillShellClass,
  addettoPillShellStyleForName,
  erpBtnAccent,
  erpBtnNeutral,
  prioritaPillShellClass,
  prioritaPillShellStyle,
  statoPillShellClass,
  statoPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { AddettoSelectField } from "@/components/gestionale/lavorazioni/lavorazioni-inline-select";
import { GlobalDatePicker, GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { buildLavorazioniPillOptionsFromGlobal } from "@/lib/global-list/build-lavorazioni-pill-options";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { SchedaIngressoAnagraficaFields } from "@/components/gestionale/schede/scheda-ingresso-anagrafica-fields";
import { dsBtnDanger, dsInput } from "@/lib/ui/design-system";
import { cabModalLayerClass } from "@/lib/ui/mobile-modal-behavior";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  gestionaleModalBodyFlexClass,
  type ModalHeight,
  type ModalSize,
} from "@/lib/ui/modal-max-width-class";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";

export function todayItDate(): string {
  return new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function emptySchedaIngressoFields(addettoDefault = ""): SchedaIngressoFields {
  return {
    dataIngresso: todayItDate(),
    cliente: "",
    cantiere: "",
    utilizzatore: "",
    tipoAttrezzatura: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    matricola: "",
    nScuderia: "",
    oreLavoro: "",
    tipoTelaio: "",
    marcaTelaio: "",
    modelloTelaio: "",
    vin: "",
    targa: "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: addettoDefault,
    richiedente: "",
    richiedenteTelefono: "",
    richiedenteFirma: "",
    noteIntervento: "",
  };
}

/** Allinea campi scheda ingresso con default per valori mancanti. */
export function normalizeSchedaIngressoFields(
  raw: Partial<SchedaIngressoFields> | null | undefined,
  addettoDefault = "",
): SchedaIngressoFields {
  const base = emptySchedaIngressoFields(addettoDefault);
  if (!raw) return base;
  const out = { ...base };
  for (const key of Object.keys(base) as SchedaIngressoStringKey[]) {
    const v = raw[key];
    if (v !== undefined && v !== null) out[key] = String(v);
  }
  applySchedaIngressoTypedFields(out, raw);
  if (raw.richiedenteFirma !== undefined && raw.richiedenteFirma !== null) {
    out.richiedenteFirma = String(raw.richiedenteFirma);
  }
  out.livelloCarburante = normalizeLivelloCarburanteStored(out.livelloCarburante);
  return out;
}

type SchedaIngressoFormVariant = "create-lavorazione" | "edit-scheda";

export function SchedaIngressoFormModalShell({
  open,
  onRequestClose,
  variant,
  subtitle,
  children,
  footer,
  modalSize = "formLarge",
  modalHeight,
}: {
  open: boolean;
  onRequestClose: () => void;
  variant: SchedaIngressoFormVariant;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  modalSize?: ModalSize;
  modalHeight?: ModalHeight;
}) {
  if (!open) return null;

  return (
    <LavorazioniModalShell
      modalSize={modalSize}
      modalHeight={modalHeight}
      layerClassName={variant === "edit-scheda" ? cabModalLayerClass("stacked") : undefined}
      onRequestClose={onRequestClose}
      title={variant === "create-lavorazione" ? "Nuova lavorazione" : "Scheda di ingresso"}
      subtitle={subtitle?.trim() ? subtitle : undefined}
      footer={footer ?? undefined}
    >
      {children}
    </LavorazioniModalShell>
  );
}

export function SchedaIngressoFormBody({
  variant,
  fields,
  setFields,
  onPatch,
  pending,
  readOnly = false,
  mezzi = [],
  schedeStore = {},
  attive = [],
  storico = [],
  excludeLavorazioneId,
  stato,
  onStatoChange,
  priorita,
  onPrioritaChange,
  mezzoHint,
  errorMessage,
  updatedByHint,
  mezzoPrompt,
  onMezzoDialogAccept,
  onMezzoDialogDismiss,
  mezzoLinked = false,
  mezzoId = "",
  prependContent,
  sharedGlobalOpts,
  sharedMezziCatalog,
}: {
  variant: SchedaIngressoFormVariant;
  fields: SchedaIngressoFields;
  setFields: (fields: SchedaIngressoFields) => void;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
  pending?: boolean;
  readOnly?: boolean;
  mezzi?: readonly MezzoGestito[];
  schedeStore?: LavorazioneSchedeStore;
  attive?: readonly LavorazioneAttiva[];
  storico?: readonly LavorazioneArchiviata[];
  excludeLavorazioneId?: string;
  stato?: string;
  onStatoChange?: (v: string) => void;
  priorita?: PrioritaLavorazione;
  onPrioritaChange?: (v: PrioritaLavorazione) => void;
  mezzoHint?: string | null;
  errorMessage?: string | null;
  updatedByHint?: string | null;
  mezzoPrompt: UseSchedaIngressoMezzoPromptResult;
  onMezzoDialogAccept?: () => void;
  onMezzoDialogDismiss?: () => void;
  mezzoLinked?: boolean;
  mezzoId?: string;
  /** Contenuto opzionale in cima allo scroll (banner, avvisi). */
  prependContent?: ReactNode;
  sharedGlobalOpts?: GlobalOptionsSlice;
  sharedMezziCatalog?: readonly MezzoGestito[];
}) {
  const disabled = pending || readOnly;
  const dataIngressoFieldId = useId();
  const anomaliaFieldId = useId();
  const noteFieldId = useId();
  const hookGlobalOpts = useGlobalOptions({
    enabled: !sharedGlobalOpts,
    debugTag: variant === "create-lavorazione" ? "LavorazioneCreateModal" : "SchedaIngressoEditModal",
  });
  const globalOpts = sharedGlobalOpts ?? hookGlobalOpts;
  const mezziQ = useMezziListQuery(undefined, {
    enabled: !sharedMezziCatalog,
    staleTime: 30_000,
  });
  const stati = globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata");
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

  const [heavySectionsReady, setHeavySectionsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setHeavySectionsReady(true);
    };
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(markReady);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  const [identScan, setIdentScan] = useState({
    targa: fields.targa,
    matricola: fields.matricola,
    nScuderia: fields.nScuderia,
  });
  useEffect(() => {
    const t = window.setTimeout(
      () =>
        setIdentScan({
          targa: fields.targa,
          matricola: fields.matricola,
          nScuderia: fields.nScuderia,
        }),
      300,
    );
    return () => window.clearTimeout(t);
  }, [fields.targa, fields.matricola, fields.nScuderia]);

  const lastIngressoCandidates = useMemo(() => {
    if (!hasSchedaIngressoIdentLookup(identScan.targa, identScan.matricola, identScan.nScuderia)) {
      return [];
    }
    return listCopyLastSchedaIngressoCandidates({
      ident: {
        targa: identScan.targa,
        matricola: identScan.matricola,
        nScuderia: identScan.nScuderia,
      },
      mezzi: mezziCatalog,
      schedeStore,
      attive,
      storico,
      excludeLavorazioneId,
    });
  }, [
    identScan.targa,
    identScan.matricola,
    identScan.nScuderia,
    mezziCatalog,
    schedeStore,
    attive,
    storico,
    excludeLavorazioneId,
  ]);

  const lastIngressoMatch = lastIngressoCandidates[0] ?? null;
  const lastIngressoMezzoInAnagrafica = useMemo(
    () =>
      isIngressoIdentInMezziAnagrafica(
        mezziCatalog,
        identScan.targa,
        identScan.matricola,
        identScan.nScuderia,
      ),
    [identScan.matricola, identScan.nScuderia, identScan.targa, mezziCatalog],
  );
  const [copyPickOpen, setCopyPickOpen] = useState(false);

  const onMezzoPromptMatch = useCallback(
    (m: MezzoGestito) => {
      if (!readOnly) mezzoPrompt.requestPrompt(m);
    },
    [mezzoPrompt, readOnly],
  );

  const applyCopyFromMatch = useCallback(
    (match: LastSchedaIngressoMatch) => {
      setFields(applyCopyLastSchedaMatch("merge-empty", fields, match));
      setCopyPickOpen(false);
    },
    [fields, setFields],
  );

  const copyLastIngresso = useCallback(() => {
    if (readOnly) return;
    const result = copyLastSchedaIngresso({
      ident: {
        targa: identScan.targa,
        matricola: identScan.matricola,
        nScuderia: identScan.nScuderia,
      },
      mode: "merge-empty",
      currentFields: fields,
      mezzi: mezziCatalog,
      schedeStore,
      attive,
      storico,
      excludeLavorazioneId,
    });
    if (result.kind === "none") return;
    if (result.kind === "pick") {
      setCopyPickOpen(true);
      return;
    }
    setFields(result.fields);
  }, [
    attive,
    excludeLavorazioneId,
    fields,
    identScan.matricola,
    identScan.nScuderia,
    identScan.targa,
    mezziCatalog,
    readOnly,
    schedeStore,
    setFields,
    storico,
  ]);

  const tablePillOptions = useMemo(
    () => buildLavorazioniPillOptionsFromGlobal(globalOpts),
    [globalOpts],
  );
  const statoPillOptions = useMemo(() => tablePillOptions.stati(stati), [tablePillOptions, stati]);
  const prioritaPillOptions = useMemo(
    () => tablePillOptions.priorita(prioritaOpts),
    [tablePillOptions, prioritaOpts],
  );
  const addettoPillOptions = useMemo(
    () => tablePillOptions.addetto(fields.addettoAccettazione),
    [tablePillOptions, fields.addettoAccettazione],
  );
  const statoPillStyle = useMemo(
    () => (stato ? statoPillShellStyle(statoDisplayColor(stato, stati)) : undefined),
    [stato, stati],
  );
  const prioritaPillStyle = useMemo(
    () =>
      prioritaPillShellStyle(
        priorita === "urgente"
          ? "#b91c1c"
          : prioritaDisplayColor(priorita as PrioritaLav, globalOpts.lavorazioni.prioritaColors),
      ),
    [priorita, globalOpts.lavorazioni.prioritaColors],
  );
  const addettoPillStyle = useMemo(
    () =>
      addettoPillShellStyleForName(
        fields.addettoAccettazione,
        globalOpts.lavorazioni.addettoColors,
      ),
    [fields.addettoAccettazione, globalOpts.lavorazioni.addettoColors],
  );

  return (
    <>
      <MezzoRegistratoIngressoDialog
        open={mezzoPrompt.promptOpen && !readOnly}
        mezzo={mezzoPrompt.promptMezzo}
        onAccept={onMezzoDialogAccept ?? mezzoPrompt.acceptAutofill}
        onDismiss={onMezzoDialogDismiss ?? mezzoPrompt.dismissPrompt}
      />
      <SchedaIngressoCopyPickDialog
        open={copyPickOpen}
        candidates={lastIngressoCandidates}
        onCancel={() => setCopyPickOpen(false)}
        onConfirm={applyCopyFromMatch}
      />
      <GestionaleModalScrollBody className="space-y-3">
        {prependContent}
        {globalOpts.isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {globalOpts.error?.message ?? "Errore impostazioni."}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        ) : null}
        {mezzoHint ? (
          <p className="rounded-lg border border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] px-3 py-2 text-xs text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))] dark:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-card))]">
            {mezzoHint}
          </p>
        ) : null}
        {updatedByHint ? (
          <p className="text-xs text-[color:var(--cab-text-muted)]">Autore ultima modifica: {updatedByHint}</p>
        ) : null}

        <FormSection title="Ingresso">
          <FormField label="Data ingresso" htmlFor={dataIngressoFieldId} required>
            <GlobalDatePicker
              id={dataIngressoFieldId}
              value={fields.dataIngresso}
              onChange={(v) => onPatch({ dataIngresso: v })}
              inputClassName={dsInput}
              required
              disabled={disabled}
            />
          </FormField>
          {variant === "create-lavorazione" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Stato iniziale">
                <GlobalFixedListPillSelect
                  value={stato ?? ""}
                  onChange={(v) => onStatoChange?.(v)}
                  options={statoPillOptions}
                  ariaLabel="Stato iniziale"
                  disabled={disabled || globalOpts.isLoading || stati.length === 0}
                  shellClass={statoPillShellClass()}
                  fallbackPillStyle={statoPillStyle}
                />
              </FormField>
              <FormField label="Priorità">
                <GlobalFixedListPillSelect
                  value={priorita ?? "media"}
                  onChange={(v) => onPrioritaChange?.(v as PrioritaLavorazione)}
                  options={prioritaPillOptions}
                  ariaLabel="Priorità"
                  disabled={disabled || prioritaOpts.length === 0}
                  shellClass={prioritaPillShellClass()}
                  fallbackPillStyle={prioritaPillStyle}
                />
              </FormField>
              <FormField label={SCHEDA_INGRESSO_ADDETTO_LABEL} className="sm:col-span-2 lg:col-span-1">
                <AddettoSelectField
                  value={fields.addettoAccettazione}
                  onChange={(v) => onPatch({ addettoAccettazione: v })}
                  options={addettoPillOptions}
                  shellClass={addettoPillShellClass()}
                  shellStyle={addettoPillStyle}
                  ariaLabel={SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL}
                  disabled={disabled || addettiOpts.length === 0}
                />
              </FormField>
            </div>
          ) : (
            <FormField label={SCHEDA_INGRESSO_ADDETTO_LABEL}>
              <AddettoSelectField
                value={fields.addettoAccettazione}
                onChange={(v) => onPatch({ addettoAccettazione: v })}
                options={addettoPillOptions}
                shellClass={addettoPillShellClass()}
                shellStyle={addettoPillStyle}
                ariaLabel={SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL}
                disabled={disabled || addettiOpts.length === 0}
              />
            </FormField>
          )}
        </FormSection>

        <SchedaIngressoAnagraficaFields
          value={fields}
          onPatch={onPatch}
          mezzi={mezziCatalog}
          disabled={disabled}
          sections={heavySectionsReady ? undefined : ["cliente"]}
          onExactMezzoMatch={onMezzoPromptMatch}
          lastIngressoMatch={lastIngressoMatch}
          lastIngressoMatchCount={lastIngressoCandidates.length}
          mezzoInAnagraficaOnly={
            lastIngressoCandidates.length === 0 && lastIngressoMezzoInAnagrafica
          }
          onCopyLastIngresso={readOnly ? undefined : copyLastIngresso}
          clienteRequired={false}
          marcaAttrezzaturaRequired={false}
          mezzoLinked={mezzoLinked}
          mezzoId={mezzoId}
        />

        {heavySectionsReady ? (
        <FormSection title="Intervento">
          <FormField label="Descrizione anomalia" htmlFor={anomaliaFieldId}>
            <GestionaleTextarea
              id={anomaliaFieldId}
              className="min-h-[4.5rem]"
              size="md"
              value={fields.descrizioneAnomalia}
              onChange={(v) => onPatch({ descrizioneAnomalia: sliceInputValue(v, TEXT_EXTRA) })}
              disabled={disabled}
              rows={3}
              maxLength={TEXT_EXTRA}
            />
          </FormField>
          <FormField label="Note" htmlFor={noteFieldId}>
            <GestionaleTextarea
              id={noteFieldId}
              className="min-h-[3.5rem]"
              size="sm"
              value={fields.noteIntervento ?? ""}
              onChange={(v) => onPatch({ noteIntervento: sliceInputValue(v, TEXT_LONG) })}
              disabled={disabled}
              rows={2}
              maxLength={TEXT_LONG}
            />
          </FormField>
        </FormSection>
        ) : null}
      </GestionaleModalScrollBody>
    </>
  );
}

export function SchedaIngressoEditModal({
  open,
  initialFields,
  onRequestClose,
  onSave,
  onDelete,
  readOnly = false,
  canEdit = true,
  updatedBy,
  pending = false,
  mezzi = [],
  schedeStore = {},
  attive = [],
  storico = [],
  excludeLavorazioneId,
}: {
  open: boolean;
  initialFields: SchedaIngressoFields;
  /** Chiusura (Annulla / ESC): riceve il draft corrente per dirty-check nel parent. */
  onRequestClose: (draft: SchedaIngressoFields) => void;
  onSave: (draft: SchedaIngressoFields) => void | Promise<void>;
  onDelete?: () => void;
  readOnly?: boolean;
  canEdit?: boolean;
  updatedBy?: string | null;
  pending?: boolean;
  mezzi?: readonly MezzoGestito[];
  schedeStore?: LavorazioneSchedeStore;
  attive?: readonly LavorazioneAttiva[];
  storico?: readonly LavorazioneArchiviata[];
  excludeLavorazioneId?: string;
}) {
  const ro = readOnly || !canEdit;
  const [saving, setSaving] = useState(false);
  const formEngine = useFormEngine<SchedaIngressoFields>({ initial: initialFields });
  const { value: draft, reset, setValue, patch: onPatch, runSubmit, formProps, ref: draftRef } =
    formEngine;
  const savePending = pending || saving;

  useEffect(() => {
    if (open) reset(initialFields);
  }, [open, initialFields, reset]);

  const setFields = useCallback(
    (fields: SchedaIngressoFields) => {
      setValue(fields);
    },
    [setValue],
  );

  const mezziQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });
  const mezziUi = mezziQ.data ?? [];
  const mezziCatalog = useMemo(
    () => (mezziUi.length > 0 ? mezziUi : [...mezzi]),
    [mezziUi, mezzi],
  );
  const mezzoPrompt = useSchedaIngressoMezzoPrompt({
    fields: draft,
    setFields,
    mezzi: mezziCatalog,
    schedeStore,
    attive,
    storico,
    excludeLavorazioneId,
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ro || !open || savePending) return;
    void runSubmit(e.currentTarget, async (snap) => {
      setSaving(true);
      try {
        await onSave(snap);
      } finally {
        setSaving(false);
      }
    });
  }

  if (!open) return null;

  return (
    <SchedaIngressoFormModalShell
      open={open}
      onRequestClose={() => onRequestClose(draftRef.current)}
      variant="edit-scheda"
      subtitle="Modifica i dati di accettazione mezzo."
      footer={
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2">
          {onDelete && !readOnly ? (
            <button type="button" className={`${dsBtnDanger} min-h-11`} onClick={onDelete} disabled={savePending}>
              Elimina scheda
            </button>
          ) : null}
          <button
            type="button"
            className={`${erpBtnNeutral} min-h-11`}
            onClick={() => onRequestClose(draftRef.current)}
            disabled={savePending}
          >
            Annulla
          </button>
          {!ro ? (
            <LoadingButton
              type="submit"
              form="scheda-ingresso-edit-form"
              className={`${erpBtnAccent} min-h-11`}
              loading={savePending}
              preset="salva"
            >
              Salva scheda
            </LoadingButton>
          ) : null}
        </div>
      }
    >
      <form
        id="scheda-ingresso-edit-form"
        {...formProps}
        onSubmit={onSubmit}
        className={`${gestionaleModalBodyFlexClass} min-h-0 overflow-hidden`}
      >
        <SchedaIngressoFormBody
          variant="edit-scheda"
          fields={draft}
          setFields={setFields}
          onPatch={onPatch}
          pending={savePending}
          readOnly={ro}
          mezzi={mezzi}
          schedeStore={schedeStore}
          attive={attive}
          storico={storico}
          excludeLavorazioneId={excludeLavorazioneId}
          updatedByHint={updatedBy?.trim() || null}
          mezzoPrompt={mezzoPrompt}
        />
      </form>
    </SchedaIngressoFormModalShell>
  );
}
