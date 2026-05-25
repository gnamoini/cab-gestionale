"use client";

import { useEffect, useMemo } from "react";
import { GlobalSelect, GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { MagazzinoPrezziLineari } from "@/components/gestionale/magazzino/magazzino-prezzi-lineari";
import type { RicambioFormState } from "@/lib/magazzino/form";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { isValueInListOptions } from "@/lib/ui/list-select-utils";
import {
  migrateMezziListePrefs,
} from "@/lib/mezzi/attrezzature-prefs";
import { RicambioCompatHierarchyPicker } from "@/components/gestionale/magazzino/ricambio-compat-hierarchy-picker";
import { ricambioCompatLabelsFromSettings } from "@/lib/magazzino/form";
import {
  clampMarkupPercentuale,
  normalizeMarkupInputString,
  parseCompatInput,
  syncPrezzoVenditaInForm,
} from "@/lib/magazzino/form";
import { prezzoVenditaDaListinoEMarkup } from "@/lib/magazzino/calculations";
import { GestionaleFormFocusScope } from "@/components/gestionale/gestionale-form-focus-scope";
import { dsBtnPrimary } from "@/lib/ui/design-system";
import { useGlobalOptions } from "@/src/hooks/use-global-options";

const inputBase =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-orange-500/25 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950";

/** Nasconde frecce native del browser su input numerici (stepper custom solo scorta). */
const noSpinner =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function formatEurIt(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

const stepperBtnMinus =
  "flex h-9 w-9 shrink-0 cursor-pointer select-none items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-600 shadow-sm outline-none transition-[background-color,border-color,box-shadow,color] duration-150 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 hover:shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-orange-400/55 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 active:bg-zinc-200/90 dark:active:bg-zinc-600 [-webkit-tap-highlight-color:transparent]";

const stepperBtnPlus =
  "flex h-9 w-9 shrink-0 cursor-pointer select-none items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-800 shadow-sm outline-none transition-[background-color,border-color,box-shadow] duration-150 hover:border-orange-200/90 hover:bg-orange-50/95 hover:shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-orange-400/55 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 active:bg-orange-100/90 [-webkit-tap-highlight-color:transparent]";

function StockStepper({
  value,
  onChange,
  onDelta,
  groupLabel,
  ariaDecrease,
  ariaIncrease,
  inputClass,
}: {
  value: string;
  onChange: (v: string) => void;
  onDelta: (d: number) => void;
  /** Evita &lt;label&gt; che raggruppa più controlli (hover/focus incrociati) */
  groupLabel: string;
  ariaDecrease: string;
  ariaIncrease: string;
  inputClass: string;
}) {
  return (
    <div role="group" aria-label={groupLabel} className="flex items-stretch gap-1">
      <button
        type="button"
        className={stepperBtnMinus}
        aria-label={ariaDecrease}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDelta(-1);
        }}
      >
        −
      </button>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} min-w-0 flex-1 text-center font-mono tabular-nums`}
      />
      <button
        type="button"
        className={stepperBtnPlus}
        aria-label={ariaIncrease}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
      <span className="block">{label}</span>
      <div className="mt-1 font-normal">{children}</div>
    </div>
  );
}

type SetForm = React.Dispatch<React.SetStateAction<RicambioFormState>>;

export function RicambioFormFields({
  form,
  setForm,
  codiceOriginaleAvvisoDuplicato,
  relaxHtmlValidation = false,
  autoFocusToken = 0,
  listFieldForceInvalid = false,
}: {
  form: RicambioFormState;
  setForm: SetForm;
  /** Avviso sotto il campo codice OE (es. nuovo ricambio con codice già in archivio) */
  codiceOriginaleAvvisoDuplicato?: { existing: RicambioMagazzino; onVaiAlRicambio: () => void } | null;
  /** Se true: nessun `required` HTML (submit gestito lato applicazione). */
  relaxHtmlValidation?: boolean;
  /** Incrementato a ogni apertura modal «Nuovo ricambio» per focus affidabile sul campo Marca. */
  autoFocusToken?: number;
  /** Evidenzia errori elenco dopo submit fallito. */
  listFieldForceInvalid?: boolean;
}) {
  const globalOpts = useGlobalOptions({ debugTag: "RicambioFormFields" });
  const prefsTree = useMemo(() => migrateMezziListePrefs(globalOpts.mezziListe), [globalOpts.mezziListe]);
  const globalCompatLabels = useMemo(() => ricambioCompatLabelsFromSettings(globalOpts.mezziListe), [globalOpts.mezziListe]);
  const mezziSel = useMemo(() => new Set(parseCompatInput(form.compatibilitaMezzi)), [form.compatibilitaMezzi]);

  const invalidCompat = useMemo(() => {
    const selected = parseCompatInput(form.compatibilitaMezzi);
    return selected.filter((x) => !isValueInListOptions(x, globalCompatLabels));
  }, [form.compatibilitaMezzi, globalCompatLabels]);

  useEffect(() => {
    if (!relaxHtmlValidation || autoFocusToken <= 0) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("magazzino-ricambio-marca")?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [autoFocusToken, relaxHtmlValidation]);

  function toggleMezzo(m: string) {
    setForm((f) => {
      const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
      if (cur.has(m)) cur.delete(m);
      else cur.add(m);
      const joined = Array.from(cur).sort((a, b) => a.localeCompare(b, "it")).join(", ");
      return { ...f, compatibilitaMezzi: joined };
    });
  }

  function setCompatLines(lines: readonly string[], selected: boolean) {
    setForm((f) => {
      const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
      for (const m of lines) {
        if (selected) cur.add(m);
        else cur.delete(m);
      }
      const joined = Array.from(cur).sort((a, b) => a.localeCompare(b, "it")).join(", ");
      return { ...f, compatibilitaMezzi: joined };
    });
  }

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
    const listinoAlt = Math.max(0, parseFloat(form.prezzoFornitoreNonOriginale) || 0);
    const scontoAlt = Math.min(100, Math.max(0, parseFloat(form.scontoFornitoreNonOriginale) || 0));
    const markupPct = clampMarkupPercentuale(parseFloat(String(form.markupPercentuale).replace(",", ".")) || 0);
    const prezzoVendita = Math.max(0, parseFloat(String(form.prezzoVendita).replace(",", ".")) || 0);
    const prezzoVenditaPrevisto = prezzoVenditaDaListinoEMarkup(listinoOE, markupPct);
    return { listinoOE, scontoOE, listinoAlt, scontoAlt, markupPct, prezzoVendita, prezzoVenditaPrevisto };
  }, [
    form.prezzoFornitoreOriginale,
    form.scontoFornitoreOriginale,
    form.prezzoFornitoreNonOriginale,
    form.scontoFornitoreNonOriginale,
    form.markupPercentuale,
    form.prezzoVendita,
  ]);

  const fieldsOptional = relaxHtmlValidation;

  return (
    <GestionaleFormFocusScope className="flex flex-col gap-3">
      <RicambioField label={fieldsOptional ? "Marca" : "Marca *"}>
        <GlobalSettingsListSelect
          listKey="magazzino:marche"
          id="magazzino-ricambio-marca"
          value={form.marca}
          onChange={(marca) => setForm((f) => ({ ...f, marca }))}
          required={!fieldsOptional}
          placeholder="Cerca o seleziona marca…"
          aria-label="Marca ricambio"
        />
      </RicambioField>
      <RicambioField label={fieldsOptional ? "Codice fornitore originale" : "Codice fornitore originale *"}>
        <input
          required={!relaxHtmlValidation}
          value={form.codiceFornitoreOriginale}
          onChange={(e) => setForm((f) => ({ ...f, codiceFornitoreOriginale: e.target.value }))}
          className={`${inputBase} font-mono font-semibold tracking-wide ${
            codiceOriginaleAvvisoDuplicato
              ? "border-amber-400/90 ring-1 ring-amber-400/35 dark:border-amber-600 dark:ring-amber-600/30"
              : ""
          }`}
          aria-invalid={codiceOriginaleAvvisoDuplicato ? true : undefined}
        />
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
      <RicambioField label={fieldsOptional ? "Descrizione" : "Descrizione *"}>
        <input
          required={!relaxHtmlValidation}
          value={form.descrizione}
          onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
          className={inputBase}
        />
      </RicambioField>
      <RicambioField label="Note">
        <textarea
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          rows={2}
          className={inputBase}
        />
      </RicambioField>
      <RicambioField label={fieldsOptional ? "Categoria" : "Categoria *"}>
        <GlobalSettingsListSelect
          listKey="magazzino:categorie"
          value={form.categoria}
          onChange={(categoria) => setForm((f) => ({ ...f, categoria }))}
          required={!fieldsOptional}
          selectOnly
          placeholder="Seleziona categoria…"
          aria-label="Categoria ricambio"
        />
      </RicambioField>
      <RicambioField label={fieldsOptional ? "Compatibilità mezzi" : "Compatibilità mezzi *"}>
        {globalOpts.isLoading ? (
          <p className="text-[11px] text-zinc-500">Caricamento elenchi attrezzature e telai…</p>
        ) : null}
        <RicambioCompatHierarchyPicker
          tree="attrezzature"
          prefsTree={prefsTree}
          marcheHeading="Marche attrezzatura"
          modelliHeading="Modelli attrezzatura"
          emptyMarcheHint="Configura marche in Impostazioni → Attrezzature."
          emptyModelliHint="Configura marche e modelli in Impostazioni → Attrezzature."
          selectedLines={mezziSel}
          onToggleLine={toggleMezzo}
          onSetLines={setCompatLines}
          disabled={globalOpts.isLoading}
          showDivider={false}
        />
        <RicambioCompatHierarchyPicker
          tree="telai"
          prefsTree={prefsTree}
          marcheHeading="Marche telaio"
          modelliHeading="Modelli telaio"
          emptyMarcheHint="Configura marche in Impostazioni → Telai."
          emptyModelliHint="Configura marche e modelli in Impostazioni → Telai."
          selectedLines={mezziSel}
          onToggleLine={toggleMezzo}
          onSetLines={setCompatLines}
          disabled={globalOpts.isLoading}
        />
        <p className="mt-1 text-[11px] text-zinc-500">
          {mezziSel.size > 0 ? `${mezziSel.size} compatibilità selezionate` : "Nessuna selezione"}
        </p>
        {!fieldsOptional && ((listFieldForceInvalid && mezziSel.size === 0) || invalidCompat.length > 0) ? (
          <p className="mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
            {invalidCompat.length > 0
              ? "Seleziona solo compatibilità dall'elenco configurato."
              : "Seleziona almeno una compatibilità (attrezzatura o telaio)."}
          </p>
        ) : null}
      </RicambioField>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Scorta</span>
          <div className="mt-1">
            <StockStepper
              groupLabel="Scorta"
              value={form.scorta}
              onChange={(v) => setForm((f) => ({ ...f, scorta: v }))}
              onDelta={(d) => bumpScorta("scorta", d)}
              ariaDecrease="Diminuisci scorta"
              ariaIncrease="Aumenta scorta"
              inputClass={`${inputBase} ${noSpinner}`}
            />
          </div>
        </div>
        <div>
          <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Scorta minima</span>
          <div className="mt-1">
            <StockStepper
              groupLabel="Scorta minima"
              value={form.scortaMinima}
              onChange={(v) => setForm((f) => ({ ...f, scortaMinima: v }))}
              onDelta={(d) => bumpScorta("scortaMinima", d)}
              ariaDecrease="Diminuisci scorta minima"
              ariaIncrease="Aumenta scorta minima"
              inputClass={`${inputBase} ${noSpinner}`}
            />
          </div>
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Fornitore originale</p>
      <div className="grid grid-cols-2 gap-2">
        <RicambioField label="Prezzo listino €">
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={form.prezzoFornitoreOriginale}
            onChange={(e) =>
              setForm((f) => syncPrezzoVenditaInForm({ ...f, prezzoFornitoreOriginale: e.target.value }))
            }
            className={`${inputBase} ${noSpinner} tabular-nums`}
          />
        </RicambioField>
        <RicambioField label="Sconto %">
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            inputMode="decimal"
            value={form.scontoFornitoreOriginale}
            onChange={(e) => setForm((f) => ({ ...f, scontoFornitoreOriginale: e.target.value }))}
            className={`${inputBase} ${noSpinner} tabular-nums`}
          />
        </RicambioField>
      </div>
      <RicambioField label="Markup % sul listino OE">
        <input
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={form.markupPercentuale}
          onChange={(e) =>
            setForm((f) => syncPrezzoVenditaInForm({ ...f, markupPercentuale: e.target.value }))
          }
          onBlur={(e) =>
            setForm((f) =>
              syncPrezzoVenditaInForm({
                ...f,
                markupPercentuale: normalizeMarkupInputString(e.target.value),
              }),
            )
          }
          className={`${inputBase} ${noSpinner} tabular-nums`}
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
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Alternativo</p>
      <RicambioField label="Fornitore non originale">
        <GlobalSettingsListSelect
          listKey="magazzino:fornitori"
          value={form.fornitoreNonOriginale}
          onChange={(fornitoreNonOriginale) => setForm((f) => ({ ...f, fornitoreNonOriginale }))}
          placeholder="Cerca o seleziona fornitore…"
          aria-label="Fornitore non originale"
        />
      </RicambioField>
      <RicambioField label="Codice alternativo">
        <input
          value={form.codiceFornitoreNonOriginale}
          onChange={(e) => setForm((f) => ({ ...f, codiceFornitoreNonOriginale: e.target.value }))}
          className={`${inputBase} font-mono`}
        />
      </RicambioField>
      <div className="grid grid-cols-2 gap-2">
        <RicambioField label="Prezzo alternativo €">
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={form.prezzoFornitoreNonOriginale}
            onChange={(e) => setForm((f) => ({ ...f, prezzoFornitoreNonOriginale: e.target.value }))}
            className={`${inputBase} ${noSpinner} tabular-nums`}
          />
        </RicambioField>
        <RicambioField label="Sconto alt. %">
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            inputMode="decimal"
            value={form.scontoFornitoreNonOriginale}
            onChange={(e) => setForm((f) => ({ ...f, scontoFornitoreNonOriginale: e.target.value }))}
            className={`${inputBase} ${noSpinner} tabular-nums`}
          />
        </RicambioField>
      </div>
      <MagazzinoPrezziLineari
        listinoOE={previewLineari.listinoOE}
        scontoOE={previewLineari.scontoOE}
        listinoAlt={previewLineari.listinoAlt}
        scontoAlt={previewLineari.scontoAlt}
        markupPct={previewLineari.markupPct}
        prezzoVendita={previewLineari.prezzoVendita}
      />
    </GestionaleFormFocusScope>
  );
}
