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
import { Tooltip } from "@/components/ui";
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
  value,
  addettoFirma,
  disabled,
  addettoPillOptions,
  addettoPillShellClass,
  addettoPillStyle,
  addettiEmpty,
  onAddettoChange,
  onFirmaChange,
  firmaModalOpen,
  onFirmaModalOpenChange,
  equalPillWidth = false,
  firmaButtonClassName = "",
}: {
  value: string;
  addettoFirma?: string;
  disabled?: boolean;
  addettoPillOptions: readonly FixedListPillOption[];
  addettoPillShellClass: () => string;
  addettoPillStyle: React.CSSProperties | undefined;
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
    <AddettoSelectField
      value={value}
      onChange={onAddettoChange}
      options={addettoPillOptions}
      shellClass={addettoPillShellClass()}
      shellStyle={addettoPillStyle}
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
  noteIntervento,
  onPatch,
  disabled,
  anomaliaFieldId,
  noteFieldId,
}: {
  descrizioneAnomalia: string;
  noteIntervento: string;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
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
          value={noteIntervento}
          onChange={(v) => onPatch({ noteIntervento: sliceInputValue(v, TEXT_LONG) })}
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
  if (prev.anomaliaFieldId !== next.anomaliaFieldId) return false;
  if (prev.noteFieldId !== next.noteFieldId) return false;
  return (
    prev.descrizioneAnomalia === next.descrizioneAnomalia &&
    prev.noteIntervento === next.noteIntervento
  );
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
  addettoPillOptions: readonly FixedListPillOption[];
  statoPillStyle: CSSProperties | undefined;
  prioritaPillStyle: CSSProperties | undefined;
  addettoPillStyle: CSSProperties | undefined;
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
  addettoPillOptions,
  statoPillStyle,
  prioritaPillStyle,
  addettoPillStyle,
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
                    value={fields.addettoAccettazione}
                    addettoFirma={fields.addettoFirma}
                    disabled={disabled}
                    addettoPillOptions={addettoPillOptions}
                    addettoPillShellClass={addettoPillShellClass}
                    addettoPillStyle={addettoPillStyle}
                    addettiEmpty={addettiEmpty}
                    onAddettoChange={(v) => onPatch({ addettoAccettazione: v })}
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
  if (prev.addettoPillOptions !== next.addettoPillOptions) return false;
  if (prev.statoPillStyle !== next.statoPillStyle) return false;
  if (prev.prioritaPillStyle !== next.prioritaPillStyle) return false;
  if (prev.addettoPillStyle !== next.addettoPillStyle) return false;
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
  onMezzoDialogAccept,
  onMezzoDialogDismiss,
  mezzoLinked = false,
  mezzoId = "",
  prependContent,
  sharedGlobalOpts,
  sharedMezziCatalog,
  captureHints,
  onApplyCaptureHint,
  captureReviewCount,
  embedInParentScroll = false,
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
  captureHints?: Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>>;
  onApplyCaptureHint?: (key: keyof SchedaIngressoFields, value: string) => void;
  captureReviewCount?: number;
  /** Wizard capture: scroll delegato al GestionaleModalScrollBody del launcher. */
  embedInParentScroll?: boolean;
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
  const ingressoReuseBannerVisible =
    Boolean(lastIngressoMatch) ||
    (lastIngressoCandidates.length === 0 && lastIngressoMezzoInAnagrafica);
  const [copyPickOpen, setCopyPickOpen] = useState(false);
  const [addettoFirmaModalOpen, setAddettoFirmaModalOpen] = useState(false);

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
        open={mezzoPrompt.promptOpen && !readOnly && !ingressoReuseBannerVisible}
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
            addettoPillOptions={addettoPillOptions}
            statoPillStyle={statoPillStyle}
            prioritaPillStyle={prioritaPillStyle}
            addettoPillStyle={addettoPillStyle}
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
                value={fields.addettoAccettazione}
                addettoFirma={fields.addettoFirma}
                disabled={disabled}
                addettoPillOptions={addettoPillOptions}
                addettoPillShellClass={addettoPillShellClass}
                addettoPillStyle={addettoPillStyle}
                addettiEmpty={addettiOpts.length === 0}
                onAddettoChange={(v) => onPatch({ addettoAccettazione: v })}
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
          captureHints={captureHints}
          onApplyCaptureHint={onApplyCaptureHint}
        />

        {heavySectionsReady ? (
          <SchedaIngressoInterventoSection
            descrizioneAnomalia={fields.descrizioneAnomalia}
            noteIntervento={fields.noteIntervento ?? ""}
            onPatch={onPatch}
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

  const globalOpts = useGlobalOptions({ enabled: open, debugTag: "SchedaIngressoEditModal" });
  const { gateSubmit, dialog: unknownSettingsDialog } = useSchedaIngressoUnknownSettingsGate(globalOpts);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ro || !open || savePending) return;
    void runSubmit(e.currentTarget, async (snap) => {
      await gateSubmit(snap, async (gatedFields) => {
        setSaving(true);
        try {
          await onSave(gatedFields);
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
        />
      </form>
      {unknownSettingsDialog}
    </SchedaIngressoFormModalShell>
  );
}
