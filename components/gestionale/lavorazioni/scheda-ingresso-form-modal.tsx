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
  SchedaIngressoTagliandoSection,
} from "@/components/gestionale/lavorazioni/scheda-ingresso-tagliando-section";
import {
  DEFAULT_TAGLIANDO_LAVORAZIONE_FIELDS,
  interventionTypeFromTagliandoFields,
  tagliandoFieldsFromInterventionType,
  type TagliandoLavorazioneFields,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import {
  applySchedaIngressoTypedFields,
  type SchedaIngressoStringKey,
} from "@/lib/schede/scheda-ingresso-typed-fields";
import { useMaintenancePlansListQuery } from "@/src/hooks/gestionale/use-maintenance-plans-queries";
import { useMezzoMaintenanceConfigsQuery } from "@/src/hooks/gestionale/use-maintenance-engine-v2";
import { useTagliandoMezzoPresetSync } from "@/src/hooks/use-tagliando-mezzo-preset-sync";
import { sliceInputValue, TEXT_EXTRA, TEXT_LONG } from "@/lib/validation/text-field-limits";
import type { LavorazioneArchiviata, LavorazioneAttiva, PrioritaLav } from "@/lib/lavorazioni/types";
import type { SchedaIngressoIdentField } from "@/lib/schede/scheda-ingresso-ident-suggest";
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
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
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
import { dsBtnDanger, dsBtnNeutral, dsInput } from "@/lib/ui/design-system";
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
    return <div className="min-w-0 space-y-3">{children}</div>;
  }
  return <GestionaleModalScrollBody className="space-y-3">{children}</GestionaleModalScrollBody>;
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
  if (raw.addettoFirma !== undefined && raw.addettoFirma !== null) {
    out.addettoFirma = String(raw.addettoFirma);
  }
  out.livelloCarburante = normalizeLivelloCarburanteStored(out.livelloCarburante);
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

function AddettoAccettazioneWithFirma({
  addettoId,
  addettoFirma,
  disabled,
  addettiEmpty,
  onAddettoChange,
  onFirmaChange,
  firmaModalOpen,
  onFirmaModalOpenChange,
  equalPillWidth = false,
  firmaButtonClassName = "",
}: {
  addettoId: string;
  addettoFirma?: string;
  disabled?: boolean;
  addettiEmpty: boolean;
  onAddettoChange: (v: string) => void;
  onFirmaChange: (dataUrl: string) => void;
  firmaModalOpen: boolean;
  onFirmaModalOpenChange: (open: boolean) => void;
  /** Pill a larghezza piena (griglia 3 colonne uguali); firma fuori dalla cella pill. */
  equalPillWidth?: boolean;
  firmaButtonClassName?: string;
}) {
  const hasFirma = hasSignatureDataUrl(addettoFirma ?? "");
  const addettoPill = (
    <AddettoPicker
      value={addettoId || null}
      onChange={onAddettoChange}
      ariaLabel={SCHEDA_INGRESSO_ADDETTO_ACCETTAZIONE_LABEL}
      size="form"
      disabled={disabled || addettiEmpty}
    />
  );

  return (
    <>
      {equalPillWidth ? (
        addettoPill
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">{addettoPill}</div>
          <IngressoAddettoFirmaButton
            hasFirma={hasFirma}
            disabled={disabled}
            onOpen={() => onFirmaModalOpenChange(true)}
            className={firmaButtonClassName}
          />
        </div>
      )}
      {hasFirma ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <RichiedenteFirmaDisplay dataUrl={addettoFirma} consultable label="addetto officina" />
          <button
            type="button"
            className={dsBtnNeutral}
            disabled={disabled}
            onClick={() => onFirmaChange("")}
          >
            Rimuovi firma
          </button>
        </div>
      ) : null}
      <RichiedenteFirmaCaptureModal
        open={firmaModalOpen}
        initialDataUrl={addettoFirma ?? ""}
        title="Firma addetto"
        titleId="addetto-firma-capture-title"
        onClose={() => onFirmaModalOpenChange(false)}
        onSave={(dataUrl) => onFirmaChange(dataUrl)}
      />
    </>
  );
}

