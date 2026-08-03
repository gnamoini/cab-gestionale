"use client";

import { memo, useCallback, useEffect, useId, useMemo, useState } from "react";
import { Tooltip } from "@/components/ui";

import {
  MezzoRegistratoIngressoInlineHint,
  SchedaIngressoMezzoFieldDriftHint,
  type MezzoIngressoInlineHintVariant,
} from "@/components/lavorazioni/schede/mezzo-registrato-ingresso-inline-hint";
import { InterventoTargetSelect } from "@/components/gestionale/intervento/intervento-target-select";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { LivelloCarburanteSegmentedSelect } from "@/components/gestionale/schede/livello-carburante-segmented-select";
import { CompatHierarchySelect } from "@/components/gestionale/magazzino/compat-hierarchy-multi-select";
import { GestionaleNumberInput } from "@/components/gestionale/gestionale-number-input";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { RichiedenteFirmaDisplay } from "@/components/gestionale/schede/richiedente-firma-display";
import { RichiedenteFirmaCaptureModal } from "@/components/gestionale/schede/richiedente-firma-capture-modal";
import { SchedaIngressoIdentTextField } from "@/components/lavorazioni/schede/scheda-ingresso-ident-text-field";
import { hasSignatureDataUrl } from "@/lib/media/signature-pad";
import { attrezzatureForMezzo } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { AttrezzaturaGestita } from "@/lib/attrezzature/types";
import {
  defaultTargetTypeForProfilo,
  schedaIngressoMezzoSectionOrder,
  showAttrezzaturaSections,
  showInterventoTargetToggle,
  showTelaioSections,
} from "@/lib/officina/officina-profilo-operativo";
import { useOfficinaProfiloOperativo } from "@/lib/officina/use-officina-profilo-operativo";
import { dsBtnNeutral, dsBtnNeutralIconForm, dsInput } from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_SHORT } from "@/lib/validation/text-field-limits";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { attrezzatureEntry } from "@/lib/domain/attrezzature-entry";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";
import type { SchedaIngressoFields } from "@/types/schede";
import type { SchedaIngressoIdentField } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { SchedaIngressoIdentMatchKind } from "@/lib/schede/scheda-ingresso-ident-suggest";
import type { CaptureIngressoFieldHint } from "@/lib/document-capture/capture-ingresso-field-hints";
import {
  resolveIngressoOreDraft,
  type OreLavoroFields,
  type SchedaIngressoOreDraft,
} from "@/lib/schede/resolve-ore-lavoro-fields";
import {
  isMezzoPermanentField,
  type MezzoPermanentFieldKey,
} from "@/lib/schede/scheda-ingresso-field-roles";
import {
  SCHEDA_INGRESSO_ANAGRAFICA_FIELD_KEYS,
  schedaIngressoFieldsSliceEqual,
} from "@/lib/schede/scheda-ingresso-form-field-groups";
import { SCHEDA_INGRESSO_LIST_EMPTY_OPTION_LABEL } from "@/lib/schede/scheda-ingresso-ui-labels";
import type { MezzoCatalogFieldDrift } from "@/lib/schede/scheda-ingresso-mezzo-catalog-drift";
import {
  CaptureAwareFormField,
  CaptureIngressoFieldHintInline,
} from "@/components/document-capture/capture-ingresso-field-hint";

export type SchedaIngressoAnagraficaSection = "cliente" | "attrezzatura" | "telaio" | "richiedente";

const ALL_SECTIONS: SchedaIngressoAnagraficaSection[] = ["cliente", "attrezzatura", "telaio", "richiedente"];

/** Campi combobox opzionali: voce «Nessuna selezione» in elenco + pulsante svuota; input vuoto a riposo. */
function schedaIngressoOptionalListSelectProps(required = false) {
  if (required) return {};
  return {
    emptyOptionLabel: SCHEDA_INGRESSO_LIST_EMPTY_OPTION_LABEL,
    clearable: true as const,
    hideEmptyOptionInInput: true as const,
  };
}

