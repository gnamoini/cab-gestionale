"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type Ref,
} from "react";
import { useGlobalOptions, type GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoIdentField } from "@/lib/schede/scheda-ingresso-ident-suggest";
import { mezzoIngressoSuggestLabel } from "@/lib/schede/scheda-ingresso-ident-suggest";
import {
  SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL,
  SCHEDA_INGRESSO_ADDETTO_LABEL,
} from "@/lib/schede/scheda-ingresso-ui-labels";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import { normalizeLivelloCarburanteStored } from "@/lib/schede/livello-carburante-value";
import {
  SchedaIngressoTagliandoSection,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-tagliando-section";
import {
  DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
  type TagliandoLavorazioneFields,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import {
  applySchedaIngressoTypedFields,
  type SchedaIngressoStringKey,
} from "@/lib/schede/scheda-ingresso-typed-fields";
import {
  oreDraftFromRaw,
  oreLavoroMotoreFromRaw,
  patchIngressoOreDraft,
  type OreLavoroFields,
  type SchedaIngressoOreDraft,
} from "@/lib/schede/resolve-ore-lavoro-fields";
import { useMaintenancePlansListQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useMezzoMaintenanceConfigsQuery } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useTagliandoMezzoPresetSync } from "@/src/hooks/use-tagliando-mezzo-preset-sync";
import { sliceInputValue, TEXT_EXTRA, TEXT_LONG } from "@/lib/validation/text-field-limits";
import type { LavorazioneArchiviata, LavorazioneAttiva, PrioritaLav } from "@/lib/lavorazioni/types";
import { pickMezzoPermanentFields } from "@/lib/schede/scheda-ingresso-field-roles";
import {
  useSchedaIngressoMezzoPrompt,
  type UseSchedaIngressoMezzoPromptResult,
} from "@/src/hooks/use-scheda-ingresso-mezzo-prompt";
import { useSchedaIngressoSaveGate } from "@/src/hooks/use-scheda-ingresso-save-gate";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { useFormEngine } from "@/lib/forms/form-engine";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import { LoadingButton } from "@/components/design-system";
import { Tooltip } from "@/components/ui";
import {
  erpBtnAccent,
  erpBtnNeutral,
  prioritaPillShellClass,
  prioritaPillShellStyle,
  statoPillShellClass,
  statoPillShellStyle,
} from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { AddettoPicker } from "@/components/domain/addetti";
import { GlobalDatePicker, GlobalFixedListPillSelect } from "@/components/gestionale/global-input";
import { buildLavorazioniPillOptionsFromGlobal } from "@/lib/global-list/build-lavorazioni-pill-options";
import { writeIngressoAddettoId } from "@/lib/lavorazioni/write-ingresso-addetto-id";
import { backfillAddettoIdFromLegacyString } from "@/lib/schede/schede-addetto-id-migrate";
import { buildAddettoPickerOptionsFromRecords } from "@/src/hooks/gestionale/use-addetti-picker-options";
import { FormAlert, FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { SchedaIngressoAnagraficaFields } from "@/components/gestionale/schede/scheda-ingresso-anagrafica-fields";
import {
  CaptureIngressoFieldHintInline,
  CaptureIngressoHintsBanner,
  CaptureAwareFormField,
} from "@/components/document-capture/capture-ingresso-field-hint";
import type { CaptureIngressoFieldHint } from "@/lib/document-capture/capture-ingresso-field-hints";
import { RichiedenteFirmaCaptureModal } from "@/components/gestionale/schede/richiedente-firma-capture-modal";
import { RichiedenteFirmaDisplay } from "@/components/gestionale/schede/richiedente-firma-display";
import { hasSignatureDataUrl } from "@/lib/media/signature-pad";
import { dsBtnDanger, dsBtnNeutral, dsInput, dsLabel, dsAccentSoftBanner } from "@/lib/ui/design-system";
import { cabModalLayerClass } from "@/lib/ui/mobile-modal-behavior";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  gestionaleModalBodyFlexClass,
  type ModalHeight,
  type ModalSize,
} from "@/lib/ui/modal-max-width-class";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useSchedaIngressoUnknownSettingsGate } from "@/src/hooks/use-scheda-ingresso-unknown-settings-gate";
import {
  SCHEDA_INGRESSO_INGRESSO_FIELD_KEYS,
  SCHEDA_INGRESSO_INTERVENTO_FIELD_KEYS,
  schedaIngressoFieldsSliceEqual,
} from "@/lib/schede/scheda-ingresso-form-field-groups";
import type { FixedListPillOption } from "@/components/gestionale/global-input/global-fixed-list-pill";

/** Icona firma accanto a pill `size="form"` (min-h-10). */
const ingressoFirmaIconBtnClass = `${dsBtnNeutral} h-10 w-10 min-h-10 min-w-10 shrink-0 justify-center gap-0.5 p-0`;

export function todayItDate(): string {
  return new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function SchedaIngressoFormScrollShell({
  embedInParentScroll = false,
  children,
}: {
  embedInParentScroll?: boolean;
  children: ReactNode;
}) {
  if (embedInParentScroll) {
    return <div className="min-w-0 space-y-4">{children}</div>;
  }
  return <GestionaleModalScrollBody className="space-y-4">{children}</GestionaleModalScrollBody>;
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
    addettoFirma: "",
  };
}