const SchedaIngressoInterventoSection = memo(function SchedaIngressoInterventoSection({
  descrizioneAnomalia,
  lavorazioneNote,
  onPatch,
  onLavorazioneNoteChange,
  disabled,
  anomaliaFieldId,
  noteFieldId,
}: {
  descrizioneAnomalia: string;
  lavorazioneNote: string;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
  onLavorazioneNoteChange: (value: string) => void;
  disabled: boolean;
  anomaliaFieldId: string;
  noteFieldId: string;
}) {
  return (
    <FormSection title="Intervento">
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
    </FormSection>
  );
}, (prev, next) => {
  if (prev.disabled !== next.disabled) return false;
  if (prev.onPatch !== next.onPatch) return false;
  if (prev.onLavorazioneNoteChange !== next.onLavorazioneNoteChange) return false;
  if (prev.anomaliaFieldId !== next.anomaliaFieldId) return false;
  if (prev.noteFieldId !== next.noteFieldId) return false;
  return prev.descrizioneAnomalia === next.descrizioneAnomalia && prev.lavorazioneNote === next.lavorazioneNote;
});

type SchedaIngressoCreateIngressoSectionProps = {
  fields: SchedaIngressoFields;
  disabled: boolean;
  dataIngressoFieldId: string;
  stato: string | undefined;
  priorita: PrioritaLavorazione | undefined;
  onStatoChange?: (v: string) => void;
  onPrioritaChange?: (v: PrioritaLavorazione) => void;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
  globalOptsLoading: boolean;
  statiEmpty: boolean;
  prioritaEmpty: boolean;
  statoPillOptions: readonly FixedListPillOption[];
  prioritaPillOptions: readonly FixedListPillOption[];
  statoPillStyle: CSSProperties | undefined;
  prioritaPillStyle: CSSProperties | undefined;
  ingressoAddettoId: string;
  onIngressoAddettoChange: (addettoId: string) => void;
  addettiEmpty: boolean;
  addettoFirmaModalOpen: boolean;
  onAddettoFirmaModalOpenChange: (open: boolean) => void;
  captureHintAddetto?: CaptureIngressoFieldHint;
  onApplyCaptureHint?: (key: keyof SchedaIngressoFields, value: string) => void;
};