/** Chiude dropdown/sheet aperti quando un altro selector della scheda riceve focus. */
const SCHEDA_INGRESSO_EXCLUSIVE_GROUP = "scheda-ingresso";

function SchedaIngressoAnagraficaFieldsInner({
  value,
  onPatch,
  mezzi,
  disabled = false,
  sections = ALL_SECTIONS,
  surface = "lavorazione",
  onExactMezzoMatch,
  onMezzoIdentMatch,
  onAmbiguousMezzoMatch,
  dismissedMezzoIds,
  mezzoInlineHint = null,
  mezzoCatalogFieldDrifts = [],
  onUseMezzoFromHint,
  onDismissMezzoHint,
  onDismissAmbiguousHint,
  onVerifyMezzoConflict,
  clienteRequired = false,
  marcaAttrezzaturaRequired = false,
  mezzoLinked = false,
  mezzoId = "",
  captureHints,
  onApplyCaptureHint,
  onOreLavoroPatch,
  onNotifyPermanentFieldUserEdit,
  hideSectionTitles = false,
  hideRichiedenteFirma = false,
  bareSection = false,
}: {
  value: SchedaIngressoFields & SchedaIngressoOreDraft;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
  onOreLavoroPatch?: (patch: Partial<OreLavoroFields>) => void;
  mezzi: readonly MezzoGestito[];
  disabled?: boolean;
  sections?: readonly SchedaIngressoAnagraficaSection[];
  /** `preventivo` — snapshot interno: niente hint/drift/autofill mezzo da catalogo. */
  surface?: "lavorazione" | "preventivo";
  onExactMezzoMatch?: (mezzo: MezzoGestito, field: SchedaIngressoIdentField) => void;
  onMezzoIdentMatch?: (
    mezzo: MezzoGestito,
    field: SchedaIngressoIdentField,
    kind: SchedaIngressoIdentMatchKind,
  ) => void;
  onAmbiguousMezzoMatch?: (candidates: readonly MezzoGestito[], field: SchedaIngressoIdentField) => void;
  dismissedMezzoIds?: ReadonlySet<string>;
  mezzoInlineHint?: {
    variant: MezzoIngressoInlineHintVariant;
    mezzo?: MezzoGestito;
    matchField: SchedaIngressoIdentField;
    ambiguousCandidates?: readonly MezzoGestito[];
  } | null;
  mezzoCatalogFieldDrifts?: readonly MezzoCatalogFieldDrift[];
  onUseMezzoFromHint?: (field: SchedaIngressoIdentField) => void;
  onDismissMezzoHint?: () => void;
  onDismissAmbiguousHint?: () => void;
  onVerifyMezzoConflict?: () => void;
  clienteRequired?: boolean;
  marcaAttrezzaturaRequired?: boolean;
  mezzoLinked?: boolean;
  mezzoId?: string;
  captureHints?: Partial<Record<keyof SchedaIngressoFields, CaptureIngressoFieldHint>>;
  onApplyCaptureHint?: (key: keyof SchedaIngressoFields, value: string) => void;
  onNotifyPermanentFieldUserEdit?: (key: MezzoPermanentFieldKey | readonly MezzoPermanentFieldKey[]) => void;
  hideSectionTitles?: boolean;
  hideRichiedenteFirma?: boolean;
  bareSection?: boolean;
}) {
  const profilo = useOfficinaProfiloOperativo();
  const isPreventivoSurface = surface === "preventivo";
  const catalogMezzi = isPreventivoSurface ? [] : mezzi;

  const patchUserPermanent = useCallback(
    (patch: Partial<SchedaIngressoFields>) => {
      if (onNotifyPermanentFieldUserEdit) {
        for (const key of Object.keys(patch) as (keyof SchedaIngressoFields)[]) {
          if (isMezzoPermanentField(key)) onNotifyPermanentFieldUserEdit(key);
        }
      }
      onPatch(patch);
    },
    [onNotifyPermanentFieldUserEdit, onPatch],
  );
  const resolvedSections = useMemo(() => {
    if (sections) {
      return sections.filter((s) => {
        if (s === "attrezzatura") return showAttrezzaturaSections(profilo);
        if (s === "telaio") return showTelaioSections(profilo);
        return true;
      });
    }
    const out: SchedaIngressoAnagraficaSection[] = ["cliente"];
    if (showAttrezzaturaSections(profilo)) out.push("attrezzatura");
    if (showTelaioSections(profilo)) out.push("telaio");
    out.push("richiedente");
    return out;
  }, [sections, profilo]);
  const show = (s: SchedaIngressoAnagraficaSection) => resolvedSections.includes(s);
  const targetType = value.targetType ?? defaultTargetTypeForProfilo(profilo);
  const showInterventoTargetToggleField = showInterventoTargetToggle(profilo);
  const showAttSection = show("attrezzatura");
  const showTelSection = show("telaio");
  const [attrezzature, setAttrezzature] = useState<readonly AttrezzaturaGestita[]>([]);
  const [firmaModalOpen, setFirmaModalOpen] = useState(false);

  useEffect(() => {
    if (!mezzoId.trim()) {
      setAttrezzature([]);
      return;
    }
    let cancelled = false;
    void attrezzatureEntry.listByMezzo(mezzoId.trim()).then((res) => {
      if (cancelled || !res.success) return;
      setAttrezzature(attrezzatureForMezzo((res.data ?? []) as AttrezzaturaRow[], mezzoId.trim()));
    });
    return () => {
      cancelled = true;
    };
  }, [mezzoId]);

  useEffect(() => {
    if (value.targetType) return;
    onPatch({ targetType: defaultTargetTypeForProfilo(profilo) });
  }, [value.targetType, profilo, onPatch]);
  const inputFieldClass = `block w-full ${dsInput}`;
  const listSelectWrapClass = "w-full";
  const mezzoIdentMatchHandler =
    isPreventivoSurface ? undefined : onMezzoIdentMatch ?? onExactMezzoMatch
      ? (mezzo: MezzoGestito, field: SchedaIngressoIdentField, kind: SchedaIngressoIdentMatchKind) => {
          if (onMezzoIdentMatch) onMezzoIdentMatch(mezzo, field, kind);
          else if (kind === "exact") onExactMezzoMatch?.(mezzo, field);
        }
      : undefined;
  const ambiguousMatchHandler = isPreventivoSurface ? undefined : onAmbiguousMezzoMatch;
  const excludeLinkedMezzoId = mezzoLinked && mezzoId.trim() ? mezzoId.trim() : undefined;

  const renderIdentHint = (field: SchedaIngressoIdentField) => {
    if (isPreventivoSurface) return null;
    if (!mezzoInlineHint || mezzoInlineHint.matchField !== field) return null;
    if (
      mezzoInlineHint.variant !== "trovato" &&
      mezzoInlineHint.variant !== "simile" &&
      mezzoInlineHint.variant !== "ambiguo"
    ) {
      return null;
    }
    return (
      <MezzoRegistratoIngressoInlineHint
        variant={mezzoInlineHint.variant}
        mezzo={mezzoInlineHint.mezzo}
        ambiguousCandidates={mezzoInlineHint.ambiguousCandidates}
        matchField={field}
        onUseMezzo={
          mezzoInlineHint.variant !== "ambiguo" && onUseMezzoFromHint
            ? () => onUseMezzoFromHint(field)
            : undefined
        }
        onDismiss={
          mezzoInlineHint.variant === "ambiguo" ? onDismissAmbiguousHint : onDismissMezzoHint
        }
      />
    );
  };

  const uid = useId();
  const fieldId = (suffix: string) => `${uid}-${suffix}`;
  const oreLavoro = resolveIngressoOreDraft(value);
  const onOrePatch = onOreLavoroPatch ?? (() => {});

  const hintAfter = (key: keyof SchedaIngressoFields, embedded = false) => (
    <CaptureIngressoFieldHintInline
      embedded={embedded}
      fieldKey={key}
      hint={captureHints?.[key]}
      currentValue={String(value[key] ?? "")}
      onApply={onApplyCaptureHint}
    />
  );

  const driftSavedByField = useMemo(() => {
    const map = new Map<MezzoPermanentFieldKey, string>();
    for (const drift of mezzoCatalogFieldDrifts) map.set(drift.field, drift.savedValue);
    return map;
  }, [mezzoCatalogFieldDrifts]);

  const renderMezzoDriftHint = (field: MezzoPermanentFieldKey) => {
    if (isPreventivoSurface) return null;
    const savedValue = driftSavedByField.get(field);
    if (savedValue === undefined) return null;
    return <SchedaIngressoMezzoFieldDriftHint savedValue={savedValue} />;
  };

  const captureFooter = (key: keyof SchedaIngressoFields, embedded = false) => (
    <>
      {hintAfter(key, embedded)}
      {isMezzoPermanentField(key) ? renderMezzoDriftHint(key) : null}
    </>
  );

  return (
    <>
      {show("cliente") ? (
        <FormSection title="Anagrafica cliente" hideTitle={hideSectionTitles}>
          <FormField label="Cliente" htmlFor={fieldId("cliente")} required={clienteRequired}>
            <CaptureAwareFormField hint={captureHints?.cliente} footer={captureFooter("cliente", true)}>
              <GlobalSettingsListSelect
              id={fieldId("cliente")}
              listKey="mezzi:clienti"
              className={listSelectWrapClass}
              value={value.cliente}
              onChange={(v) => patchUserPermanent({ cliente: v })}
              disabled={disabled}
              required={clienteRequired}
              exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
              aria-label="Cliente"
              {...schedaIngressoOptionalListSelectProps(clienteRequired)}
            />
            </CaptureAwareFormField>
          </FormField>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Cantiere" htmlFor={fieldId("cantiere")}>
              <CaptureAwareFormField hint={captureHints?.cantiere} footer={captureFooter("cantiere", true)}>
                <GlobalSettingsListSelect
                id={fieldId("cantiere")}
                listKey="mezzi:cantieri"
                className={listSelectWrapClass}
                value={value.cantiere}
                onChange={(v) => patchUserPermanent({ cantiere: v })}
                disabled={disabled}
                exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
                aria-label="Cantiere"
                {...schedaIngressoOptionalListSelectProps()}
              />
              </CaptureAwareFormField>
            </FormField>
            <FormField label="Utilizzatore" htmlFor={fieldId("utilizzatore")}>
              <CaptureAwareFormField hint={captureHints?.utilizzatore} footer={captureFooter("utilizzatore", true)}>
                <GlobalSettingsListSelect
                id={fieldId("utilizzatore")}
                listKey="mezzi:utilizzatori"
                className={listSelectWrapClass}
                value={value.utilizzatore}
                onChange={(v) => patchUserPermanent({ utilizzatore: v })}
                disabled={disabled}
                exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
                aria-label="Utilizzatore"
                {...schedaIngressoOptionalListSelectProps()}
              />
              </CaptureAwareFormField>
            </FormField>
          </div>
          {showInterventoTargetToggleField ? (
            <FormField label="Oggetto intervento">
              <InterventoTargetSelect
                value={targetType}
                attrezzaturaId={value.attrezzaturaId}
                attrezzature={attrezzature}
                disabled={disabled}
                onChange={(t, attrezzaturaId) => patchUserPermanent({ targetType: t, attrezzaturaId })}
              />
              {renderMezzoDriftHint("targetType")}
              {renderMezzoDriftHint("attrezzaturaId")}
            </FormField>
          ) : null}
        </FormSection>
      ) : null}

      {schedaIngressoMezzoSectionOrder(profilo).map((kind) =>
        kind === "attrezzatura" ? (
      showAttSection ? (
        <FormSection key="attrezzatura" title="Anagrafica attrezzatura" hideTitle={hideSectionTitles}>
          <FormField label="Tipo attrezzatura" htmlFor={fieldId("tipo-attrezzatura")}>
            <GlobalSettingsListSelect
              id={fieldId("tipo-attrezzatura")}
              listKey="mezzi:tipiAttrezzatura"
              className={listSelectWrapClass}
              value={value.tipoAttrezzatura}
              onChange={(v) => patchUserPermanent({ tipoAttrezzatura: v })}
              disabled={disabled}
              exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
              aria-label="Tipo attrezzatura"
              {...schedaIngressoOptionalListSelectProps()}
            />
            {renderMezzoDriftHint("tipoAttrezzatura")}
          </FormField>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Marca" htmlFor={fieldId("marca-attrezzatura")} required={marcaAttrezzaturaRequired}>
              <CaptureAwareFormField hint={captureHints?.marcaAttrezzatura} footer={captureFooter("marcaAttrezzatura", true)}>
              <CompatHierarchySelect
                id={fieldId("marca-attrezzatura")}
                tree="attrezzature"
                hierarchyKind="marca"
                className={listSelectWrapClass}
                value={value.marcaAttrezzatura}
                onChange={(v) => patchUserPermanent({ marcaAttrezzatura: v, modelloAttrezzatura: "" })}
                disabled={disabled}
                required={marcaAttrezzaturaRequired}
                exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
                ariaLabel="Marca attrezzatura"
                {...schedaIngressoOptionalListSelectProps(marcaAttrezzaturaRequired)}
              />
              </CaptureAwareFormField>
            </FormField>
            <FormField label="Modello" htmlFor={fieldId("modello-attrezzatura")}>
              <CaptureAwareFormField hint={captureHints?.modelloAttrezzatura} footer={captureFooter("modelloAttrezzatura", true)}>
              <CompatHierarchySelect
                id={fieldId("modello-attrezzatura")}
                tree="attrezzature"
                hierarchyKind="modello"
                marcaNome={value.marcaAttrezzatura}
                className={listSelectWrapClass}
                value={value.modelloAttrezzatura}
                onChange={(v) => patchUserPermanent({ modelloAttrezzatura: v })}
                disabled={disabled}
                exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
                ariaLabel="Modello attrezzatura"
                {...schedaIngressoOptionalListSelectProps()}
              />
              </CaptureAwareFormField>
            </FormField>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <SchedaIngressoIdentTextField
                field="matricola"
                label="Matricola"
                id={fieldId("matricola")}
                value={value.matricola}
                mezzi={catalogMezzi}
                disabled={disabled}
                excludeMezzoId={excludeLinkedMezzoId}
                dismissedMezzoIds={dismissedMezzoIds}
                onChange={(v) => patchUserPermanent({ matricola: v })}
                onMezzoMatch={mezzoIdentMatchHandler}
                onAmbiguousMatch={ambiguousMatchHandler}
              />
              {renderIdentHint("matricola")}
              {hintAfter("matricola")}
              {renderMezzoDriftHint("matricola")}
            </div>
            <div>
              <SchedaIngressoIdentTextField
                field="nScuderia"
                label="N. scuderia"
                id={fieldId("n-scuderia")}
                value={value.nScuderia}
                mezzi={catalogMezzi}
                disabled={disabled}
                excludeMezzoId={excludeLinkedMezzoId}
                dismissedMezzoIds={dismissedMezzoIds}
                onChange={(v) => patchUserPermanent({ nScuderia: v })}
                onMezzoMatch={mezzoIdentMatchHandler}
                onAmbiguousMatch={ambiguousMatchHandler}
              />
              {renderIdentHint("nScuderia")}
              {hintAfter("nScuderia")}
              {renderMezzoDriftHint("nScuderia")}
            </div>
          </div>
          {!isPreventivoSurface ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Ore lavoro motore" htmlFor={fieldId("ore-lavoro-motore")}>
              <GestionaleNumberInput
                id={fieldId("ore-lavoro-motore")}
                min={0}
                inputMode="decimal"
                value={oreLavoro.oreLavoroMotore}
                onChange={(v) => onOrePatch({ oreLavoroMotore: v })}
                disabled={disabled}
                aria-label="Ore lavoro motore"
              />
            </FormField>
            <FormField label="Ore lavoro PTO" htmlFor={fieldId("ore-lavoro-pto")}>
              <GestionaleNumberInput
                id={fieldId("ore-lavoro-pto")}
                min={0}
                inputMode="decimal"
                value={oreLavoro.oreLavoroPto}
                onChange={(v) => onOrePatch({ oreLavoroPto: v })}
                disabled={disabled}
                aria-label="Ore lavoro PTO"
              />
            </FormField>
          </div>
          ) : null}
        </FormSection>
      ) : null
        ) : showTelSection ? (
        <FormSection key="telaio" title="Anagrafica mezzo / telaio" hideTitle={hideSectionTitles}>
          <FormField label="Tipo telaio" htmlFor={fieldId("tipo-telaio")}>
            <GlobalSettingsListSelect
              id={fieldId("tipo-telaio")}
              listKey="mezzi:tipiTelaio"
              className={listSelectWrapClass}
              value={value.tipoTelaio}
              onChange={(v) => patchUserPermanent({ tipoTelaio: v })}
              disabled={disabled}
              exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
              aria-label="Tipo telaio"
              {...schedaIngressoOptionalListSelectProps()}
            />
            {renderMezzoDriftHint("tipoTelaio")}
          </FormField>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Marca" htmlFor={fieldId("marca-telaio")}>
              <CompatHierarchySelect
                id={fieldId("marca-telaio")}
                tree="telai"
                hierarchyKind="marca"
                className={listSelectWrapClass}
                value={value.marcaTelaio}
                onChange={(v) => patchUserPermanent({ marcaTelaio: v, modelloTelaio: "" })}
                disabled={disabled}
                exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
                ariaLabel="Marca telaio"
                {...schedaIngressoOptionalListSelectProps()}
              />
              {renderMezzoDriftHint("marcaTelaio")}
            </FormField>
            <FormField label="Modello" htmlFor={fieldId("modello-telaio")}>
              <CompatHierarchySelect
                id={fieldId("modello-telaio")}
                tree="telai"
                hierarchyKind="modello"
                marcaNome={value.marcaTelaio}
                className={listSelectWrapClass}
                value={value.modelloTelaio}
                onChange={(v) => patchUserPermanent({ modelloTelaio: v })}
                disabled={disabled}
                exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
                ariaLabel="Modello telaio"
                {...schedaIngressoOptionalListSelectProps()}
              />
              {renderMezzoDriftHint("modelloTelaio")}
            </FormField>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <SchedaIngressoIdentTextField
                field="targa"
                label="Targa"
                value={value.targa}
                mezzi={catalogMezzi}
                disabled={disabled}
                excludeMezzoId={excludeLinkedMezzoId}
                dismissedMezzoIds={dismissedMezzoIds}
                onChange={(v) => patchUserPermanent({ targa: v })}
                onMezzoMatch={mezzoIdentMatchHandler}
                onAmbiguousMatch={ambiguousMatchHandler}
              />
              {renderIdentHint("targa")}
              {hintAfter("targa")}
              {renderMezzoDriftHint("targa")}
            </div>
            <div>
              <SchedaIngressoIdentTextField
                field="vin"
                label="VIN"
                id={fieldId("vin")}
                value={value.vin}
                mezzi={catalogMezzi}
                disabled={disabled}
                excludeMezzoId={excludeLinkedMezzoId}
                dismissedMezzoIds={dismissedMezzoIds}
                onChange={(v) => patchUserPermanent({ vin: sliceInputValue(v, TEXT_SHORT) })}
                onMezzoMatch={mezzoIdentMatchHandler}
                onAmbiguousMatch={ambiguousMatchHandler}
              />
              {renderIdentHint("vin")}
              {hintAfter("vin")}
              {renderMezzoDriftHint("vin")}
            </div>
          </div>
          {!isPreventivoSurface ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="KM" htmlFor={fieldId("km")}>
              <GestionaleNumberInput
                id={fieldId("km")}
                min={0}
                inputMode="decimal"
                value={value.km}
                onChange={(v) => patchUserPermanent({ km: v })}
                disabled={disabled}
                aria-label="KM"
              />
            </FormField>
            <FormField label="Carburante" htmlFor={fieldId("carburante")}>
              <LivelloCarburanteSegmentedSelect
                id={fieldId("carburante")}
                value={value.livelloCarburante}
                onChange={(v) => patchUserPermanent({ livelloCarburante: v })}
                disabled={disabled}
                aria-label="Livello carburante"
              />
            </FormField>
          </div>
          ) : null}
        </FormSection>
      ) : null,
      )}

      {show("richiedente") ? (
        bareSection ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <FormField label="Richiedente" htmlFor={fieldId("richiedente")}>
                <CaptureAwareFormField hint={captureHints?.richiedente} footer={hintAfter("richiedente", true)}>
                  <input
                    id={fieldId("richiedente")}
                    className={inputFieldClass}
                    value={value.richiedente}
                    onChange={(e) => patchUserPermanent({ richiedente: sliceInputValue(e.target.value, TEXT_SHORT) })}
                    disabled={disabled}
                    placeholder="Nome libero"
                    maxLength={TEXT_SHORT}
                    aria-label="Richiedente"
                  />
                </CaptureAwareFormField>
              </FormField>
              <FormField label="Telefono richiedente" htmlFor={fieldId("richiedente-telefono")}>
                <input
                  id={fieldId("richiedente-telefono")}
                  className={inputFieldClass}
                  value={value.richiedenteTelefono}
                  onChange={(e) => patchUserPermanent({ richiedenteTelefono: sliceInputValue(e.target.value, TEXT_SHORT) })}
                  disabled={disabled}
                  placeholder="Numero di telefono"
                  maxLength={TEXT_SHORT}
                  autoComplete="tel"
                  aria-label="Telefono richiedente"
                />
              </FormField>
            </div>
          </>
        ) : (
        <FormSection title="Richiedente" hideTitle={hideSectionTitles}>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Richiedente" htmlFor={fieldId("richiedente")}>
              <CaptureAwareFormField hint={captureHints?.richiedente} footer={hintAfter("richiedente", true)}>
                <input
                  id={fieldId("richiedente")}
                  className={inputFieldClass}
                  value={value.richiedente}
                  onChange={(e) => patchUserPermanent({ richiedente: sliceInputValue(e.target.value, TEXT_SHORT) })}
                  disabled={disabled}
                  placeholder="Nome libero"
                  maxLength={TEXT_SHORT}
                  aria-label="Richiedente"
                />
              </CaptureAwareFormField>
            </FormField>
            <FormField label="Telefono richiedente" htmlFor={fieldId("richiedente-telefono")}>
              <input
                id={fieldId("richiedente-telefono")}
                className={inputFieldClass}
                value={value.richiedenteTelefono}
                onChange={(e) => patchUserPermanent({ richiedenteTelefono: sliceInputValue(e.target.value, TEXT_SHORT) })}
                disabled={disabled}
                placeholder="Numero di telefono"
                maxLength={TEXT_SHORT}
                autoComplete="tel"
                aria-label="Telefono richiedente"
              />
            </FormField>
          </div>
          {!hideRichiedenteFirma ? (
          <FormField label="Firma richiedente">
            <div className="flex min-w-0 items-center gap-2">
              <Tooltip content={hasSignatureDataUrl(value.richiedenteFirma ?? "") ? "Modifica firma" : "Acquisisci firma"}>
                <button
                  type="button"
                  className={`${dsBtnNeutralIconForm} ${hasSignatureDataUrl(value.richiedenteFirma ?? "") ? "ring-2 ring-[color:color-mix(in_srgb,var(--cab-success)_45%,transparent)]" : ""}`}
                  disabled={disabled}
                  aria-label={hasSignatureDataUrl(value.richiedenteFirma ?? "") ? "Modifica firma richiedente" : "Acquisisci firma richiedente"}
                  onClick={() => setFirmaModalOpen(true)}
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
              </Tooltip>
              {hasSignatureDataUrl(value.richiedenteFirma ?? "") ? (
                <RichiedenteFirmaDisplay dataUrl={value.richiedenteFirma} consultable />
              ) : (
                <span className="text-xs text-[color:var(--cab-text-muted)]">Nessuna firma acquisita</span>
              )}
            </div>
            {hasSignatureDataUrl(value.richiedenteFirma ?? "") ? (
              <div className="mt-2">
                <button
                  type="button"
                  className={dsBtnNeutral}
                  disabled={disabled}
                  onClick={() => onPatch({ richiedenteFirma: "" })}
                >
                  Rimuovi firma
                </button>
              </div>
            ) : null}
          </FormField>
          ) : null}
          {!hideRichiedenteFirma ? (
          <RichiedenteFirmaCaptureModal
            open={firmaModalOpen}
            initialDataUrl={value.richiedenteFirma ?? ""}
            onClose={() => setFirmaModalOpen(false)}
            onSave={(dataUrl) => onPatch({ richiedenteFirma: dataUrl })}
          />
          ) : null}
        </FormSection>
        )
      ) : null}
    </>
  );
}

