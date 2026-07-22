"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { RicambioFormCompatSection } from "@/components/gestionale/magazzino/ricambio-form-compat-section";
import { MagazzinoPrezziLineari } from "@/components/gestionale/magazzino/magazzino-prezzi-lineari";
import { RicambioFornitoriAlternativiEditor } from "@/components/gestionale/magazzino/ricambio-fornitori-alternativi-editor";
import { RicambioCollapsibleSection, ricambioSectionTitleClass, ricambioSectionTitleClassName, type RicambioSectionTitleTone } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import { ricambioPrezziLineariVisible } from "@/lib/magazzino/ricambio-prezzi-lineari-visible";
import { RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA, RICAMBIO_LENIENT_PLACEHOLDER_MARCA, type RicambioFormState } from "@/lib/magazzino/form";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { migrateMezziListePrefs } from "@/lib/mezzi/attrezzature-prefs";
import {
  clampMarkupPercentuale,
  fornitoriAlternativiFromFormRows,
  fornitoriAlternativiFormRowsHaveContent,
  normalizeMarkupInputString,
  syncPrezzoVenditaInForm,
} from "@/lib/magazzino/form";
import {
  prezzoVenditaDaListinoEMarkup,
  resolveListinoMarkupBase,
} from "@/lib/magazzino/calculations";
import { applyRicambioCodiceInputChange } from "@/lib/magazzino/ricambio-codice";
import {
  formatRicambioUnitaMisuraLabel,
  RICAMBIO_UNITA_MISURA_VALUES,
} from "@/lib/magazzino/ricambio-unita-misura";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";
import { GestionaleNumberInput } from "@/components/gestionale/gestionale-number-input";
import { MigratedNumberInput } from "@/components/form-ux-migration/migrated-number-input";
import { GestionaleRequiredMark } from "@/components/gestionale/schede/gestionale-form-section";
import { CloseButton } from "@/components/design-system";
import { dsBtnNeutralForm, dsBtnPrimary, dsFocus, dsInput, dsLabel, dsSegmentedBtnOff, dsSegmentedBtnOn, dsSegmentedWrap, dsTypoSmall } from "@/lib/ui/design-system";
import { resolveGestionaleInputClassName } from "@/lib/ui/global-input";
import { getScontoFornitoreMarca } from "@/lib/magazzino/marca-fornitore-sconto";
import { useRicambioFormOptions } from "@/components/gestionale/magazzino/ricambio-form-options-context";
import {
  CAB_FIELD_LABEL_ATTR,
  CAB_FOCUS_SCROLL_GROUP_ATTR,
  CAB_FOCUS_SCROLL_TITLE_ATTR,
  CAB_STEPPER_ACTION_ATTR,
  isGestionaleFocusableField,
} from "@/lib/ui/mobile-modal-behavior";
import { gestionaleFieldLabelClass } from "@/lib/ui/gestionale-field-label";
import { scheduleFocusNextGestionaleFieldById } from "@/lib/ui/gestionale-focus-navigation";

const ricambioFormInputClass = dsInput;

/** Placeholder combobox ricambio — pattern unificato «Cerca o seleziona …». */
const RICAMBIO_MARCA_PLACEHOLDER = "Cerca o seleziona marca…";
const RICAMBIO_MARCA_ALTERNATIVA_PLACEHOLDER = "Cerca o seleziona marca alternativa…";
const RICAMBIO_MARCA_ARIA = "Marca ricambio";
const RICAMBIO_MARCA_ALTERNATIVA_ARIA = "Marca alternativa ricambio";

function RicambioSectionTitle({
  children,
  tone = "primary",
  className = "",
}: {
  children: React.ReactNode;
  tone?: RicambioSectionTitleTone;
  className?: string;
}) {
  return (
    <p
      {...{ [CAB_FOCUS_SCROLL_TITLE_ATTR]: "" }}
      className={`${ricambioSectionTitleClass(tone)} ${className}`}
    >
      {children}
    </p>
  );
}

