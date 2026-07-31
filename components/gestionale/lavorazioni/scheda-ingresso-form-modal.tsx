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
} from "react";
import { useGlobalOptions, type GlobalOptionsSlice } from "@/src/hooks/use-global-options";
import { orderPrioritaList } from "@/lib/lavorazioni/priorita-order";
import { prioritaDisplayColor, statoDisplayColor } from "@/lib/lavorazioni/lavorazioni-theme";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  mezzoIngressoSuggestLabel,
} from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { SchedaIngressoIdentField } from "@/lib/schede/scheda-ingresso-ident-suggest";
import { identificazionePartsFromMezzo } from "@/lib/mezzi/identificazione-mezzo";
import { listMezzoCatalogFieldDrifts } from "@/lib/schede/scheda-ingresso-mezzo-catalog-drift";
import { SchedaMezzoIdentificazioneReadonly } from "@/components/lavorazioni/schede/scheda-form-utils";
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
import { useSchedaIngressoSavePipeline } from "@/src/hooks/use-scheda-ingresso-save-pipeline";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { useFormEngine } from "@/lib/forms/form-engine";
import { prepareFormSubmitAsync } from "@/lib/forms/form-engine/prepare-form-submit";
import type { FormSubmitLock } from "@/lib/forms/form-engine/submit-lock";
import type {
  IngressoSaveCommitInput,
  IngressoSaveCommitResult,
  IngressoSaveResult,
} from "@/lib/schede/scheda-ingresso-save-pipeline";
import { LavorazioniModalShell } from "@/components/gestionale/lavorazioni/lavorazioni-modals";
import {
  GestionaleModalFooterActions,
  GestionaleModalFooterCancelButton,
  GestionaleModalFooterDeleteButton,
  GestionaleModalFooterSaveButton,
} from "@/components/design-system";
import { Tooltip } from "@/components/ui";
import {
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
import { dsBtnNeutral, dsInput } from "@/lib/ui/design-system";
import { cabModalLayerClass } from "@/lib/ui/mobile-modal-behavior";
import { GestionaleModalScrollBody } from "@/components/gestionale/mobile-modal-scroll-body";
import {
  gestionaleModalBodyFlexClass,
  type ModalHeight,
  type ModalSize,
} from "@/lib/ui/modal-max-width-class";
import { useMezziListQuery } from "@/src/hooks/gestionale/use-entity-list-queries";
import { useSchedaIngressoUnknownSettingsGate } from "@/src/hooks/use-scheda-ingresso-unknown-settings-gate";
import { GestionaleUnsavedChangesDialog } from "@/components/gestionale/gestionale-unsaved-changes-dialog";
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
    <FormField label={title} className="min-w-0">
      <SchedaMezzoIdentificazioneReadonly
        parts={identificazionePartsFromMezzo(mezzo)}
        fallbackLine={mezzoIngressoSuggestLabel(mezzo)}
        shellVariant="ingresso"
      />
    </FormField>
  );
}

