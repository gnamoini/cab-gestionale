"use client";

import { memo, useId } from "react";
import { CopiaUltimaSchedaIngressoBanner } from "@/components/gestionale/lavorazioni/copia-ultima-scheda-ingresso-banner";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { LivelloCarburanteSegmentedSelect } from "@/components/gestionale/schede/livello-carburante-segmented-select";
import { CompatHierarchySelect } from "@/components/gestionale/magazzino/compat-hierarchy-multi-select";
import { GestionaleNumberInput } from "@/components/gestionale/gestionale-number-input";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { SchedaIngressoIdentAutocompleteField } from "@/lib/selector-core/legacy-selector-adapters";
import { dsInput } from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_SHORT } from "@/lib/validation/text-field-limits";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type SchedaIngressoAnagraficaSection = "cliente" | "attrezzatura" | "telaio" | "dettagli";

const ALL_SECTIONS: SchedaIngressoAnagraficaSection[] = ["cliente", "attrezzatura", "telaio", "dettagli"];

/** Chiude dropdown/sheet aperti quando un altro selector della scheda riceve focus. */
const SCHEDA_INGRESSO_EXCLUSIVE_GROUP = "scheda-ingresso";

function SchedaIngressoAnagraficaFieldsInner({
  value,
  onPatch,
  mezzi,
  disabled = false,
  sections = ALL_SECTIONS,
  onExactMezzoMatch,
  lastIngressoMatch,
  lastIngressoMatchCount = 1,
  onCopyLastIngresso,
  clienteRequired = false,
  marcaAttrezzaturaRequired = false,
  mezzoLinked = false,
}: {
  value: SchedaIngressoFields;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
  mezzi: readonly MezzoGestito[];
  disabled?: boolean;
  sections?: readonly SchedaIngressoAnagraficaSection[];
  onExactMezzoMatch?: (mezzo: MezzoGestito) => void;
  lastIngressoMatch?: { updatedAt?: string } | null;
  lastIngressoMatchCount?: number;
  onCopyLastIngresso?: () => void;
  clienteRequired?: boolean;
  marcaAttrezzaturaRequired?: boolean;
  mezzoLinked?: boolean;
}) {
  const show = (s: SchedaIngressoAnagraficaSection) => sections.includes(s);
  const inputFieldClass = `block w-full ${dsInput}`;
  const listSelectWrapClass = "w-full";
  const mezzoMatchHandler = onExactMezzoMatch ?? (() => {});
  const identSibling = {
    targa: value.targa,
    matricola: value.matricola,
    nScuderia: value.nScuderia,
  };

  const uid = useId();
  const fieldId = (suffix: string) => `${uid}-${suffix}`;

  return (
    <>
      {show("cliente") ? (
        <FormSection title="Anagrafica cliente">
          <FormField label="Cliente" htmlFor={fieldId("cliente")} required={clienteRequired}>
            <GlobalSettingsListSelect
              id={fieldId("cliente")}
              listKey="mezzi:clienti"
              className={listSelectWrapClass}
              value={value.cliente}
              onChange={(v) => onPatch({ cliente: v })}
              disabled={disabled}
              required={clienteRequired}
              exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
              aria-label="Cliente"
            />
          </FormField>
          <FormField label="Cantiere" htmlFor={fieldId("cantiere")}>
            <GlobalSettingsListSelect
              id={fieldId("cantiere")}
              listKey="mezzi:cantieri"
              className={listSelectWrapClass}
              value={value.cantiere}
              onChange={(v) => onPatch({ cantiere: v })}
              disabled={disabled}
              exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
              aria-label="Cantiere"
            />
          </FormField>
          <FormField label="Utilizzatore" htmlFor={fieldId("utilizzatore")}>
            <GlobalSettingsListSelect
              id={fieldId("utilizzatore")}
              listKey="mezzi:utilizzatori"
              className={listSelectWrapClass}
              value={value.utilizzatore}
              onChange={(v) => onPatch({ utilizzatore: v })}
              disabled={disabled}
              exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
              aria-label="Utilizzatore"
            />
          </FormField>
          <FormField label="Richiedente" htmlFor={fieldId("richiedente")}>
            <input
              id={fieldId("richiedente")}
              className={inputFieldClass}
              value={value.richiedente}
              onChange={(e) => onPatch({ richiedente: sliceInputValue(e.target.value, TEXT_SHORT) })}
              disabled={disabled}
              placeholder="Nome libero"
              maxLength={TEXT_SHORT}
              aria-label="Richiedente"
            />
          </FormField>
        </FormSection>
      ) : null}

      {show("attrezzatura") ? (
        <FormSection title="Anagrafica attrezzatura">
          <FormField label="Tipo attrezzatura" htmlFor={fieldId("tipo-attrezzatura")}>
            <GlobalSettingsListSelect
              id={fieldId("tipo-attrezzatura")}
              listKey="mezzi:tipiAttrezzatura"
              className={listSelectWrapClass}
              value={value.tipoAttrezzatura}
              onChange={(v) => onPatch({ tipoAttrezzatura: v })}
              disabled={disabled}
              exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
              aria-label="Tipo attrezzatura"
            />
          </FormField>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Marca" htmlFor={fieldId("marca-attrezzatura")} required={marcaAttrezzaturaRequired}>
              <CompatHierarchySelect
                id={fieldId("marca-attrezzatura")}
                tree="attrezzature"
                hierarchyKind="marca"
                className={listSelectWrapClass}
                value={value.marcaAttrezzatura}
                onChange={(v) => onPatch({ marcaAttrezzatura: v, modelloAttrezzatura: "" })}
                disabled={disabled}
                required={marcaAttrezzaturaRequired}
                exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
                ariaLabel="Marca attrezzatura"
              />
            </FormField>
            <FormField label="Modello" htmlFor={fieldId("modello-attrezzatura")}>
              <CompatHierarchySelect
                id={fieldId("modello-attrezzatura")}
                tree="attrezzature"
                hierarchyKind="modello"
                marcaNome={value.marcaAttrezzatura}
                className={listSelectWrapClass}
                value={value.modelloAttrezzatura}
                onChange={(v) => onPatch({ modelloAttrezzatura: v })}
                disabled={disabled}
                exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
                ariaLabel="Modello attrezzatura"
              />
            </FormField>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <SchedaIngressoIdentAutocompleteField
              field="matricola"
              label="Matricola"
              id={fieldId("matricola")}
              value={value.matricola}
              siblingIdent={identSibling}
              mezzi={mezzi}
              disabled={disabled}
              exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
              onChange={(v) => onPatch({ matricola: v })}
              onExactMezzoMatch={mezzoMatchHandler}
            />
            <SchedaIngressoIdentAutocompleteField
              field="nScuderia"
              label="N. scuderia"
              id={fieldId("n-scuderia")}
              value={value.nScuderia}
              siblingIdent={identSibling}
              mezzi={mezzi}
              disabled={disabled}
              exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
              onChange={(v) => onPatch({ nScuderia: v })}
              onExactMezzoMatch={mezzoMatchHandler}
            />
          </div>
          {onCopyLastIngresso ? (
            <CopiaUltimaSchedaIngressoBanner
              visible={Boolean(lastIngressoMatch)}
              highlight={false}
              updatedAt={lastIngressoMatch?.updatedAt}
              matchCount={lastIngressoMatchCount}
              disabled={disabled}
              onCopy={onCopyLastIngresso}
            />
          ) : null}
          {mezzoLinked ? (
            <p className="text-xs text-[color:var(--cab-text-muted)]">Mezzo collegato in anagrafica.</p>
          ) : null}
        </FormSection>
      ) : null}

      {show("telaio") ? (
        <FormSection title="Anagrafica mezzo / telaio">
          <FormField label="Tipo telaio" htmlFor={fieldId("tipo-telaio")}>
            <GlobalSettingsListSelect
              id={fieldId("tipo-telaio")}
              listKey="mezzi:tipiTelaio"
              className={listSelectWrapClass}
              value={value.tipoTelaio}
              onChange={(v) => onPatch({ tipoTelaio: v })}
              disabled={disabled}
              exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
              aria-label="Tipo telaio"
            />
          </FormField>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Marca" htmlFor={fieldId("marca-telaio")}>
              <CompatHierarchySelect
                id={fieldId("marca-telaio")}
                tree="telai"
                hierarchyKind="marca"
                className={listSelectWrapClass}
                value={value.marcaTelaio}
                onChange={(v) => onPatch({ marcaTelaio: v, modelloTelaio: "" })}
                disabled={disabled}
                exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
                ariaLabel="Marca telaio"
              />
            </FormField>
            <FormField label="Modello" htmlFor={fieldId("modello-telaio")}>
              <CompatHierarchySelect
                id={fieldId("modello-telaio")}
                tree="telai"
                hierarchyKind="modello"
                marcaNome={value.marcaTelaio}
                className={listSelectWrapClass}
                value={value.modelloTelaio}
                onChange={(v) => onPatch({ modelloTelaio: v })}
                disabled={disabled}
                exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
                ariaLabel="Modello telaio"
              />
            </FormField>
          </div>
          <SchedaIngressoIdentAutocompleteField
            field="targa"
            label="Targa"
            value={value.targa}
            siblingIdent={identSibling}
            mezzi={mezzi}
            disabled={disabled}
            exclusiveGroup={SCHEDA_INGRESSO_EXCLUSIVE_GROUP}
            onChange={(v) => onPatch({ targa: v })}
            onExactMezzoMatch={mezzoMatchHandler}
          />
        </FormSection>
      ) : null}

      {show("dettagli") ? (
        <FormSection title="Modelli e dettagli tecnici">
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Ore lavoro" htmlFor={fieldId("ore-lavoro")}>
              <GestionaleNumberInput
                id={fieldId("ore-lavoro")}
                min={0}
                inputMode="decimal"
                value={value.oreLavoro}
                onChange={(v) => onPatch({ oreLavoro: v })}
                disabled={disabled}
                aria-label="Ore lavoro"
              />
            </FormField>
            <FormField label="KM" htmlFor={fieldId("km")}>
              <GestionaleNumberInput
                id={fieldId("km")}
                min={0}
                inputMode="numeric"
                value={value.km}
                onChange={(v) => onPatch({ km: v })}
                disabled={disabled}
                aria-label="KM"
              />
            </FormField>
          </div>
          <FormField label="Carburante" htmlFor={fieldId("carburante")}>
            <LivelloCarburanteSegmentedSelect
              id={fieldId("carburante")}
              value={value.livelloCarburante}
              onChange={(v) => onPatch({ livelloCarburante: v })}
              disabled={disabled}
              aria-label="Livello carburante"
            />
          </FormField>
        </FormSection>
      ) : null}
    </>
  );
}

export const SchedaIngressoAnagraficaFields = memo(SchedaIngressoAnagraficaFieldsInner);