type RicambioFieldTone = "required" | "operational" | "optional";

/** Nasconde frecce native del browser su input numerici (stepper custom solo scorta). */
const noSpinner =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

/** Box unico: − | valore | + */
const stepperShellClass =
  "flex w-full min-w-0 max-w-full items-stretch overflow-hidden rounded-[var(--ds-radius-lg)] border-2 border-[color:color-mix(in_srgb,var(--cab-border-strong)_88%,var(--cab-border))] bg-[var(--cab-surface)] shadow-[var(--cab-shadow-sm)] transition-[border-color,box-shadow] duration-150 focus-within:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus-within:ring-2 focus-within:ring-[color:color-mix(in_srgb,var(--cab-primary)_26%,transparent)]";

const stepperBtnBaseClass = `inline-flex h-11 w-10 min-h-11 min-w-10 shrink-0 select-none items-center justify-center border-0 bg-transparent p-0 text-lg font-bold leading-none text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)] ${dsFocus} touch-manipulation [-webkit-tap-highlight-color:transparent] transition-[background-color,transform] duration-150 active:scale-[0.97] active:bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]`;

const stepperBtnMinusClass = `${stepperBtnBaseClass} border-r border-[color:var(--cab-border)]`;
const stepperBtnPlusClass = `${stepperBtnBaseClass} border-l border-[color:var(--cab-border)]`;

const stepperInputClass = `min-w-0 flex-1 border-0 bg-transparent ${noSpinner} h-11 min-h-11 py-0 text-center text-sm font-mono tabular-nums text-[color:var(--cab-text)] outline-none ${dsFocus} touch-manipulation`;

function formatEurIt(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function blurActiveFieldOutsideStepper(stepperInput: HTMLInputElement | null): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  if (active === stepperInput) return;
  if (!isGestionaleFocusableField(active)) return;
  active.blur();
}

function StockStepper({
  value,
  onChange,
  onDelta,
  groupLabel,
  ariaDecrease,
  ariaIncrease,
  inputClass = stepperInputClass,
  inputId,
  wrapClassName = stepperShellClass,
}: {
  value: string;
  onChange: (v: string) => void;
  onDelta: (d: number) => void;
  /** Evita &lt;label&gt; che raggruppa più controlli (hover/focus incrociati) */
  groupLabel: string;
  ariaDecrease: string;
  ariaIncrease: string;
  inputClass?: string;
  inputId?: string;
  wrapClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onStepperActionPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    blurActiveFieldOutsideStepper(inputRef.current);
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div role="group" aria-label={groupLabel} className={wrapClassName}>
      <button
        type="button"
        {...{ [CAB_STEPPER_ACTION_ATTR]: "" }}
        className={stepperBtnMinusClass}
        aria-label={ariaDecrease}
        onPointerDown={onStepperActionPointerDown}
        onClick={(e) => {
          e.stopPropagation();
          onDelta(-1);
        }}
      >
        −
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        aria-label={groupLabel}
      />
      <button
        type="button"
        {...{ [CAB_STEPPER_ACTION_ATTR]: "" }}
        className={stepperBtnPlusClass}
        aria-label={ariaIncrease}
        onPointerDown={onStepperActionPointerDown}
        onClick={(e) => {
          e.stopPropagation();
          onDelta(1);
        }}
      >
        +
      </button>
    </div>
  );
}