export const SchedaIngressoAnagraficaFields = memo(
  SchedaIngressoAnagraficaFieldsInner,
  (prev, next) => {
    if (prev.disabled !== next.disabled) return false;
    if (prev.surface !== next.surface) return false;
    if (prev.onPatch !== next.onPatch) return false;
    if (prev.mezzi !== next.mezzi) return false;
    if (prev.sections !== next.sections) return false;
    if (prev.onExactMezzoMatch !== next.onExactMezzoMatch) return false;
    if (prev.onMezzoIdentMatch !== next.onMezzoIdentMatch) return false;
    if (prev.onAmbiguousMezzoMatch !== next.onAmbiguousMezzoMatch) return false;
    if (prev.dismissedMezzoIds !== next.dismissedMezzoIds) return false;
    if (prev.mezzoInlineHint !== next.mezzoInlineHint) return false;
    if (prev.mezzoCatalogFieldDrifts !== next.mezzoCatalogFieldDrifts) return false;
    if (prev.onUseMezzoFromHint !== next.onUseMezzoFromHint) return false;
    if (prev.onDismissMezzoHint !== next.onDismissMezzoHint) return false;
    if (prev.onDismissAmbiguousHint !== next.onDismissAmbiguousHint) return false;
    if (prev.onNotifyPermanentFieldUserEdit !== next.onNotifyPermanentFieldUserEdit) return false;
    if (prev.onVerifyMezzoConflict !== next.onVerifyMezzoConflict) return false;
    if (prev.clienteRequired !== next.clienteRequired) return false;
    if (prev.marcaAttrezzaturaRequired !== next.marcaAttrezzaturaRequired) return false;
    if (prev.mezzoLinked !== next.mezzoLinked) return false;
    if (prev.mezzoId !== next.mezzoId) return false;
    if (prev.captureHints !== next.captureHints) return false;
    if (prev.onApplyCaptureHint !== next.onApplyCaptureHint) return false;
    if (prev.onOreLavoroPatch !== next.onOreLavoroPatch) return false;
    if (prev.hideSectionTitles !== next.hideSectionTitles) return false;
    if (prev.hideRichiedenteFirma !== next.hideRichiedenteFirma) return false;
    if (prev.bareSection !== next.bareSection) return false;
    if (prev.value.oreLavoroPto !== next.value.oreLavoroPto) return false;
    return schedaIngressoFieldsSliceEqual(
      prev.value,
      next.value,
      SCHEDA_INGRESSO_ANAGRAFICA_FIELD_KEYS,
    );
  },
);
