"use client";

import { useCallback, useMemo, type FormEvent, type ReactNode } from "react";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { addettoDisplayColor } from "@/lib/lavorazioni/addetto-colors-assign";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import { readablePillStyleFromHex } from "@/lib/lavorazioni/table-pill-readability";
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
import type { LavorazioneArchiviata, LavorazioneAttiva, PrioritaLav } from "@/lib/lavorazioni/types";
import { MezzoRegistratoIngressoDialog } from "@/components/lavorazioni/schede/mezzo-registrato-ingresso-dialog";
import {
  useSchedaIngressoMezzoPrompt,
  type UseSchedaIngressoMezzoPromptResult,
} from "@/src/hooks/use-scheda-ingresso-mezzo-prompt";
import { gestionaleFormFocusScopeProps } from "@/components/gestionale/gestionale-form-focus-scope";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import {
  addettoPillShellClass,
  erpBtnAccent,
  erpBtnNeutral,
  prioritaPillShellClass,
  statoPillShellClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { GlobalDatePicker, GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { buildLavorazioniPillOptionsFromGlobal } from "@/lib/global-list/build-lavorazioni-pill-options";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { SchedaIngressoAnagraficaFields } from "@/components/gestionale/schede/scheda-ingresso-anagrafica-fields";
import { dsBtnDanger, dsInput, dsModalFormFooter } from "@/lib/ui/design-system";
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
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  if (!open) return null;

  return (
    <LavorazioniModalShell
      wide
      maxWidthClass="max-w-2xl"
      layerClassName={variant === "edit-scheda" ? "z-[110]" : undefined}
      onRequestClose={onRequestClose}
      title="Scheda di ingresso"
      subtitle={subtitle}
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
}) {
  const disabled = pending || readOnly;
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

  const lastIngressoMatch = useMemo(() => {
    if (!hasSchedaIngressoIdentLookup(fields.targa, fields.matricola)) return null;
    return findLastSchedaIngressoForIdent(
      fields.targa,
      fields.matricola,
      mezziCatalog,
      schedeStore,
      attive,
      storico,
      excludeLavorazioneId ? { excludeLavorazioneId } : undefined,
    );
  }, [fields.targa, fields.matricola, mezziCatalog, schedeStore, attive, storico, excludeLavorazioneId]);

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
    () => (stato ? readablePillStyleFromHex(statoDisplayColor(stato, stati)) : undefined),
    [stato, stati],
  );
  const prioritaPillStyle = useMemo(
    () =>
      readablePillStyleFromHex(
        priorita === "urgente"
          ? "#b91c1c"
          : prioritaDisplayColor(priorita as PrioritaLav, globalOpts.lavorazioni.prioritaColors),
      ),
    [priorita, globalOpts.lavorazioni.prioritaColors],
  );
  const addettoPillStyle = useMemo(
    () =>
      readablePillStyleFromHex(
        addettoDisplayColor(fields.addettoAccettazione, globalOpts.lavorazioni.addettoColors),
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
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 gestionale-scrollbar">
        {globalOpts.isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {globalOpts.error?.message ?? "Errore impostazioni."}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        ) : null}
        {mezzoHint ? (
          <p className="rounded-lg border border-orange-200/80 bg-orange-50/80 px-3 py-2 text-xs text-orange-950 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-100">
            {mezzoHint}
          </p>
        ) : null}
        {updatedByHint ? (
          <p className="text-xs text-[color:var(--cab-text-muted)]">Autore ultima modifica: {updatedByHint}</p>
        ) : null}

        <FormSection title="Ingresso">
          <FormField label="Data ingresso *">
            <GlobalDatePicker
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
        />

        <FormSection title="Intervento">
          <FormField label="Descrizione anomalia">
            <textarea
              className={`${dsInput} min-h-[72px] w-full resize-y`}
              value={fields.descrizioneAnomalia}
              onChange={(e) => onPatch({ descrizioneAnomalia: e.target.value })}
              disabled={disabled}
              rows={3}
            />
          </FormField>
          <FormField label="Note">
            <textarea
              className={`${dsInput} min-h-[56px] w-full resize-y`}
              value={fields.noteIntervento ?? ""}
              onChange={(e) => onPatch({ noteIntervento: e.target.value })}
              disabled={disabled}
              rows={2}
            />
          </FormField>
        </FormSection>
      </div>
    </>
  );
}

export function SchedaIngressoEditModal({
  open,
  onClose,
  fields,
  setFields,
  onPatch,
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
  onClose: () => void;
  fields: SchedaIngressoFields;
  setFields: (fields: SchedaIngressoFields) => void;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
  onSave: () => void;
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
  const mezziQ = useMezziListQuery(undefined, { enabled: open, staleTime: 30_000 });
  const mezziUi = useMemo(() => (mezziQ.data ?? []).map(toMezzoUI), [mezziQ.data]);
  const mezziCatalog = useMemo(
    () => (mezziUi.length > 0 ? mezziUi : [...mezzi]),
    [mezziUi, mezzi],
  );
  const mezzoPrompt = useSchedaIngressoMezzoPrompt({
    fields,
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
    onSave();
  }

  if (!open) return null;

  return (
    <SchedaIngressoFormModalShell
      open={open}
      onRequestClose={onClose}
      variant="edit-scheda"
      subtitle="Modifica i dati di accettazione mezzo."
      footer={null}
    >
      <form {...gestionaleFormFocusScopeProps()} onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SchedaIngressoFormBody
          variant="edit-scheda"
          fields={fields}
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
            <button type="button" className={erpBtnNeutral} onClick={onClose} disabled={pending}>
              Annulla
            </button>
            {!ro ? (
              <button type="submit" className={erpBtnAccent} disabled={pending}>
                {pending ? "Salvataggio…" : "Salva scheda"}
              </button>
            ) : null}
          </div>
        </footer>
      </form>
    </SchedaIngressoFormModalShell>
  );
}