export type SchedaIngressoDraftFields = SchedaIngressoFields & SchedaIngressoOreDraft;

/** Allinea campi scheda ingresso con default per valori mancanti. */
export function normalizeSchedaIngressoFields(
  raw: Partial<SchedaIngressoFields> & Partial<Record<string, string | undefined | null>>,
  addettoDefault = "",
): SchedaIngressoDraftFields {
  const base = emptySchedaIngressoFields(addettoDefault);
  if (!raw) return base;
  const out = { ...base } as SchedaIngressoDraftFields;
  for (const key of Object.keys(base) as SchedaIngressoStringKey[]) {
    const v = raw[key];
    if (v !== undefined && v !== null) out[key] = String(v);
  }
  applySchedaIngressoTypedFields(out, raw);
  if (raw.richiedenteFirma !== undefined && raw.richiedenteFirma !== null) {
    out.richiedenteFirma = String(raw.richiedenteFirma);
  }
  if (raw.addettoFirma !== undefined && raw.addettoFirma !== null) {
    out.addettoFirma = String(raw.addettoFirma);
  }
  out.livelloCarburante = normalizeLivelloCarburanteStored(out.livelloCarburante);
  out.oreLavoro = oreLavoroMotoreFromRaw(raw);
  const oreDraft = oreDraftFromRaw(raw);
  out.oreLavoroPto = oreDraft.oreLavoroPto;
  return out;
}

function FirmaPenIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IngressoAddettoFirmaButton({
  hasFirma,
  disabled,
  onOpen,
  className = "",
}: {
  hasFirma: boolean;
  disabled?: boolean;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <Tooltip content={hasFirma ? "Modifica firma" : "Acquisisci firma"}>
      <button
        type="button"
        className={`${ingressoFirmaIconBtnClass} ${hasFirma ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-success)_45%,transparent)]" : ""} ${className}`.trim()}
        disabled={disabled}
        aria-label={hasFirma ? "Modifica firma addetto" : "Acquisisci firma addetto"}
        onClick={onOpen}
      >
        <FirmaPenIcon />
      </button>
    </Tooltip>
  );
}

const SchedaIngressoAnomaliaSection = memo(function SchedaIngressoAnomaliaSection({
  descrizioneAnomalia,
  onPatch,
  disabled,
  anomaliaFieldId,
}: {
  descrizioneAnomalia: string;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
  disabled: boolean;
  anomaliaFieldId: string;
}) {
  return (
    <FormField label="Descrizione anomalia" htmlFor={anomaliaFieldId}>
      <GestionaleTextarea
        id={anomaliaFieldId}
        className="min-h-[4.5rem] whitespace-pre-wrap"
        size="md"
        value={descrizioneAnomalia}
        onChange={(v) => onPatch({ descrizioneAnomalia: sliceInputValue(v, TEXT_EXTRA) })}
        disabled={disabled}
        rows={3}
        maxLength={TEXT_EXTRA}
      />
    </FormField>
  );
}, (prev, next) => {
  if (prev.disabled !== next.disabled) return false;
  if (prev.onPatch !== next.onPatch) return false;
  if (prev.anomaliaFieldId !== next.anomaliaFieldId) return false;
  return prev.descrizioneAnomalia === next.descrizioneAnomalia;
});

const SchedaIngressoNoteSection = memo(function SchedaIngressoNoteSection({
  lavorazioneNote,
  onLavorazioneNoteChange,
  disabled,
  noteFieldId,
}: {
  lavorazioneNote: string;
  onLavorazioneNoteChange: (value: string) => void;
  disabled: boolean;
  noteFieldId: string;
}) {
  return (
    <FormField label="Note" htmlFor={noteFieldId}>
      <GestionaleTextarea
        id={noteFieldId}
        className="min-h-[3.5rem]"
        size="sm"
        value={lavorazioneNote}
        onChange={(v) => onLavorazioneNoteChange(sliceInputValue(v, TEXT_LONG))}
        disabled={disabled}
        rows={2}
        maxLength={TEXT_LONG}
      />
    </FormField>
  );
}, (prev, next) => {
  if (prev.disabled !== next.disabled) return false;
  if (prev.onLavorazioneNoteChange !== next.onLavorazioneNoteChange) return false;
  if (prev.noteFieldId !== next.noteFieldId) return false;
  return prev.lavorazioneNote === next.lavorazioneNote;
});

function SchedaIngressoIngressoLinkedMezzoHint({
  mezzo,
  mezzoPrefilledFromCatalog = false,
}: {
  mezzo: MezzoGestito;
  mezzoPrefilledFromCatalog?: boolean;
}) {
  const title = mezzoPrefilledFromCatalog ? "Mezzo selezionato" : "Anagrafica mezzi";

  return (
    <div className="block min-w-0">
      <span className={`${dsLabel} text-[color:var(--cab-text)]`}>{title}</span>
      <div
        className={`${dsAccentSoftBanner} mt-1.5 flex min-h-[2.625rem] min-w-0 items-center rounded-[var(--ds-radius-lg)] px-3 py-2 shadow-[var(--cab-shadow-sm)]`}
        role="status"
      >
        <p className="truncate text-xs font-medium leading-snug text-[color:var(--cab-text)]">
          {mezzoIngressoSuggestLabel(mezzo)}
        </p>
      </div>
    </div>
  );
}