function SchedaIngressoIngressoDataSection({
  dataIngresso,
  disabled,
  dataIngressoFieldId,
  onDataIngressoChange,
  linkedMezzo,
  mezzoPrefilledFromCatalog = false,
}: {
  dataIngresso: string;
  disabled: boolean;
  dataIngressoFieldId: string;
  onDataIngressoChange: (v: string) => void;
  linkedMezzo?: MezzoGestito | null;
  mezzoPrefilledFromCatalog?: boolean;
}) {
  return (
    <FormSection title="Ingresso" hideTitle>
      <div className="grid gap-2 sm:grid-cols-2">
        <FormField label="Data ingresso" htmlFor={dataIngressoFieldId} required className="min-w-0">
          <GlobalDatePicker
            id={dataIngressoFieldId}
            value={dataIngresso}
            onChange={onDataIngressoChange}
            inputClassName={dsInput}
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
  statoFieldLabel?: string;
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
  statoFieldLabel = "Stato iniziale",
}: SchedaIngressoGestioneLavorazioneSectionProps) {
  const statoOpts = statoPillOptions ?? [];
  const prioritaOpts = prioritaPillOptions ?? [];
  const showStatoPriorita = onStatoChange != null && onPrioritaChange != null;
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
              <FormField label={statoFieldLabel} className="min-w-0">
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
                placeholder={SCHEDA_INGRESSO_ADDETTO_LABEL}
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
  if (prev.statoFieldLabel !== next.statoFieldLabel) return false;
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
  onBack,
  variant,
  subtitle,
  children,
  footer,
  modalSize = "formLarge",
  modalHeight,
}: {
  open: boolean;
  onRequestClose: () => void;
  onBack?: () => void;
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
      onBack={onBack}
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

  const linkedMezzoCatalog = useMemo(() => {
    const id = mezzoPrompt.linkedSnapshot?.id ?? mezzoPrompt.preferredMezzoId;
    if (!id) return null;
    return mezziCatalog.find((m) => m.id === id) ?? null;
  }, [mezziCatalog, mezzoPrompt.linkedSnapshot?.id, mezzoPrompt.preferredMezzoId]);

  const mezzoCatalogFieldDrifts = useMemo(() => {
    if (!linkedMezzoCatalog || mezzoPrompt.linkState.status !== "linked") return [];
    return listMezzoCatalogFieldDrifts(
      fields,
      linkedMezzoCatalog,
      mezzoPrompt.editedPermanentFields,
    );
  }, [
    fields,
    linkedMezzoCatalog,
    mezzoPrompt.editedPermanentFields,
    mezzoPrompt.linkState.status,
  ]);

  const mezzoInlineHint = useMemo(() => {
    if (mezzoPrefilledFromCatalog) return null;
    if (mezzoPrompt.linkState.status === "unconfirmed_match" && mezzoPrompt.pendingMezzo) {
      return {
        variant: "trovato" as const,
        mezzo: mezzoPrompt.pendingMezzo,
        matchField: (mezzoPrompt.activeMatchField ?? "matricola") as SchedaIngressoIdentField,
      };
    }
    return null;
  }, [
    mezzoPrefilledFromCatalog,
    mezzoPrompt.activeMatchField,
    mezzoPrompt.linkState.status,
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
          mezzoCatalogFieldDrifts={mezzoCatalogFieldDrifts}
          onUseMezzoFromHint={(field) => mezzoPrompt.acceptLinkMezzo(field)}
          onDismissMezzoHint={mezzoPrompt.dismissPendingMatch}
          onNotifyPermanentFieldUserEdit={mezzoPrompt.notifyPermanentFieldUserEdit}
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
          statoFieldLabel={variant === "create-lavorazione" ? "Stato iniziale" : "Stato"}
        />
      </SchedaIngressoFormScrollShell>
    </>
  );
}

export function SchedaIngressoEditModal({
  open,
  initialFields,
  initialLavorazioneNote = "",
  initialTagliandoFields,
  onClose,
  commitIngressoEdit,
  onSaveSuccess,
  ingressoSaveRunRef,
  submitLock,
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
  initialLavorazioneStato,
  initialLavorazionePriorita,
}: {
  open: boolean;
  initialFields: SchedaIngressoFields;
  initialLavorazioneNote?: string;
  initialTagliandoFields?: TagliandoLavorazioneFields;
  /** Chiusura dopo conferma (Annulla / X / ESC senza modifiche). */
  onClose: () => void;
  /** Unico commit — invocato solo dalla pipeline SSOT. */
  commitIngressoEdit: (input: IngressoSaveCommitInput) => Promise<IngressoSaveCommitResult>;
  onSaveSuccess?: () => void;
  /** Espone run() per «Salva ed esci» dal parent (stessa pipeline). */
  ingressoSaveRunRef?: React.MutableRefObject<(() => Promise<IngressoSaveResult>) | null>;
  /** Lock condiviso col hub schede — evita persist in background durante save. */
  submitLock?: FormSubmitLock;
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
  initialLavorazioneStato: string;
  initialLavorazionePriorita: PrioritaLavorazione;
}) {
  const ro = readOnly || !canEdit;
  const [lavorazioneStato, setLavorazioneStato] = useState(initialLavorazioneStato);
  const [lavorazionePriorita, setLavorazionePriorita] = useState(initialLavorazionePriorita);
  const [lavorazioneNote, setLavorazioneNote] = useState(initialLavorazioneNote);
  const [tagliandoFields, setTagliandoFields] = useState<TagliandoLavorazioneFields>(
    initialTagliandoFields ?? DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
  );
  const formEngine = useFormEngine<SchedaIngressoFields>({ initial: initialFields });
  const { value: draft, reset, setValue, patch: onPatch, getSnapshot, formProps, ref: draftRef } =
    formEngine;
  const commitRef = useRef(commitIngressoEdit);
  commitRef.current = commitIngressoEdit;
  const tagliandoFieldsRef = useRef(tagliandoFields);
  const lavorazioneNoteRef = useRef(lavorazioneNote);
  const lavorazioneStatoRef = useRef(lavorazioneStato);
  const lavorazionePrioritaRef = useRef(lavorazionePriorita);
  const ingressoEditorOpenedRef = useRef(false);
  const mezzoBootstrapDoneRef = useRef(false);
  const baselineRef = useRef<string | null>(null);
  const [unsavedExitOpen, setUnsavedExitOpen] = useState(false);

  const syncCloseBaseline = useCallback(() => {
    baselineRef.current = JSON.stringify({
      fields: getSnapshot(),
      lavorazioneNote: lavorazioneNoteRef.current,
      tagliandoFields: tagliandoFieldsRef.current,
      lavorazioneStato: lavorazioneStatoRef.current,
      lavorazionePriorita: lavorazionePrioritaRef.current,
    });
  }, [getSnapshot]);

  const isCloseDirty = useCallback(() => {
    const baseline = baselineRef.current;
    if (!baseline) return false;
    return (
      baseline !==
      JSON.stringify({
        fields: getSnapshot(),
        lavorazioneNote: lavorazioneNoteRef.current,
        tagliandoFields: tagliandoFieldsRef.current,
        lavorazioneStato: lavorazioneStatoRef.current,
        lavorazionePriorita: lavorazionePrioritaRef.current,
      })
    );
  }, [getSnapshot]);

  const requestClose = useCallback(() => {
    if (!isCloseDirty()) {
      setUnsavedExitOpen(false);
      onClose();
      return;
    }
    setUnsavedExitOpen(true);
  }, [isCloseDirty, onClose]);

  useLayoutEffect(() => {
    tagliandoFieldsRef.current = tagliandoFields;
  }, [tagliandoFields]);

  useLayoutEffect(() => {
    lavorazioneNoteRef.current = lavorazioneNote;
  }, [lavorazioneNote]);

  useLayoutEffect(() => {
    lavorazioneStatoRef.current = lavorazioneStato;
  }, [lavorazioneStato]);

  useLayoutEffect(() => {
    lavorazionePrioritaRef.current = lavorazionePriorita;
  }, [lavorazionePriorita]);

  useEffect(() => {
    if (!open) {
      ingressoEditorOpenedRef.current = false;
      mezzoBootstrapDoneRef.current = false;
      baselineRef.current = null;
      setUnsavedExitOpen(false);
      return;
    }
    if (ingressoEditorOpenedRef.current) return;
    ingressoEditorOpenedRef.current = true;
    reset(initialFields);
    setLavorazioneNote(initialLavorazioneNote);
    lavorazioneNoteRef.current = initialLavorazioneNote;
    setTagliandoFields(initialTagliandoFields ?? DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS);
    tagliandoFieldsRef.current = initialTagliandoFields ?? DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS;
    setLavorazioneStato(initialLavorazioneStato);
    lavorazioneStatoRef.current = initialLavorazioneStato;
    setLavorazionePriorita(initialLavorazionePriorita);
    lavorazionePrioritaRef.current = initialLavorazionePriorita;
    const baselineTimer = window.setTimeout(() => syncCloseBaseline(), 0);
    return () => window.clearTimeout(baselineTimer);
  }, [
    open,
    initialFields,
    initialLavorazioneNote,
    initialTagliandoFields,
    initialLavorazioneStato,
    initialLavorazionePriorita,
    reset,
    syncCloseBaseline,
  ]);

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

    const snap = getSnapshot();
    // ponytail: attendi default targetType dal figlio — evita falso conflitto al primo focus
    if (!snap.targetType) return;

    mezzoBootstrapDoneRef.current = true;
    bootstrapLinkedMezzo(mezzo, pickMezzoPermanentFields(snap));
    syncCloseBaseline();
  }, [
    open,
    bootstrapMezzoId,
    mezziCatalog,
    draft.targetType,
    getSnapshot,
    bootstrapLinkedMezzo,
    syncCloseBaseline,
  ]);

  const patchTagliandoFields = useCallback((patch: Partial<TagliandoLavorazioneFields>) => {
    setTagliandoFields((prev) => {
      const next = { ...prev, ...patch };
      tagliandoFieldsRef.current = next;
      return next;
    });
  }, []);

  const globalOpts = useGlobalOptions({ enabled: open, debugTag: "SchedaIngressoEditModal" });
  const { gateSubmit, dialog: unknownSettingsDialog } = useSchedaIngressoUnknownSettingsGate(globalOpts);

  const savePipeline = useSchedaIngressoSavePipeline({
    submitLock,
    mezziCatalog,
    gateSubmit,
    gateSave: saveGate.gateSave,
    commit: (input) => commitRef.current(input),
  });
  const savePending = pending || savePipeline.isPending;

  const runIngressoSave = useCallback(async (): Promise<IngressoSaveResult> => {
    const snap = getSnapshot();
    const addettoId =
      snap.addettoAccettazioneId?.trim() ||
      backfillAddettoIdFromLegacyString(
        globalOpts.lavorazioni.addettiRecords,
        snap.addettoAccettazione,
      ) ||
      "";
    const fields = writeIngressoAddettoId(snap, addettoId);
    const result = await savePipeline.run({
      fields,
      lavorazioneNote: lavorazioneNoteRef.current,
      tagliandoFields: tagliandoFieldsRef.current,
      lavorazioneGestione: {
        stato: lavorazioneStatoRef.current,
        priorita: lavorazionePrioritaRef.current,
      },
    });
    if (result.ok) onSaveSuccess?.();
    return result;
  }, [getSnapshot, globalOpts.lavorazioni.addettiRecords, onSaveSuccess, savePipeline]);

  useEffect(() => {
    if (!ingressoSaveRunRef) return;
    ingressoSaveRunRef.current = runIngressoSave;
    return () => {
      ingressoSaveRunRef.current = null;
    };
  }, [ingressoSaveRunRef, runIngressoSave]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ro || !open || savePending) return;
    void (async () => {
      await prepareFormSubmitAsync(e.currentTarget);
      await runIngressoSave();
    })();
  }

  if (!open) return null;

  return (
    <>
    <SchedaIngressoFormModalShell
      open={open}
      onRequestClose={requestClose}
      onBack={requestClose}
      variant="edit-scheda"
      subtitle="Modifica i dati di accettazione mezzo."
      footer={
        <GestionaleModalFooterActions>
          {onDelete && !readOnly ? (
            <GestionaleModalFooterDeleteButton onClick={onDelete} disabled={savePending}>
              Elimina scheda
            </GestionaleModalFooterDeleteButton>
          ) : null}
          <GestionaleModalFooterCancelButton onClick={requestClose} disabled={savePending} />
          {!ro ? (
            <GestionaleModalFooterSaveButton
              type="submit"
              form="scheda-ingresso-edit-form"
              loading={savePending}
            >
              Salva scheda
            </GestionaleModalFooterSaveButton>
          ) : null}
        </GestionaleModalFooterActions>
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
          stato={lavorazioneStato}
          priorita={lavorazionePriorita}
          onStatoChange={setLavorazioneStato}
          onPrioritaChange={setLavorazionePriorita}
          updatedByHint={updatedBy?.trim() || null}
          mezzoPrompt={mezzoPrompt}
          lavorazioneNote={lavorazioneNote}
          onLavorazioneNoteChange={patchLavorazioneNote}
          tagliandoFields={tagliandoFields}
          onTagliandoFieldsChange={patchTagliandoFields}
          mezzoId={mezzoPrompt.linkedSnapshot?.id ?? ""}
        />
      </form>
      {unknownSettingsDialog}
      {saveGate.dialog}
    </SchedaIngressoFormModalShell>

    <GestionaleUnsavedChangesDialog
      open={unsavedExitOpen}
      placement="stacked"
      message="Hai modifiche non salvate. Vuoi uscire senza salvare?"
      pending={savePending}
      onStay={() => setUnsavedExitOpen(false)}
      onDiscard={() => {
        setUnsavedExitOpen(false);
        onClose();
      }}
      onSaveAndExit={() => {
        void (async () => {
          const result = await runIngressoSave();
          if (result.ok) setUnsavedExitOpen(false);
        })();
      }}
    />
    </>
  );
}
