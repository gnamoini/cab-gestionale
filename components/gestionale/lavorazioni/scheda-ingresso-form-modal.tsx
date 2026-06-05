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
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { toMezzoUI } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  findLastSchedaIngressoForIdent,
  hasSchedaIngressoIdentLookup,
  mergeSchedaIngressoFields,
} from "@/lib/schede/scheda-ingresso-reuse";
import {
  SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL,
  SCHEDA_INGRESSO_ADDETTO_LABEL,
} from "@/lib/schede/scheda-ingresso-ui-labels";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import { sliceInputValue, TEXT_EXTRA, TEXT_LONG } from "@/lib/validation/text-field-limits";
import type { LavorazioneArchiviata, LavorazioneAttiva, PrioritaLav } from "@/lib/lavorazioni/types";
import { MezzoRegistratoIngressoDialog } from "@/components/lavorazioni/schede/mezzo-registrato-ingresso-dialog";
import {
  useSchedaIngressoMezzoPrompt,
  type UseSchedaIngressoMezzoPromptResult,
} from "@/src/hooks/use-scheda-ingresso-mezzo-prompt";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
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
import { GlobalDatePicker, GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { buildLavorazioniPillOptionsFromGlobal } from "@/lib/global-list/build-lavorazioni-pill-options";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { SchedaIngressoAnagraficaFields } from "@/components/gestionale/schede/scheda-ingresso-anagrafica-fields";
import { dsBtnDanger, dsInput, dsModalFormFooter } from "@/lib/ui/design-system";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import { gestionaleModalBodyFlexClass } from "@/lib/ui/modal-max-width-class";
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
    targa: "",
    km: "",
    descrizioneAnomalia: "",
    livelloCarburante: "",
    addettoAccettazione: addettoDefault,
    richiedente: "",
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
  for (const key of Object.keys(base) as (keyof SchedaIngressoFields)[]) {
    const v = raw[key];
    if (v !== undefined && v !== null) out[key] = String(v);
  }
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
}: {
  open: boolean;
  onRequestClose: () => void;
  variant: SchedaIngressoFormVariant;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  if (!open) return null;

  return (
    <LavorazioniModalShell
      wide
      maxWidthClass={
        variant === "create-lavorazione"
          ? "md:min-w-[min(100%,48rem)] md:max-w-4xl"
          : "md:min-w-[min(100%,42rem)] md:max-w-3xl"
      }
      layerClassName={variant === "edit-scheda" ? "z-[110]" : undefined}
      onRequestClose={onRequestClose}
      title={variant === "create-lavorazione" ? "Nuova lavorazione" : "Scheda di ingresso"}
      subtitle={subtitle?.trim() ? subtitle : undefined}
    >
      {children}
      {footer}
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
  onSaveMezzo,
  saveMezzoPending = false,
  mezzoLinked = false,
  prependContent,
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
  onSaveMezzo?: () => void;
  saveMezzoPending?: boolean;
  mezzoLinked?: boolean;
  /** Contenuto opzionale in cima allo scroll (banner, avvisi). */
  prependContent?: ReactNode;
}) {
  const disabled = pending || readOnly;
  const dataIngressoFieldId = useId();
  const anomaliaFieldId = useId();
  const noteFieldId = useId();
  const globalOpts = useGlobalOptions({
    enabled: true,
    debugTag: variant === "create-lavorazione" ? "LavorazioneCreateModal" : "SchedaIngressoEditModal",
  });
  const mezziQ = useMezziListQuery(undefined, { enabled: true, staleTime: 30_000 });
  const stati = globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata");
  const prioritaOpts = useMemo(
    () => orderPrioritaList(globalOpts.lavorazioni.prioritaDb),
    [globalOpts.lavorazioni.prioritaDb],
  );
  const addettiOpts = globalOpts.lavorazioni.addetti;
  const mezziUi = useMemo(() => (mezziQ.data ?? []).map(toMezzoUI), [mezziQ.data]);
  const mezziCatalog = useMemo(
    () => (mezziUi.length > 0 ? mezziUi : [...mezzi]),
    [mezziUi, mezzi],
  );

  const [identScan, setIdentScan] = useState({ targa: fields.targa, matricola: fields.matricola });
  useEffect(() => {
    const t = window.setTimeout(
      () => setIdentScan({ targa: fields.targa, matricola: fields.matricola }),
      300,
    );
    return () => window.clearTimeout(t);
  }, [fields.targa, fields.matricola]);

  const lastIngressoMatch = useMemo(() => {
    if (!hasSchedaIngressoIdentLookup(identScan.targa, identScan.matricola)) return null;
    return findLastSchedaIngressoForIdent(
      identScan.targa,
      identScan.matricola,
      mezziCatalog,
      schedeStore,
      attive,
      storico,
      excludeLavorazioneId ? { excludeLavorazioneId } : undefined,
    );
  }, [identScan.targa, identScan.matricola, mezziCatalog, schedeStore, attive, storico, excludeLavorazioneId]);

  const onMezzoPromptMatch = useCallback(
    (m: MezzoGestito) => {
      if (!readOnly) mezzoPrompt.requestPrompt(m);
    },
    [mezzoPrompt, readOnly],
  );

  const copyLastIngresso = useCallback(() => {
    if (!lastIngressoMatch || readOnly) return;
    setFields(mergeSchedaIngressoFields(fields, lastIngressoMatch.campi));
  }, [fields, lastIngressoMatch, readOnly, setFields]);

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
                <GlobalFixedListPillSelect
                  value={fields.addettoAccettazione}
                  onChange={(v) => onPatch({ addettoAccettazione: v })}
                  options={addettoPillOptions}
                  ariaLabel={SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL}
                  disabled={disabled || addettiOpts.length === 0}
                  shellClass={addettoPillShellClass()}
                  fallbackPillStyle={addettoPillStyle}
                />
              </FormField>
            </div>
          ) : (
            <FormField label={SCHEDA_INGRESSO_ADDETTO_LABEL}>
              <GlobalFixedListPillSelect
                value={fields.addettoAccettazione}
                onChange={(v) => onPatch({ addettoAccettazione: v })}
                options={addettoPillOptions}
                ariaLabel={SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL}
                disabled={disabled || addettiOpts.length === 0}
                shellClass={addettoPillShellClass()}
                fallbackPillStyle={addettoPillStyle}
              />
            </FormField>
          )}
        </FormSection>

        <SchedaIngressoAnagraficaFields
          value={fields}
          onPatch={onPatch}
          mezzi={mezziCatalog}
          disabled={disabled}
          onExactMezzoMatch={onMezzoPromptMatch}
          lastIngressoMatch={lastIngressoMatch}
          onCopyLastIngresso={readOnly ? undefined : copyLastIngresso}
          clienteRequired={variant === "create-lavorazione"}
          marcaAttrezzaturaRequired={variant === "create-lavorazione"}
          onSaveMezzo={variant === "create-lavorazione" && !readOnly ? onSaveMezzo : undefined}
          saveMezzoPending={saveMezzoPending}
          mezzoLinked={mezzoLinked}
        />

        <FormSection title="Intervento">
          <FormField label="Descrizione anomalia" htmlFor={anomaliaFieldId}>
            <textarea
              id={anomaliaFieldId}
              className={`${dsInput} min-h-[72px] w-full resize-y`}
              value={fields.descrizioneAnomalia}
              onChange={(e) => onPatch({ descrizioneAnomalia: sliceInputValue(e.target.value, TEXT_EXTRA) })}
              disabled={disabled}
              rows={3}
              maxLength={TEXT_EXTRA}
            />
          </FormField>
          <FormField label="Note" htmlFor={noteFieldId}>
            <textarea
              id={noteFieldId}
              className={`${dsInput} min-h-[56px] w-full resize-y`}
              value={fields.noteIntervento ?? ""}
              onChange={(e) => onPatch({ noteIntervento: sliceInputValue(e.target.value, TEXT_LONG) })}
              disabled={disabled}
              rows={2}
              maxLength={TEXT_LONG}
            />
          </FormField>
        </FormSection>
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
  onSave: (draft: SchedaIngressoFields) => void;
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
  const [draft, setDraft] = useState(initialFields);
  const draftRef = useRef(draft);
  useLayoutEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (open) setDraft(initialFields);
  }, [open, initialFields]);

  const setFields = useCallback((fields: SchedaIngressoFields) => setDraft(fields), []);
  const onPatch = useCallback(
    (patch: Partial<SchedaIngressoFields>) => setDraft((prev) => ({ ...prev, ...patch })),
    [],
  );

  const mezziQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });
  const mezziUi = useMemo(() => (mezziQ.data ?? []).map(toMezzoUI), [mezziQ.data]);
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (ro || !open) return;
    onSave(draftRef.current);
  }

  if (!open) return null;

  return (
    <SchedaIngressoFormModalShell
      open={open}
      onRequestClose={() => onRequestClose(draftRef.current)}
      variant="edit-scheda"
      subtitle="Modifica i dati di accettazione mezzo."
      footer={null}
    >
      <form {...gestionaleFormFocusScopeProps()} onSubmit={onSubmit} className={`${gestionaleModalBodyFlexClass} overflow-hidden`}>
        <SchedaIngressoFormBody
          variant="edit-scheda"
          fields={draft}
          setFields={setFields}
          onPatch={onPatch}
          pending={pending}
          readOnly={ro}
          mezzi={mezzi}
          schedeStore={schedeStore}
          attive={attive}
          storico={storico}
          excludeLavorazioneId={excludeLavorazioneId}
          updatedByHint={updatedBy?.trim() || null}
          mezzoPrompt={mezzoPrompt}
        />
        <footer className={dsModalFormFooter}>
          <span className="min-w-0 flex-1" aria-hidden />
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {onDelete && !readOnly ? (
              <button type="button" className={dsBtnDanger} onClick={onDelete} disabled={pending}>
                Elimina scheda
              </button>
            ) : null}
            <button type="button" className={erpBtnNeutral} onClick={() => onRequestClose(draftRef.current)} disabled={pending}>
              Annulla
            </button>
            {!ro ? (
              <LoadingButton type="submit" className={erpBtnAccent} loading={pending} preset="salva">
                Salva scheda
              </LoadingButton>
            ) : null}
          </div>
        </footer>
      </form>
    </SchedaIngressoFormModalShell>
  );
}