function SchedaIngressoIngressoDataSection({
  dataIngresso,
  disabled,
  dataIngressoFieldId,
  inputRef,
  onDataIngressoChange,
  linkedMezzo,
  mezzoPrefilledFromCatalog = false,
}: {
  dataIngresso: string;
  disabled: boolean;
  dataIngressoFieldId: string;
  inputRef?: Ref<HTMLInputElement>;
  onDataIngressoChange: (v: string) => void;
  linkedMezzo?: MezzoGestito | null;
  mezzoPrefilledFromCatalog?: boolean;
}) {
  return (
    <FormSection title="Ingresso" hideTitle>
      <div className="grid gap-2 sm:grid-cols-2">
        <FormField label="Data ingresso" htmlFor={dataIngressoFieldId} required>
          <GlobalDatePicker
            id={dataIngressoFieldId}
            value={dataIngresso}
            onChange={onDataIngressoChange}
            inputClassName={dsInput}
            inputRef={inputRef}
            required
            disabled={disabled}
          />
        </FormField>
        {linkedMezzo ? (
          <SchedaIngressoIngressoLinkedMezzoHint
            mezzo={linkedMezzo}
            mezzoPrefilledFromCatalog={mezzoPrefilledFromCatalog}
          />
        ) : null}
      </div>
    </FormSection>
  );
}

function IngressoFirmaField({
  label,
  dataUrl,
  disabled,
  onOpen,
  onClear,
  displayLabel,
}: {
  label: string;
  dataUrl?: string;
  disabled?: boolean;
  onOpen: () => void;
  onClear: () => void;
  displayLabel?: string;
}) {
  const hasFirma = hasSignatureDataUrl(dataUrl ?? "");
  return (
    <FormField label={label}>
      <div className="flex min-w-0 items-center gap-2">
        <IngressoAddettoFirmaButton hasFirma={hasFirma} disabled={disabled} onOpen={onOpen} />
        {hasFirma ? (
          <RichiedenteFirmaDisplay dataUrl={dataUrl} consultable label={displayLabel} />
        ) : (
          <span className="text-xs text-[color:var(--cab-text-muted)]">Nessuna firma acquisita</span>
        )}
      </div>
      {hasFirma ? (
        <div className="mt-2">
          <button type="button" className={dsBtnNeutral} disabled={disabled} onClick={onClear}>
            Rimuovi firma
          </button>
        </div>
      ) : null}
    </FormField>
  );
}

function SchedaIngressoFirmeSection({
  richiedenteFirma,
  addettoFirma,
  disabled,
  onPatch,
}: {
  richiedenteFirma?: string;
  addettoFirma?: string;
  disabled?: boolean;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
}) {
  const [richiedenteModalOpen, setRichiedenteModalOpen] = useState(false);
  const [addettoModalOpen, setAddettoModalOpen] = useState(false);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <IngressoFirmaField
          label="Firma richiedente"
          dataUrl={richiedenteFirma}
          disabled={disabled}
          onOpen={() => setRichiedenteModalOpen(true)}
          onClear={() => onPatch({ richiedenteFirma: "" })}
        />
        <IngressoFirmaField
          label="Firma addetto officina"
          dataUrl={addettoFirma}
          disabled={disabled}
          displayLabel="addetto officina"
          onOpen={() => setAddettoModalOpen(true)}
          onClear={() => onPatch({ addettoFirma: "" })}
        />
      </div>
      <RichiedenteFirmaCaptureModal
        open={richiedenteModalOpen}
        initialDataUrl={richiedenteFirma ?? ""}
        onClose={() => setRichiedenteModalOpen(false)}
        onSave={(dataUrl) => onPatch({ richiedenteFirma: dataUrl })}
      />
      <RichiedenteFirmaCaptureModal
        open={addettoModalOpen}
        initialDataUrl={addettoFirma ?? ""}
        title="Firma addetto"
        titleId="addetto-firma-capture-title"
        onClose={() => setAddettoModalOpen(false)}
        onSave={(dataUrl) => onPatch({ addettoFirma: dataUrl })}
      />
    </>
  );
}

type SchedaIngressoGestioneLavorazioneSectionProps = {
  fields: SchedaIngressoFields;
  disabled: boolean;
  stato?: string | undefined;
  priorita?: PrioritaLavorazione | undefined;
  onStatoChange?: (v: string) => void;
  onPrioritaChange?: (v: PrioritaLavorazione) => void;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
  globalOptsLoading?: boolean;
  statiEmpty?: boolean;
  prioritaEmpty?: boolean;
  statoPillOptions?: readonly FixedListPillOption[];
  prioritaPillOptions?: readonly FixedListPillOption[];
  statoPillStyle?: CSSProperties | undefined;
  prioritaPillStyle?: CSSProperties | undefined;
  ingressoAddettoId: string;
  onIngressoAddettoChange: (addettoId: string) => void;
  addettiEmpty: boolean;
  addettoPickerOptions?: readonly FixedListPillOption[];
  captureHintAddetto?: CaptureIngressoFieldHint;
  onApplyCaptureHint?: (key: keyof SchedaIngressoFields, value: string) => void;
  /** Create: stato + priorità + addetto; edit: solo addetto. */
  showStatoPriorita?: boolean;
};