export function RicambioField({
  label,
  children,
  htmlFor,
  required,
  tone = "operational",
}: {
  label: string;
  children: React.ReactNode;
  /** Id del controllo per associazione label (a11y). */
  htmlFor?: string;
  required?: boolean;
  tone?: RicambioFieldTone;
}) {
  const labelClass =
    tone === "optional"
      ? `${gestionaleFieldLabelClass} text-[color:var(--cab-text-muted)]`
      : tone === "operational"
        ? gestionaleFieldLabelClass
        : `${gestionaleFieldLabelClass}`;

  if (htmlFor) {
    return (
      <div className="block min-w-0">
        <label htmlFor={htmlFor} {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={labelClass}>
          {label}
          {required || tone === "required" ? <GestionaleRequiredMark /> : null}
        </label>
        <div className="mt-1">{children}</div>
      </div>
    );
  }
  return (
    <div className="block min-w-0">
      <span {...{ [CAB_FIELD_LABEL_ATTR]: "" }} className={labelClass}>
        {label}
        {required || tone === "required" ? <GestionaleRequiredMark /> : null}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

type SetForm = React.Dispatch<React.SetStateAction<RicambioFormState>>;

export function RicambioFormFields({
  form,
  setForm,
  formResetKey,
  formMode = "create",
  codiceOriginaleAvvisoDuplicato,
  relaxHtmlValidation = false,
  listFieldForceInvalid = false,
}: {
  form: RicambioFormState;
  setForm: SetForm;
  /** Cambia quando si apre un altro ricambio — resetta filtri marca locali. */
  formResetKey?: string;
  formMode?: "create" | "edit";
  codiceOriginaleAvvisoDuplicato?: { existing: RicambioMagazzino; onVaiAlRicambio: () => void } | null;
  relaxHtmlValidation?: boolean;
  listFieldForceInvalid?: boolean;
}) {
  const globalOpts = useRicambioFormOptions();
  const [showCodiceSecondario, setShowCodiceSecondario] = useState(
    () => Boolean(form.codiceFornitoreOriginaleSecondario.trim()),
  );

  useEffect(() => {
    setShowCodiceSecondario(
      Boolean(form.codiceFornitoreOriginaleSecondario.trim() || form.marcaOriginaleSecondaria.trim()),
    );
  }, [formResetKey, form.codiceFornitoreOriginaleSecondario, form.marcaOriginaleSecondaria]);

  function bumpScorta(field: "scorta" | "scortaMinima", delta: number) {
    setForm((f) => {
      const raw = field === "scorta" ? f.scorta : f.scortaMinima;
      const n = Math.max(0, Math.round(parseFloat(raw) || 0) + delta);
      return { ...f, [field]: String(n) };
    });
  }

  const previewLineari = useMemo(() => {
    const listinoOE = Math.max(0, parseFloat(form.prezzoFornitoreOriginale) || 0);
    const scontoOE = Math.min(100, Math.max(0, parseFloat(form.scontoFornitoreOriginale) || 0));
    const markupPct = clampMarkupPercentuale(parseFloat(String(form.markupPercentuale).replace(",", ".")) || 0);
    const prezzoVendita = Math.max(0, parseFloat(String(form.prezzoVendita).replace(",", ".")) || 0);
    const fornitoriAlternativi = fornitoriAlternativiFromFormRows(form.fornitoriAlternativi);
    const markupBase = resolveListinoMarkupBase(listinoOE, fornitoriAlternativi);
    const prezzoVenditaPrevisto = prezzoVenditaDaListinoEMarkup(markupBase, markupPct);
    return { listinoOE, scontoOE, markupPct, prezzoVendita, prezzoVenditaPrevisto, fornitoriAlternativi };
  }, [
    form.prezzoFornitoreOriginale,
    form.scontoFornitoreOriginale,
    form.fornitoriAlternativi,
    form.markupPercentuale,
    form.prezzoVendita,
  ]);

  const fieldsOptional = relaxHtmlValidation;
  const showPrezziLineari = ricambioPrezziLineariVisible({
    listinoOE: previewLineari.listinoOE,
    fornitoriAlternativi: previewLineari.fornitoriAlternativi,
  });
  const fornitoreOriginaleExpandedInEdit =
    formMode === "edit" &&
    ((parseFloat(form.prezzoFornitoreOriginale) || 0) > 0 ||
      (parseFloat(form.scontoFornitoreOriginale) || 0) > 0 ||
      (parseFloat(String(form.prezzoVendita).replace(",", ".")) || 0) > 0);

  const giacenzaSottoMinima = useMemo(() => {
    const scorta = Math.max(0, parseFloat(form.scorta) || 0);
    const min = Math.max(0, parseFloat(form.scortaMinima) || 0);
    return min > 0 && scorta < min;
  }, [form.scorta, form.scortaMinima]);

  const onFornitoriAlternativiChange = useCallback(
    (fornitoriAlternativi: RicambioFormState["fornitoriAlternativi"]) =>
      setForm((f) => syncPrezzoVenditaInForm({ ...f, fornitoriAlternativi })),
    [setForm],
  );

  return (
    <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className="flex flex-col gap-3">
      <RicambioCollapsibleSection title="Identificazione" defaultCollapsed={false}>
        <div className="grid gap-3">
      <RicambioField label="Marca" tone="optional" htmlFor="magazzino-ricambio-marca">
        <GlobalSettingsListSelect
          listKey="magazzino:marche"
          id="magazzino-ricambio-marca"
          value={form.marca === RICAMBIO_LENIENT_PLACEHOLDER_MARCA ? "" : form.marca}
          onChange={(marca) => {
            const sconto = getScontoFornitoreMarca(globalOpts.magazzinoMaster, marca);
            setForm((f) => ({
              ...f,
              marca,
              scontoFornitoreOriginale: String(sconto),
            }));
            scheduleFocusNextGestionaleFieldById("magazzino-ricambio-marca");
          }}
          excludeValues={[RICAMBIO_LENIENT_PLACEHOLDER_MARCA]}
          placeholder={RICAMBIO_MARCA_PLACEHOLDER}
          inputClassName={ricambioFormInputClass}
          aria-label={RICAMBIO_MARCA_ARIA}
        />
      </RicambioField>
      <RicambioField
        label="Codice fornitore originale"
        tone="operational"
        htmlFor="magazzino-ricambio-codice-oe"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              id="magazzino-ricambio-codice-oe"
              value={form.codiceFornitoreOriginale}
              onChange={(e) =>
                applyRicambioCodiceInputChange(e, (codiceFornitoreOriginale) =>
                  setForm((f) => ({ ...f, codiceFornitoreOriginale })),
                )
              }
              className={resolveGestionaleInputClassName(
                `${ricambioFormInputClass} min-w-0 flex-1 font-mono font-semibold tracking-wide`,
                Boolean(codiceOriginaleAvvisoDuplicato),
              )}
              aria-invalid={codiceOriginaleAvvisoDuplicato ? true : undefined}
            />
            {!showCodiceSecondario ? (
              <button
                type="button"
                className={dsBtnNeutralForm}
                onClick={() => setShowCodiceSecondario(true)}
              >
                + Alternativo
              </button>
            ) : null}
          </div>
          {showCodiceSecondario ? (
            <div className="rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-2.5">
              <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                <p
                  {...{ [CAB_FOCUS_SCROLL_TITLE_ATTR]: "" }}
                  className={`${ricambioSectionTitleClassName} mb-0 min-w-0 flex-1`}
                >
                  Codice fornitore alternativo
                </p>
                <CloseButton
                  label="Rimuovi codice fornitore alternativo"
                  className="h-9 w-9 shrink-0"
                  onClick={() => {
                    setShowCodiceSecondario(false);
                    setForm((f) => ({
                      ...f,
                      codiceFornitoreOriginaleSecondario: "",
                      marcaOriginaleSecondaria: "",
                    }));
                  }}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="min-w-0">
                  <label
                    htmlFor="magazzino-ricambio-marca-secondaria"
                    {...{ [CAB_FIELD_LABEL_ATTR]: "" }}
                    className={`${gestionaleFieldLabelClass}`}
                  >
                    Marca alternativa
                  </label>
                  <div className="mt-1">
                    <GlobalSettingsListSelect
                      listKey="magazzino:marche"
                      id="magazzino-ricambio-marca-secondaria"
                      value={
                        form.marcaOriginaleSecondaria === RICAMBIO_LENIENT_PLACEHOLDER_MARCA
                          ? ""
                          : form.marcaOriginaleSecondaria
                      }
                      onChange={(marcaOriginaleSecondaria) => setForm((f) => ({ ...f, marcaOriginaleSecondaria }))}
                      excludeValues={[RICAMBIO_LENIENT_PLACEHOLDER_MARCA]}
                      placeholder={RICAMBIO_MARCA_ALTERNATIVA_PLACEHOLDER}
                      inputClassName={ricambioFormInputClass}
                      aria-label={RICAMBIO_MARCA_ALTERNATIVA_ARIA}
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <label
                    htmlFor="magazzino-ricambio-codice-secondario"
                    {...{ [CAB_FIELD_LABEL_ATTR]: "" }}
                    className={`${gestionaleFieldLabelClass}`}
                  >
                    Codice alternativo
                  </label>
                  <input
                    id="magazzino-ricambio-codice-secondario"
                    value={form.codiceFornitoreOriginaleSecondario}
                    onChange={(e) =>
                      applyRicambioCodiceInputChange(e, (codiceFornitoreOriginaleSecondario) =>
                        setForm((f) => ({ ...f, codiceFornitoreOriginaleSecondario })),
                      )
                    }
                    aria-label="Codice alternativo"
                    className={`${ricambioFormInputClass} mt-1 min-w-0 w-full font-mono text-[13px] tracking-wide`}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
        {codiceOriginaleAvvisoDuplicato ? (
          <div
            className="mt-2 rounded-lg border border-amber-200/95 bg-amber-50/95 p-3 shadow-sm dark:border-amber-800/55 dark:bg-amber-950/35"
            role="status"
          >
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
              ⚠ Entità simile già esistente — codice già presente in magazzino
            </p>
            <dl className="mt-2 space-y-1 text-xs text-amber-950/95 dark:text-amber-100/95">
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium text-amber-900/80 dark:text-amber-200/90">Marca</dt>
                <dd className="min-w-0 font-medium text-amber-950 dark:text-amber-50">
                  {codiceOriginaleAvvisoDuplicato.existing.marca}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium text-amber-900/80 dark:text-amber-200/90">Descrizione</dt>
                <dd className="min-w-0 leading-snug text-amber-950 dark:text-amber-50">
                  {codiceOriginaleAvvisoDuplicato.existing.descrizione}
                </dd>
              </div>
              {codiceOriginaleAvvisoDuplicato.existing.categoria ? (
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-amber-900/80 dark:text-amber-200/90">Categoria</dt>
                  <dd className="min-w-0 text-amber-950 dark:text-amber-50">
                    {codiceOriginaleAvvisoDuplicato.existing.categoria}
                  </dd>
                </div>
              ) : null}
            </dl>
            <button
              type="button"
              onClick={codiceOriginaleAvvisoDuplicato.onVaiAlRicambio}
              className={`${dsBtnPrimary} mt-3 w-full sm:w-auto`}
            >
              Vai al ricambio
            </button>
          </div>
        ) : null}
      </RicambioField>
      <RicambioField
        label="Descrizione"
        tone="optional"
        htmlFor="magazzino-ricambio-descrizione"
      >
        <input
          id="magazzino-ricambio-descrizione"
          value={form.descrizione}
          onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
          className={ricambioFormInputClass}
        />
      </RicambioField>
      <RicambioField
        label="Categoria"
        tone={fieldsOptional ? "optional" : "required"}
        required={!fieldsOptional}
        htmlFor="magazzino-ricambio-categoria"
      >
        <GlobalSettingsListSelect
          listKey="magazzino:categorie"
          id="magazzino-ricambio-categoria"
          value={form.categoria === RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA ? "" : form.categoria}
          onChange={(categoria) => setForm((f) => ({ ...f, categoria }))}
          required={!fieldsOptional}
          selectOnly
          excludeValues={[RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA]}
          inputClassName={ricambioFormInputClass}
          placeholder="Seleziona categoria…"
          aria-label="Categoria ricambio"
        />
      </RicambioField>
      <RicambioField label="Note" tone="optional" htmlFor="magazzino-ricambio-note">
        <GestionaleTextarea
          id="magazzino-ricambio-note"
          value={form.note}
          onChange={(note) => setForm((f) => ({ ...f, note }))}
          rows={2}
          size="sm"
          className="min-h-[4.5rem]"
        />
      </RicambioField>
      <div className="grid grid-cols-2 gap-3">
        <RicambioField label="Usato nei tagliandi">
          <div
            className={`${dsSegmentedWrap} w-full min-w-0 gap-0.5 p-0.5`}
            role="group"
            aria-label="Usato nei tagliandi"
          >
            <button
              type="button"
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center text-sm font-semibold ${
                !form.usatoInTagliandi ? dsSegmentedBtnOn : dsSegmentedBtnOff
              } ${dsFocus}`}
              aria-pressed={!form.usatoInTagliandi}
              onClick={() => setForm((f) => ({ ...f, usatoInTagliandi: false }))}
            >
              No
            </button>
            <button
              type="button"
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center text-sm font-semibold ${
                form.usatoInTagliandi ? dsSegmentedBtnOn : dsSegmentedBtnOff
              } ${dsFocus}`}
              aria-pressed={form.usatoInTagliandi}
              onClick={() => setForm((f) => ({ ...f, usatoInTagliandi: true }))}
            >
              Sì
            </button>
          </div>
        </RicambioField>
        <RicambioField label="Unità di misura">
          <div
            className={`${dsSegmentedWrap} w-full min-w-0 gap-0.5 p-0.5`}
            role="group"
            aria-label="Unità di misura"
          >
            {RICAMBIO_UNITA_MISURA_VALUES.map((unita) => (
              <button
                key={unita}
                type="button"
                className={`flex min-h-11 min-w-0 flex-1 items-center justify-center text-sm font-semibold ${
                  form.unitaMisura === unita ? dsSegmentedBtnOn : dsSegmentedBtnOff
                } ${dsFocus}`}
                aria-pressed={form.unitaMisura === unita}
                onClick={() => setForm((f) => ({ ...f, unitaMisura: unita }))}
              >
                {formatRicambioUnitaMisuraLabel(unita)}
              </button>
            ))}
          </div>
        </RicambioField>
      </div>
        </div>
      </RicambioCollapsibleSection>

      <RicambioFormCompatSection
        key={`compat-${formMode}-${formResetKey ?? "new"}`}
        form={form}
        setForm={setForm}
        formResetKey={formResetKey}
        formMode={formMode}
      />

      <RicambioCollapsibleSection title="Giacenza" defaultCollapsed={false}>
        <div className="grid grid-cols-2 gap-3">
          <RicambioField label="Scorta" tone="operational" htmlFor="magazzino-ricambio-scorta">
            <StockStepper
              inputId="magazzino-ricambio-scorta"
              groupLabel="Scorta"
              value={form.scorta}
              onChange={(v) => setForm((f) => ({ ...f, scorta: v }))}
              onDelta={(d) => bumpScorta("scorta", d)}
              ariaDecrease="Diminuisci scorta"
              ariaIncrease="Aumenta scorta"
            />
          </RicambioField>
          <RicambioField label="Scorta minima" tone="operational" htmlFor="magazzino-ricambio-scorta-minima">
            <StockStepper
              inputId="magazzino-ricambio-scorta-minima"
              groupLabel="Scorta minima"
              value={form.scortaMinima}
              onChange={(v) => setForm((f) => ({ ...f, scortaMinima: v }))}
              onDelta={(d) => bumpScorta("scortaMinima", d)}
              ariaDecrease="Diminuisci scorta minima"
              ariaIncrease="Aumenta scorta minima"
            />
          </RicambioField>
        </div>
        {giacenzaSottoMinima ? (
          <p
            className="mt-2.5 text-[11px] font-medium leading-snug text-amber-700 dark:text-amber-400"
            role="status"
          >
            Scorta attuale sotto la soglia minima
          </p>
        ) : null}
      </RicambioCollapsibleSection>

      <RicambioCollapsibleSection
        title="Fornitore originale"
        defaultCollapsed={formMode === "create"}
        forceExpanded={fornitoreOriginaleExpandedInEdit}
      >
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <RicambioField label="Prezzo listino €" tone="operational" htmlFor="magazzino-ricambio-prezzo-listino">
              <MigratedNumberInput
                formId="ricambio"
                fieldId="prezzo-listino"
                id="magazzino-ricambio-prezzo-listino"
                min={0}
                step={0.01}
                inputMode="decimal"
                value={form.prezzoFornitoreOriginale}
                onChange={(v) =>
                  setForm((f) => syncPrezzoVenditaInForm({ ...f, prezzoFornitoreOriginale: v }))
                }
                className={`${ricambioFormInputClass} ${noSpinner} tabular-nums`}
              />
            </RicambioField>
            <RicambioField label="Sconto %" tone="operational" htmlFor="magazzino-ricambio-sconto-oe">
              <GestionaleNumberInput
                id="magazzino-ricambio-sconto-oe"
                min={0}
                max={100}
                step={0.01}
                inputMode="decimal"
                value={form.scontoFornitoreOriginale}
                onChange={(v) => setForm((f) => ({ ...f, scontoFornitoreOriginale: v }))}
                className={`${ricambioFormInputClass} ${noSpinner}`}
              />
            </RicambioField>
          </div>
          <RicambioField label="Markup % sul listino OE" tone="operational" htmlFor="magazzino-ricambio-markup">
            <GestionaleNumberInput
              id="magazzino-ricambio-markup"
              min={0}
              step="any"
              inputMode="decimal"
              value={form.markupPercentuale}
              onChange={(v) => setForm((f) => syncPrezzoVenditaInForm({ ...f, markupPercentuale: v }))}
              onBlur={(e) =>
                setForm((f) =>
                  syncPrezzoVenditaInForm({
                    ...f,
                    markupPercentuale: normalizeMarkupInputString(e.currentTarget.value),
                  }),
                )
              }
              className={`${ricambioFormInputClass} ${noSpinner}`}
            />
            <div
              className="mt-2 flex items-center justify-between gap-3 rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_85%,var(--cab-border))] bg-[var(--cab-surface)] px-3 py-2.5 shadow-[var(--cab-shadow-sm)]"
              role="status"
              aria-live="polite"
            >
              <span className="text-xs font-medium text-[color:var(--cab-text-muted)]">Prezzo di vendita previsto</span>
              <span className="text-sm font-semibold tabular-nums text-[color:var(--cab-text)]">
                {formatEurIt(previewLineari.prezzoVenditaPrevisto)}
              </span>
            </div>
          </RicambioField>
        </div>
      </RicambioCollapsibleSection>

      {showPrezziLineari ? (
        <MagazzinoPrezziLineari
          variant="form"
          defaultCollapsed
          listinoOE={previewLineari.listinoOE}
          scontoOE={previewLineari.scontoOE}
          fornitoriAlternativi={previewLineari.fornitoriAlternativi}
          markupPct={previewLineari.markupPct}
          prezzoVendita={previewLineari.prezzoVendita}
        />
      ) : null}

      <RicambioCollapsibleSection
        key={`fornitori-alt-${formResetKey ?? "ricambio"}`}
        title="Fornitori alternativi"
        defaultCollapsed={!fornitoriAlternativiFormRowsHaveContent(form.fornitoriAlternativi)}
      >
        <RicambioFornitoriAlternativiEditor
          rows={form.fornitoriAlternativi}
          onChange={onFornitoriAlternativiChange}
        />
      </RicambioCollapsibleSection>
    </div>
  );
}
