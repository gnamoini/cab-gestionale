"use client";

import { memo, useCallback, useRef } from "react";
import { findExactMezzoForIngressoIdent } from "@/lib/schede/scheda-ingresso-ident-suggest";
import { CopiaUltimaSchedaIngressoBanner } from "@/components/gestionale/lavorazioni/copia-ultima-scheda-ingresso-banner";
import { GlobalSelect, GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { CompatHierarchySelect } from "@/components/gestionale/magazzino/compat-hierarchy-multi-select";
import { FormField, FormSection } from "@/components/gestionale/schede/gestionale-form-section";
import { SchedaIngressoIdentAutocompleteField } from "@/components/lavorazioni/schede/scheda-ingresso-ident-autocomplete-field";
import { dsBtnNeutral, dsInput } from "@/lib/ui/design-system";
import { sliceInputValue, TEXT_SHORT } from "@/lib/validation/text-field-limits";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SchedaIngressoFields } from "@/types/schede";

export type SchedaIngressoAnagraficaSection = "cliente" | "attrezzatura" | "telaio" | "dettagli";

const ALL_SECTIONS: SchedaIngressoAnagraficaSection[] = ["cliente", "attrezzatura", "telaio", "dettagli"];

function SchedaIngressoAnagraficaFieldsInner({
  value,
  onPatch,
  mezzi,
  disabled = false,
  sections = ALL_SECTIONS,
  onExactMezzoMatch,
  lastIngressoMatch,
  onCopyLastIngresso,
  clienteRequired = false,
  marcaAttrezzaturaRequired = false,
  onSaveMezzo,
  saveMezzoPending = false,
  mezzoLinked = false,
}: {
  value: SchedaIngressoFields;
  onPatch: (patch: Partial<SchedaIngressoFields>) => void;
  mezzi: readonly MezzoGestito[];
  disabled?: boolean;
  sections?: readonly SchedaIngressoAnagraficaSection[];
  onExactMezzoMatch?: (mezzo: MezzoGestito) => void;
  lastIngressoMatch?: { updatedAt?: string } | null;
  onCopyLastIngresso?: () => void;
  clienteRequired?: boolean;
  marcaAttrezzaturaRequired?: boolean;
  /** Salva solo anagrafica mezzo (senza chiudere la lavorazione). */
  onSaveMezzo?: () => void;
  saveMezzoPending?: boolean;
  mezzoLinked?: boolean;
}) {
  const show = (s: SchedaIngressoAnagraficaSection) => sections.includes(s);
  const inputFieldClass = `block w-full ${dsInput}`;
  const listSelectWrapClass = "w-full";
  const mezzoMatchHandler = onExactMezzoMatch ?? (() => {});
  const scuderiaBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const identSibling = {
    targa: value.targa,
    matricola: value.matricola,
    nScuderia: value.nScuderia,
  };

  const tryScuderiaMatchOnBlur = useCallback(() => {
    if (disabled || !onExactMezzoMatch) return;
    const hit = findExactMezzoForIngressoIdent(mezzi, "nScuderia", value.nScuderia, {
      targa: value.targa,
      matricola: value.matricola,
      nScuderia: value.nScuderia,
    });
    if (hit) onExactMezzoMatch(hit);
  }, [disabled, mezzi, onExactMezzoMatch, value.matricola, value.nScuderia, value.targa]);

  return (
    <>
      {show("cliente") ? (
        <FormSection title="Anagrafica cliente">
          <FormField label="Cliente" required={clienteRequired}>
            <GlobalSettingsListSelect
              listKey="mezzi:clienti"
              className={listSelectWrapClass}
              value={value.cliente}
              onChange={(v) => onPatch({ cliente: v })}
              disabled={disabled}
              required={clienteRequired}
              aria-label="Cliente"
            />
          </FormField>
          <FormField label="Cantiere">
            <GlobalSettingsListSelect
              listKey="mezzi:cantieri"
              className={listSelectWrapClass}
              value={value.cantiere}
              onChange={(v) => onPatch({ cantiere: v })}
              disabled={disabled}
              aria-label="Cantiere"
            />
          </FormField>
          <FormField label="Utilizzatore">
            <GlobalSettingsListSelect
              listKey="mezzi:utilizzatori"
              className={listSelectWrapClass}
              value={value.utilizzatore}
              onChange={(v) => onPatch({ utilizzatore: v })}
              disabled={disabled}
              aria-label="Utilizzatore"
            />
          </FormField>
          <FormField label="Richiedente">
            <input
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
          <FormField label="Tipo attrezzatura">
            <GlobalSettingsListSelect
              listKey="mezzi:tipiAttrezzatura"
              className={listSelectWrapClass}
              value={value.tipoAttrezzatura}
              onChange={(v) => onPatch({ tipoAttrezzatura: v })}
              disabled={disabled}
              aria-label="Tipo attrezzatura"
            />
          </FormField>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Marca" required={marcaAttrezzaturaRequired}>
              <CompatHierarchySelect
                tree="attrezzature"
                hierarchyKind="marca"
                className={listSelectWrapClass}
                value={value.marcaAttrezzatura}
                onChange={(v) => onPatch({ marcaAttrezzatura: v, modelloAttrezzatura: "" })}
                disabled={disabled}
                required={marcaAttrezzaturaRequired}
                ariaLabel="Marca attrezzatura"
              />
            </FormField>
            <FormField label="Modello">
              <CompatHierarchySelect
                tree="attrezzature"
                hierarchyKind="modello"
                marcaNome={value.marcaAttrezzatura}
                className={listSelectWrapClass}
                value={value.modelloAttrezzatura}
                onChange={(v) => onPatch({ modelloAttrezzatura: v })}
                disabled={disabled}
                ariaLabel="Modello attrezzatura"
              />
            </FormField>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <SchedaIngressoIdentAutocompleteField
              field="matricola"
              label="Matricola"
              value={value.matricola}
              siblingIdent={identSibling}
              mezzi={mezzi}
              disabled={disabled}
              onChange={(v) => onPatch({ matricola: v })}
              onExactMezzoMatch={mezzoMatchHandler}
            />
            <FormField label="N. scuderia">
              <input
                className={`${inputFieldClass} font-mono`}
                value={value.nScuderia}
                onChange={(e) => onPatch({ nScuderia: e.target.value })}
                onBlur={() => {
                  if (scuderiaBlurTimer.current) clearTimeout(scuderiaBlurTimer.current);
                  scuderiaBlurTimer.current = setTimeout(() => tryScuderiaMatchOnBlur(), 140);
                }}
                disabled={disabled}
                aria-label="N. scuderia"
              />
            </FormField>
          </div>
          {onCopyLastIngresso ? (
            <CopiaUltimaSchedaIngressoBanner
              visible={Boolean(lastIngressoMatch)}
              highlight={false}
              updatedAt={lastIngressoMatch?.updatedAt}
              disabled={disabled}
              onCopy={onCopyLastIngresso}
            />
          ) : null}
          {mezzoLinked && !onSaveMezzo ? (
            <p className="text-xs text-[color:var(--cab-text-muted)]">Mezzo collegato in anagrafica.</p>
          ) : null}
        </FormSection>
      ) : null}

      {show("telaio") ? (
        <FormSection title="Anagrafica mezzo / telaio">
          <FormField label="Tipo telaio">
            <GlobalSettingsListSelect
              listKey="mezzi:tipiTelaio"
              className={listSelectWrapClass}
              value={value.tipoTelaio}
              onChange={(v) => onPatch({ tipoTelaio: v })}
              disabled={disabled}
              aria-label="Tipo telaio"
            />
          </FormField>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Marca">
              <CompatHierarchySelect
                tree="telai"
                hierarchyKind="marca"
                className={listSelectWrapClass}
                value={value.marcaTelaio}
                onChange={(v) => onPatch({ marcaTelaio: v, modelloTelaio: "" })}
                disabled={disabled}
                ariaLabel="Marca telaio"
              />
            </FormField>
            <FormField label="Modello">
              <CompatHierarchySelect
                tree="telai"
                hierarchyKind="modello"
                marcaNome={value.marcaTelaio}
                className={listSelectWrapClass}
                value={value.modelloTelaio}
                onChange={(v) => onPatch({ modelloTelaio: v })}
                disabled={disabled}
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
            onChange={(v) => onPatch({ targa: v })}
            onExactMezzoMatch={mezzoMatchHandler}
          />
        </FormSection>
      ) : null}

      {onSaveMezzo ? (
        <div className="flex min-w-0 flex-col gap-2 border-t border-[color:var(--cab-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {mezzoLinked ? (
            <p className="order-2 w-full text-xs text-[color:var(--cab-text-muted)] sm:order-1 sm:mr-auto sm:w-auto">
              Mezzo collegato in anagrafica.
            </p>
          ) : null}
          <button
            type="button"
            className={`${dsBtnNeutral} order-1 min-h-11 w-full sm:order-2 sm:min-w-[9.5rem] sm:w-auto`}
            disabled={disabled || saveMezzoPending}
            onClick={onSaveMezzo}
          >
            {saveMezzoPending ? "Salvataggio…" : "Salva mezzo"}
          </button>
        </div>
      ) : null}

      {show("dettagli") ? (
        <FormSection title="Modelli e dettagli tecnici">
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Ore lavoro">
              <input
                type="number"
                min={0}
                inputMode="decimal"
                className={inputFieldClass}
                value={value.oreLavoro}
                onChange={(e) => onPatch({ oreLavoro: e.target.value })}
                disabled={disabled}
                aria-label="Ore lavoro"
              />
            </FormField>
            <FormField label="KM">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className={inputFieldClass}
                value={value.km}
                onChange={(e) => onPatch({ km: e.target.value })}
                disabled={disabled}
                aria-label="KM"
              />
            </FormField>
          </div>
          <FormField label="Carburante">
            <GlobalSelect
              className={listSelectWrapClass}
              value={value.livelloCarburante}
              onChange={(v) => onPatch({ livelloCarburante: v })}
              options={["Vuoto", "1/4", "1/2", "3/4", "Pieno"]}
              disabled={disabled}
              allowAdd={false}
              selectOnly
              aria-label="Livello carburante"
            />
          </FormField>
        </FormSection>
      ) : null}
    </>
  );
}

export const SchedaIngressoAnagraficaFields = memo(SchedaIngressoAnagraficaFieldsInner);