const SchedaIngressoGestioneLavorazioneSection = memo(function SchedaIngressoGestioneLavorazioneSection({
  fields,
  disabled,
  stato,
  priorita,
  onStatoChange,
  onPrioritaChange,
  globalOptsLoading,
  statiEmpty,
  prioritaEmpty,
  statoPillOptions,
  prioritaPillOptions,
  statoPillStyle,
  prioritaPillStyle,
  ingressoAddettoId,
  onIngressoAddettoChange,
  addettiEmpty,
  addettoPickerOptions,
  captureHintAddetto,
  onApplyCaptureHint,
  showStatoPriorita = true,
}: SchedaIngressoGestioneLavorazioneSectionProps) {
  const statoOpts = statoPillOptions ?? [];
  const prioritaOpts = prioritaPillOptions ?? [];
  return (
    <FormSection title="Gestione lavorazione" hideTitle>
      <div className="space-y-3" role="group" aria-label="Stato, priorità e addetto">
        <div
          className={
            showStatoPriorita
              ? "grid grid-cols-1 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))] sm:items-end"
              : "grid grid-cols-1 gap-3"
          }
        >
          {showStatoPriorita ? (
            <>
              <FormField label="Stato iniziale" className="min-w-0">
                <GlobalFixedListPillSelect
                  value={stato ?? ""}
                  onChange={(v) => onStatoChange?.(v)}
                  options={statoOpts}
                  ariaLabel="Stato iniziale"
                  disabled={disabled || globalOptsLoading || statiEmpty}
                  shellClass={statoPillShellClass()}
                  fallbackPillStyle={statoPillStyle}
                  size="form"
                />
              </FormField>
              <FormField label="Priorità" className="min-w-0">
                <GlobalFixedListPillSelect
                  value={priorita ?? "media"}
                  onChange={(v) => onPrioritaChange?.(v as PrioritaLavorazione)}
                  options={prioritaOpts}
                  ariaLabel="Priorità"
                  disabled={disabled || prioritaEmpty}
                  shellClass={prioritaPillShellClass()}
                  fallbackPillStyle={prioritaPillStyle}
                  size="form"
                />
              </FormField>
            </>
          ) : null}
          <FormField label={SCHEDA_INGRESSO_ADDETTO_LABEL} className="min-w-0">
            <CaptureAwareFormField
              hint={captureHintAddetto}
              footer={
                <CaptureIngressoFieldHintInline
                  embedded
                  fieldKey="addettoAccettazione"
                  hint={captureHintAddetto}
                  currentValue={fields.addettoAccettazione}
                  onApply={onApplyCaptureHint}
                />
              }
            >
              <AddettoPicker
                value={ingressoAddettoId || null}
                onChange={onIngressoAddettoChange}
                ariaLabel={SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL}
                size="form"
                disabled={disabled || addettiEmpty}
                options={addettoPickerOptions}
              />
            </CaptureAwareFormField>
          </FormField>
        </div>
      </div>
    </FormSection>
  );
}, (prev, next) => {
  if (prev.disabled !== next.disabled) return false;
  if (prev.stato !== next.stato) return false;
  if (prev.priorita !== next.priorita) return false;
  if (prev.showStatoPriorita !== next.showStatoPriorita) return false;
  if (prev.onStatoChange !== next.onStatoChange) return false;
  if (prev.onPrioritaChange !== next.onPrioritaChange) return false;
  if (prev.globalOptsLoading !== next.globalOptsLoading) return false;
  if (prev.statiEmpty !== next.statiEmpty) return false;
  if (prev.prioritaEmpty !== next.prioritaEmpty) return false;
  if (prev.statoPillOptions !== next.statoPillOptions) return false;
  if (prev.prioritaPillOptions !== next.prioritaPillOptions) return false;
  if (prev.ingressoAddettoId !== next.ingressoAddettoId) return false;
  if (prev.onIngressoAddettoChange !== next.onIngressoAddettoChange) return false;
  if (prev.statoPillStyle !== next.statoPillStyle) return false;
  if (prev.prioritaPillStyle !== next.prioritaPillStyle) return false;
  if (prev.addettiEmpty !== next.addettiEmpty) return false;
  if (prev.addettoPickerOptions !== next.addettoPickerOptions) return false;
  if (prev.captureHintAddetto !== next.captureHintAddetto) return false;
  if (prev.onApplyCaptureHint !== next.onApplyCaptureHint) return false;
  return schedaIngressoFieldsSliceEqual(prev.fields, next.fields, SCHEDA_INGRESSO_INGRESSO_FIELD_KEYS);
});

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
  mezzoLinked = false,
  mezzoPrefilledFromCatalog = false,
  mezzoId = "",
  prependContent,
  sharedGlobalOpts,
  sharedMezziCatalog,
  captureHints,
  onApplyCaptureHint,
  captureReviewCount,
  embedInParentScroll = false,
  lavorazioneNote = "",
  onLavorazioneNoteChange,
  tagliandoFields,
  onTagliandoFieldsChange,
  requestInitialFocus = false,
}: {
  variant: SchedaIngressoFormVariant;
  fields: SchedaIngressoDraftFields;
  setFields: (fields: SchedaIngressoDraftFields) => void;
  onPatch: (patch: Partial<SchedaIngressoDraftFields>) => void;
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
  mezzoLinked?: boolean;
  /** Mezzo scelto dall'elenco iniziale: nasconde banner registrazione e mostra avviso in sezione Ingresso. */
  mezzoPrefilledFromCatalog?: boolean;
  mezzoId?: string;
  /** Contenuto opzionale in cima allo scroll (banner, avvisi). */
  prependContent?: ReactNode;
  sharedGlobalOpts?: GlobalOptionsSlice;
  sharedMezziCatalog?: readonly MezzoGestito[];
  captureHints?: Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>>;
  onApplyCaptureHint?: (key: keyof SchedaIngressoFields, value: string) => void;
  captureReviewCount?: number;
  /** Wizard capture: scroll delegato al GestionaleModalScrollBody del launcher. */
  embedInParentScroll?: boolean;
  /** SSOT note su `lavorazioni.note` (non in scheda JSON). */
  lavorazioneNote?: string;
  onLavorazioneNoteChange?: (value: string) => void;
  tagliandoFields?: TagliandoLavorazioneFields;
  onTagliandoFieldsChange?: (patch: Partial<TagliandoLavorazioneFields>) => void;
  requestInitialFocus?: boolean;
}) {
  const disabled = pending || readOnly;
  const dataIngressoFieldId = useId();
  const dataIngressoInputRef = useRef<HTMLInputElement>(null);
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
  const stati = useMemo(
    () => globalOpts.lavorazioni.stati.filter((s) => s.id !== "annullata"),
    [globalOpts.lavorazioni.stati],
  );
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

  const tagliandoMezzoId = mezzoId.trim() || mezzoPrompt.linkedSnapshot?.id?.trim() || "";
  const tagliandoSectionActive = Boolean(tagliandoFields && onTagliandoFieldsChange);
  const plansQ = useMaintenancePlansListQuery(tagliandoSectionActive);
  const configsQ = useMezzoMaintenanceConfigsQuery({
    mezzoId: tagliandoMezzoId || undefined,
    enabled: Boolean(tagliandoSectionActive && tagliandoMezzoId),
  });
  const tagliandoPresetSync = useTagliandoMezzoPresetSync({
    enabled: Boolean(tagliandoFields && onTagliandoFieldsChange),
    isTagliando: Boolean(tagliandoFields?.isTagliando),
    mezzoId: tagliandoMezzoId,
    configs: configsQ.data,
    configsReady: !configsQ.isPending && !configsQ.isFetching,
    presetPlans: plansQ.data ?? [],
    onTagliandoFieldsChange: onTagliandoFieldsChange ?? (() => {}),
    notifyOnInitialMezzoLink: variant === "create-lavorazione",
  });

  const onOreLavoroPatch = useCallback(
    (patch: Partial<OreLavoroFields>) => {
      onPatch(patchIngressoOreDraft(fields, patch));
    },
    [fields, onPatch],
  );

  useEffect(() => {
    if (!requestInitialFocus || disabled) return;
    const id = requestAnimationFrame(() => {
      dataIngressoInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [requestInitialFocus, disabled]);

  const linkedMezzoCatalog = useMemo(() => {
    const id = mezzoPrompt.linkedSnapshot?.id ?? mezzoPrompt.preferredMezzoId;
    if (!id) return null;
    return mezziCatalog.find((m) => m.id === id) ?? null;
  }, [mezziCatalog, mezzoPrompt.linkedSnapshot?.id, mezzoPrompt.preferredMezzoId]);

  const mezzoInlineHint = useMemo(() => {
    if (mezzoPrompt.hasConflict && mezzoPrompt.linkedSnapshot) {
      const mezzo =
        linkedMezzoCatalog ??
        mezziCatalog.find((m) => m.id === mezzoPrompt.linkedSnapshot!.id) ??
        mezzoPrompt.pendingMezzo;
      if (!mezzo) return null;
      return {
        variant: "conflitto" as const,
        mezzo,
        matchField: (mezzoPrompt.activeMatchField ?? "matricola") as SchedaIngressoIdentField,
      };
    }
    if (mezzoPrefilledFromCatalog) return null;
    if (mezzoPrompt.linkState.status === "linked" && linkedMezzoCatalog) {
      return {
        variant: "collegato" as const,
        mezzo: linkedMezzoCatalog,
        matchField: (mezzoPrompt.activeMatchField ??
          mezzoPrompt.linkedSnapshot?.linkedViaField ??
          "matricola") as SchedaIngressoIdentField,
      };
    }
    if (mezzoPrompt.linkState.status === "unconfirmed_match" && mezzoPrompt.pendingMezzo) {
      return {
        variant: "trovato" as const,
        mezzo: mezzoPrompt.pendingMezzo,
        matchField: (mezzoPrompt.activeMatchField ?? "matricola") as SchedaIngressoIdentField,
      };
    }
    return null;
  }, [
    linkedMezzoCatalog,
    mezziCatalog,
    mezzoPrefilledFromCatalog,
    mezzoPrompt.activeMatchField,
    mezzoPrompt.hasConflict,
    mezzoPrompt.linkState.status,
    mezzoPrompt.linkedSnapshot,
    mezzoPrompt.pendingMezzo,
  ]);

  const onMezzoPromptMatch = useCallback(
    (m: MezzoGestito, field: SchedaIngressoIdentField) => {
      if (!readOnly) mezzoPrompt.onExactMezzoMatch(m, field);
    },
    [mezzoPrompt, readOnly],
  );

  const lavorazioniOpts = globalOpts.lavorazioni;
  const tablePillOptions = useMemo(
    () => buildLavorazioniPillOptionsFromGlobal(globalOpts),
    [
      lavorazioniOpts.stati,
      lavorazioniOpts.prioritaDb,
      lavorazioniOpts.prioritaColors,
      lavorazioniOpts.addettoColors,
      lavorazioniOpts.addetti,
    ],
  );
  const statoPillOptions = useMemo(() => tablePillOptions.stati(stati), [tablePillOptions, stati]);
  const prioritaPillOptions = useMemo(
    () => tablePillOptions.priorita(prioritaOpts),
    [tablePillOptions, prioritaOpts],
  );
  const ingressoAddettoId = useMemo(
    () =>
      fields.addettoAccettazioneId?.trim() ||
      backfillAddettoIdFromLegacyString(lavorazioniOpts.addettiRecords, fields.addettoAccettazione) ||
      "",
    [fields.addettoAccettazioneId, fields.addettoAccettazione, lavorazioniOpts.addettiRecords],
  );
  const addettoPickerOptions = useMemo(
    () =>
      buildAddettoPickerOptionsFromRecords(
        lavorazioniOpts.addettiRecords,
        lavorazioniOpts.addettoColors,
        ingressoAddettoId,
      ),
    [ingressoAddettoId, lavorazioniOpts.addettiRecords, lavorazioniOpts.addettoColors],
  );
  const onIngressoAddettoChange = useCallback(
    (addettoId: string) => onPatch(writeIngressoAddettoId(fields, addettoId)),
    [fields, onPatch],
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

  return (
    <>
      <SchedaIngressoFormScrollShell embedInParentScroll={embedInParentScroll}>
        {prependContent}
        {captureReviewCount != null && captureReviewCount > 0 ? (
          <CaptureIngressoHintsBanner reviewCount={captureReviewCount} />
        ) : null}
        {(globalOpts.isError || errorMessage) ? (
          <div className="sticky top-0 z-10 -mx-2 -mt-4 space-y-3 bg-[var(--cab-card)] px-2 pb-3 pt-4 shadow-[0_1px_0_0_var(--cab-border)] sm:-mx-3 sm:px-3 md:-mx-4 md:px-4">
            {globalOpts.isError ? (
              <FormAlert title="Impostazioni non disponibili">
                {globalOpts.error?.message ?? "Errore nel caricamento delle impostazioni."}
              </FormAlert>
            ) : null}
            {errorMessage ? (
              <FormAlert title="Impossibile salvare">{errorMessage}</FormAlert>
            ) : null}
          </div>
        ) : null}
        {mezzoHint ? (
          <p className="rounded-lg border border-[color:color-mix(in_srgb,var(--cab-primary)_28%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] px-3 py-2 text-xs text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))] dark:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] dark:bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-card))]">
            {mezzoHint}
          </p>
        ) : null}
        {updatedByHint ? (
          <p className="text-xs text-[color:var(--cab-text-muted)]">Autore ultima modifica: {updatedByHint}</p>
        ) : null}

        <SchedaIngressoIngressoDataSection
          dataIngresso={fields.dataIngresso}
          disabled={disabled}
          dataIngressoFieldId={dataIngressoFieldId}
          inputRef={dataIngressoInputRef}
          onDataIngressoChange={(v) => onPatch({ dataIngresso: v })}
          linkedMezzo={
            (mezzoLinked || mezzoPrompt.linkState.status === "linked") && linkedMezzoCatalog
              ? linkedMezzoCatalog
              : null
          }
          mezzoPrefilledFromCatalog={mezzoPrefilledFromCatalog}
        />

        <SchedaIngressoAnagraficaFields
          value={fields}
          onPatch={onPatch}
          onOreLavoroPatch={onOreLavoroPatch}
          mezzi={mezziCatalog}
          disabled={disabled}
          sections={["cliente", "attrezzatura", "telaio"]}
          hideSectionTitles
          onExactMezzoMatch={onMezzoPromptMatch}
          mezzoInlineHint={mezzoInlineHint}
          onUseMezzoFromHint={(field) => mezzoPrompt.acceptLinkMezzo(field)}
          onDismissMezzoHint={mezzoPrompt.dismissPendingMatch}
          clienteRequired={false}
          marcaAttrezzaturaRequired={false}
          mezzoLinked={mezzoLinked || mezzoPrompt.linkState.status === "linked"}
          mezzoId={mezzoId || mezzoPrompt.preferredMezzoId || ""}
          captureHints={captureHints}
          onApplyCaptureHint={onApplyCaptureHint}
        />

        <FormSection title="Intervento" hideTitle>
          <SchedaIngressoAnomaliaSection
            descrizioneAnomalia={fields.descrizioneAnomalia}
            onPatch={onPatch}
            disabled={disabled}
            anomaliaFieldId={anomaliaFieldId}
          />

          {tagliandoFields && onTagliandoFieldsChange ? (
            <SchedaIngressoTagliandoSection
              repairPresent={tagliandoFields.repairPresent}
              onRepairPresentChange={(v) => onTagliandoFieldsChange({ repairPresent: v })}
              isTagliando={tagliandoFields.isTagliando}
              onIsTagliandoChange={(v) => {
                const patch: Partial<TagliandoLavorazioneFields> = { isTagliando: v };
                if (!v) {
                  patch.tagliandoPresetRef = null;
                  patch.tagliandoPresetVersionRef = null;
                  patch.tagliandoAssignPresetToMezzo = null;
                  patch.tagliandoNoPresetReason = null;
                }
                onTagliandoFieldsChange(patch);
              }}
              isGaranzia={tagliandoFields.isGaranzia}
              onIsGaranziaChange={(v) => onTagliandoFieldsChange({ isGaranzia: v })}
              isRecidivo={tagliandoFields.isRecidivo}
              onIsRecidivoChange={(v) => onTagliandoFieldsChange({ isRecidivo: v })}
              presetRef={tagliandoFields.tagliandoPresetRef}
              onPresetRefChange={tagliandoPresetSync.handlePresetRefChange}
              assignPresetToMezzo={tagliandoFields.tagliandoAssignPresetToMezzo}
              presetPlans={plansQ.data ?? []}
              mezzoLinked={Boolean(tagliandoMezzoId)}
              mezzoHasConfig={tagliandoPresetSync.mezzoHasConfig}
              mezzoPresetNome={tagliandoPresetSync.mezzoPresetNome}
              presetLocked={tagliandoPresetSync.presetLocked}
              disabled={disabled}
            />
          ) : null}

          <SchedaIngressoNoteSection
            lavorazioneNote={lavorazioneNote}
            onLavorazioneNoteChange={onLavorazioneNoteChange ?? (() => {})}
            disabled={disabled}
            noteFieldId={noteFieldId}
          />
        </FormSection>

        {tagliandoPresetSync.confirmDialog}

        <FormSection title="Richiedente" hideTitle>
          <SchedaIngressoAnagraficaFields
            value={fields}
            onPatch={onPatch}
            mezzi={mezziCatalog}
            disabled={disabled}
            sections={["richiedente"]}
            hideSectionTitles
            hideRichiedenteFirma
            bareSection
            captureHints={captureHints}
            onApplyCaptureHint={onApplyCaptureHint}
          />

          <SchedaIngressoFirmeSection
            richiedenteFirma={fields.richiedenteFirma}
            addettoFirma={fields.addettoFirma}
            disabled={disabled}
            onPatch={onPatch}
          />
        </FormSection>

        {variant === "create-lavorazione" ? (
          <SchedaIngressoGestioneLavorazioneSection
            fields={fields}
            disabled={disabled}
            stato={stato}
            priorita={priorita}
            onStatoChange={onStatoChange}
            onPrioritaChange={onPrioritaChange}
            onPatch={onPatch}
            globalOptsLoading={globalOpts.isLoading}
            statiEmpty={stati.length === 0}
            prioritaEmpty={prioritaOpts.length === 0}
            statoPillOptions={statoPillOptions}
            prioritaPillOptions={prioritaPillOptions}
            statoPillStyle={statoPillStyle}
            prioritaPillStyle={prioritaPillStyle}
            ingressoAddettoId={ingressoAddettoId}
            onIngressoAddettoChange={onIngressoAddettoChange}
            addettiEmpty={addettiOpts.length === 0}
            addettoPickerOptions={addettoPickerOptions}
            captureHintAddetto={captureHints?.addettoAccettazione}
            onApplyCaptureHint={onApplyCaptureHint}
            showStatoPriorita
          />
        ) : (
          <SchedaIngressoGestioneLavorazioneSection
            fields={fields}
            disabled={disabled}
            ingressoAddettoId={ingressoAddettoId}
            onIngressoAddettoChange={onIngressoAddettoChange}
            addettiEmpty={addettiOpts.length === 0}
            addettoPickerOptions={addettoPickerOptions}
            captureHintAddetto={captureHints?.addettoAccettazione}
            onApplyCaptureHint={onApplyCaptureHint}
            showStatoPriorita={false}
            statoPillOptions={statoPillOptions}
            prioritaPillOptions={prioritaPillOptions}
            onPatch={onPatch}
          />
        )}
      </SchedaIngressoFormScrollShell>
    </>
  );
}

export function SchedaIngressoEditModal({
  open,
  initialFields,
  initialLavorazioneNote = "",
  initialTagliandoFields,
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
  bootstrapMezzoId,
}: {
  open: boolean;
  initialFields: SchedaIngressoFields;
  initialLavorazioneNote?: string;
  initialTagliandoFields?: TagliandoLavorazioneFields;
  /** Chiusura (Annulla / ESC): riceve il draft corrente per dirty-check nel parent. */
  onRequestClose: (draft: SchedaIngressoFields) => void;
  onSave: (
    draft: SchedaIngressoFields,
    mezzoUpdatePlan?: import("@/lib/domain/mezzo/mezzo-update-from-scheda-plan").MezzoUpdateFromSchedaPlan,
    lavorazioneNote?: string,
    tagliandoFields?: TagliandoLavorazioneFields,
  ) => void | Promise<void>;
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
  /** Mezzo collegato alla lavorazione — baseline anagrafica all'apertura. */
  bootstrapMezzoId?: string | null;
}) {
  const ro = readOnly || !canEdit;
  const [saving, setSaving] = useState(false);
  const [lavorazioneNote, setLavorazioneNote] = useState(initialLavorazioneNote);
  const [tagliandoFields, setTagliandoFields] = useState<TagliandoLavorazioneFields>(
    initialTagliandoFields ?? DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
  );
  const formEngine = useFormEngine<SchedaIngressoFields>({ initial: initialFields });
  const { value: draft, reset, setValue, patch: onPatch, runSubmit, formProps, ref: draftRef } =
    formEngine;
  const savePending = pending || saving;
  const tagliandoFieldsRef = useRef(tagliandoFields);
  const lavorazioneNoteRef = useRef(lavorazioneNote);
  const ingressoEditorOpenedRef = useRef(false);
  const mezzoBootstrapDoneRef = useRef(false);

  useLayoutEffect(() => {
    tagliandoFieldsRef.current = tagliandoFields;
  }, [tagliandoFields]);

  useLayoutEffect(() => {
    lavorazioneNoteRef.current = lavorazioneNote;
  }, [lavorazioneNote]);

  useEffect(() => {
    if (!open) {
      ingressoEditorOpenedRef.current = false;
      mezzoBootstrapDoneRef.current = false;
      return;
    }
    if (ingressoEditorOpenedRef.current) return;
    ingressoEditorOpenedRef.current = true;
    reset(initialFields);
    setLavorazioneNote(initialLavorazioneNote);
    lavorazioneNoteRef.current = initialLavorazioneNote;
    setTagliandoFields(initialTagliandoFields ?? DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS);
  }, [open, initialFields, initialLavorazioneNote, initialTagliandoFields, reset]);

  const patchLavorazioneNote = useCallback((value: string) => {
    lavorazioneNoteRef.current = value;
    setLavorazioneNote(value);
  }, []);

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
  const saveGate = useSchedaIngressoSaveGate({
    mezziCatalog,
    linkedSnapshot: mezzoPrompt.linkedSnapshot,
  });

  const { bootstrapLinkedMezzo } = mezzoPrompt;
  useEffect(() => {
    if (!open || mezzoBootstrapDoneRef.current) return;
    const mezzoId = bootstrapMezzoId?.trim();
    if (!mezzoId) return;
    const mezzo = mezziCatalog.find((m) => m.id === mezzoId);
    if (!mezzo) return;
    mezzoBootstrapDoneRef.current = true;
    bootstrapLinkedMezzo(mezzo, pickMezzoPermanentFields(initialFields));
  }, [open, bootstrapMezzoId, mezziCatalog, initialFields, bootstrapLinkedMezzo]);

  const patchTagliandoFields = useCallback((patch: Partial<TagliandoLavorazioneFields>) => {
    setTagliandoFields((prev) => {
      const next = { ...prev, ...patch };
      tagliandoFieldsRef.current = next;
      return next;
    });
  }, []);

  const globalOpts = useGlobalOptions({ enabled: open, debugTag: "SchedaIngressoEditModal" });
  const { gateSubmit, dialog: unknownSettingsDialog } = useSchedaIngressoUnknownSettingsGate(globalOpts);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ro || !open || savePending) return;
    void runSubmit(e.currentTarget, async (snap) => {
      await gateSubmit(snap, async (gatedFields) => {
        setSaving(true);
        try {
          let mezzoUpdatePlan;
          try {
            mezzoUpdatePlan = await saveGate.gateSave(gatedFields);
          } catch (err) {
            if (err instanceof Error && err.message === "SAVE_CANCELLED") return;
            throw err;
          }
          await onSave(
            writeIngressoAddettoId(
              gatedFields,
              gatedFields.addettoAccettazioneId?.trim() ||
                backfillAddettoIdFromLegacyString(
                  globalOpts.lavorazioni.addettiRecords,
                  gatedFields.addettoAccettazione,
                ) ||
                "",
            ),
            mezzoUpdatePlan,
            lavorazioneNoteRef.current,
            tagliandoFieldsRef.current,
          );
        } finally {
          setSaving(false);
        }
      });
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
          lavorazioneNote={lavorazioneNote}
          onLavorazioneNoteChange={patchLavorazioneNote}
          tagliandoFields={tagliandoFields}
          onTagliandoFieldsChange={patchTagliandoFields}
          mezzoId={mezzoPrompt.linkedSnapshot?.id ?? ""}
          requestInitialFocus={open}
        />
      </form>
      {unknownSettingsDialog}
      {saveGate.dialog}
    </SchedaIngressoFormModalShell>
  );
}