const SchedaIngressoCreateIngressoSection = memo(function SchedaIngressoCreateIngressoSection({
  fields,
  disabled,
  dataIngressoFieldId,
  stato,
  priorita,
  onStatoChange,
  onPrioritaChange,
  onPatch,
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
  addettoFirmaModalOpen,
  onAddettoFirmaModalOpenChange,
  captureHintAddetto,
  onApplyCaptureHint,
}: SchedaIngressoCreateIngressoSectionProps) {
  return (
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
      <div className="space-y-3" role="group" aria-label="Stato, priorità e addetto">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
          <FormField label="Stato iniziale" className="min-w-0">
            <GlobalFixedListPillSelect
              value={stato ?? ""}
              onChange={(v) => onStatoChange?.(v)}
              options={statoPillOptions}
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
              options={prioritaPillOptions}
              ariaLabel="Priorità"
              disabled={disabled || prioritaEmpty}
              shellClass={prioritaPillShellClass()}
              fallbackPillStyle={prioritaPillStyle}
              size="form"
            />
          </FormField>
          <FormField label={SCHEDA_INGRESSO_ADDETTO_LABEL} className="min-w-0">
            <CaptureAwareFormField hint={captureHintAddetto} footer={
              <CaptureIngressoFieldHintInline
                embedded
                fieldKey="addettoAccettazione"
                hint={captureHintAddetto}
                currentValue={fields.addettoAccettazione}
                onApply={onApplyCaptureHint}
              />
            }>
              <div className="flex min-w-0 items-center gap-2 sm:block">
                <div className="min-w-0 flex-1 sm:w-full">
                  <AddettoAccettazioneWithFirma
                    addettoId={ingressoAddettoId}
                    addettoFirma={fields.addettoFirma}
                    disabled={disabled}
                    addettiEmpty={addettiEmpty}
                    onAddettoChange={onIngressoAddettoChange}
                    onFirmaChange={(dataUrl) => onPatch({ addettoFirma: dataUrl })}
                    firmaModalOpen={addettoFirmaModalOpen}
                    onFirmaModalOpenChange={onAddettoFirmaModalOpenChange}
                    equalPillWidth
                  />
                </div>
                <IngressoAddettoFirmaButton
                  hasFirma={hasSignatureDataUrl(fields.addettoFirma ?? "")}
                  disabled={disabled}
                  onOpen={() => onAddettoFirmaModalOpenChange(true)}
                  className="shrink-0 sm:hidden"
                />
              </div>
            </CaptureAwareFormField>
          </FormField>
          <div className="hidden sm:flex sm:items-end">
            <IngressoAddettoFirmaButton
              hasFirma={hasSignatureDataUrl(fields.addettoFirma ?? "")}
              disabled={disabled}
              onOpen={() => onAddettoFirmaModalOpenChange(true)}
            />
          </div>
        </div>
      </div>
    </FormSection>
  );
}, (prev, next) => {
  if (prev.disabled !== next.disabled) return false;
  if (prev.dataIngressoFieldId !== next.dataIngressoFieldId) return false;
  if (prev.stato !== next.stato) return false;
  if (prev.priorita !== next.priorita) return false;
  if (prev.onStatoChange !== next.onStatoChange) return false;
  if (prev.onPrioritaChange !== next.onPrioritaChange) return false;
  if (prev.onPatch !== next.onPatch) return false;
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
  if (prev.addettoFirmaModalOpen !== next.addettoFirmaModalOpen) return false;
  if (prev.onAddettoFirmaModalOpenChange !== next.onAddettoFirmaModalOpenChange) return false;
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
  mezzoLinked?: boolean;
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
  const linkedMezzoCatalog = useMemo(() => {
    const id = mezzoPrompt.linkedSnapshot?.id ?? mezzoPrompt.preferredMezzoId;
    if (!id) return null;
    return mezziCatalog.find((m) => m.id === id) ?? null;
  }, [mezziCatalog, mezzoPrompt.linkedSnapshot?.id, mezzoPrompt.preferredMezzoId]);

  const [copyPickOpen, setCopyPickOpen] = useState(false);
  const [addettoFirmaModalOpen, setAddettoFirmaModalOpen] = useState(false);

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

  const applyCopyFromMatch = useCallback(
    (match: LastSchedaIngressoMatch) => {
      setFields(
        applyCopyLastSchedaMatch("merge-empty", fields, match, {
          linkedMezzo: linkedMezzoCatalog,
          lookup: {
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
          },
        }),
      );
      setCopyPickOpen(false);
    },
    [
      attive,
      excludeLavorazioneId,
      fields,
      identScan.matricola,
      identScan.nScuderia,
      identScan.targa,
      linkedMezzoCatalog,
      mezziCatalog,
      schedeStore,
      setFields,
      storico,
    ],
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
      linkedMezzo: linkedMezzoCatalog,
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
    linkedMezzoCatalog,
    mezziCatalog,
    readOnly,
    schedeStore,
    setFields,
    storico,
  ]);

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
      <SchedaIngressoCopyPickDialog
        open={copyPickOpen}
        candidates={lastIngressoCandidates}
        onCancel={() => setCopyPickOpen(false)}
        onConfirm={applyCopyFromMatch}
      />
      <SchedaIngressoFormScrollShell embedInParentScroll={embedInParentScroll}>
        {prependContent}
        {captureReviewCount != null && captureReviewCount > 0 ? (
          <CaptureIngressoHintsBanner reviewCount={captureReviewCount} />
        ) : null}
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

        {variant === "create-lavorazione" ? (
          <SchedaIngressoCreateIngressoSection
            fields={fields}
            disabled={disabled}
            dataIngressoFieldId={dataIngressoFieldId}
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
            addettoFirmaModalOpen={addettoFirmaModalOpen}
            onAddettoFirmaModalOpenChange={setAddettoFirmaModalOpen}
            captureHintAddetto={captureHints?.addettoAccettazione}
            onApplyCaptureHint={onApplyCaptureHint}
          />
        ) : (
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
            <FormField label={SCHEDA_INGRESSO_ADDETTO_LABEL}>
              <CaptureAwareFormField
                hint={captureHints?.addettoAccettazione}
                footer={
                  <CaptureIngressoFieldHintInline
                    embedded
                    fieldKey="addettoAccettazione"
                    hint={captureHints?.addettoAccettazione}
                    currentValue={fields.addettoAccettazione}
                    onApply={onApplyCaptureHint}
                  />
                }
              >
                <AddettoAccettazioneWithFirma
                addettoId={ingressoAddettoId}
                addettoFirma={fields.addettoFirma}
                disabled={disabled}
                addettiEmpty={addettiOpts.length === 0}
                onAddettoChange={onIngressoAddettoChange}
                onFirmaChange={(dataUrl) => onPatch({ addettoFirma: dataUrl })}
                firmaModalOpen={addettoFirmaModalOpen}
                onFirmaModalOpenChange={setAddettoFirmaModalOpen}
              />
              </CaptureAwareFormField>
            </FormField>
          </FormSection>
        )}

        <SchedaIngressoAnagraficaFields
          value={fields}
          onPatch={onPatch}
          mezzi={mezziCatalog}
          disabled={disabled}
          sections={heavySectionsReady ? undefined : ["cliente"]}
          onExactMezzoMatch={onMezzoPromptMatch}
          mezzoInlineHint={mezzoInlineHint}
          onUseMezzoFromHint={(field) => mezzoPrompt.acceptLinkMezzo(field)}
          onDismissMezzoHint={mezzoPrompt.dismissPendingMatch}
          lastIngressoMatch={lastIngressoMatch}
          lastIngressoMatchCount={lastIngressoCandidates.length}
          mezzoInAnagraficaOnly={
            lastIngressoCandidates.length === 0 && lastIngressoMezzoInAnagrafica
          }
          onCopyLastIngresso={readOnly ? undefined : copyLastIngresso}
          clienteRequired={false}
          marcaAttrezzaturaRequired={false}
          mezzoLinked={mezzoLinked || mezzoPrompt.linkState.status === "linked"}
          mezzoId={mezzoId || mezzoPrompt.preferredMezzoId || ""}
          captureHints={captureHints}
          onApplyCaptureHint={onApplyCaptureHint}
        />

        {heavySectionsReady && tagliandoFields && onTagliandoFieldsChange ? (
          <SchedaIngressoTagliandoSection
            interventionType={interventionTypeFromTagliandoFields(tagliandoFields)}
            onInterventionTypeChange={(type) => {
              const next = tagliandoFieldsFromInterventionType(type);
              const patch: Partial<TagliandoLavorazioneFields> = { ...next };
              if (!next.isTagliando) {
                patch.tagliandoPresetRef = null;
                patch.tagliandoPresetVersionRef = null;
                patch.tagliandoAssignPresetToMezzo = null;
                patch.tagliandoNoPresetReason = null;
              }
              onTagliandoFieldsChange(patch);
            }}
            isGaranzia={tagliandoFields.isGaranzia}
            onIsGaranziaChange={(v) => onTagliandoFieldsChange({ isGaranzia: v })}
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

        {tagliandoPresetSync.confirmDialog}

        {heavySectionsReady ? (
          <SchedaIngressoInterventoSection
            descrizioneAnomalia={fields.descrizioneAnomalia}
            lavorazioneNote={lavorazioneNote}
            onPatch={onPatch}
            onLavorazioneNoteChange={onLavorazioneNoteChange ?? (() => {})}
            disabled={disabled}
            anomaliaFieldId={anomaliaFieldId}
            noteFieldId={noteFieldId}
          />
        ) : null}
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

  useLayoutEffect(() => {
    tagliandoFieldsRef.current = tagliandoFields;
  }, [tagliandoFields]);

  useLayoutEffect(() => {
    lavorazioneNoteRef.current = lavorazioneNote;
  }, [lavorazioneNote]);

  useEffect(() => {
    if (!open) {
      ingressoEditorOpenedRef.current = false;
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
        />
      </form>
      {unknownSettingsDialog}
      {saveGate.dialog}
    </SchedaIngressoFormModalShell>
  );
}
