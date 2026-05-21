"use client";

import { useEffect, useMemo, useState } from "react";
import { GlobalSelect, GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { MagazzinoPrezziLineari } from "@/components/gestionale/magazzino/magazzino-prezzi-lineari";
import type { RicambioFormState } from "@/lib/magazzino/form";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { isValueInListOptions } from "@/lib/ui/list-select-utils";
import {
  compatLabelsPerMarche,
  migrateMezziListePrefs,
  parseCompatMarcaModello,
} from "@/lib/mezzi/attrezzature-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  clampMarkupPercentuale,
  normalizeMarkupInputString,
  parseCompatInput,
  syncPrezzoVenditaInForm,
} from "@/lib/magazzino/form";
import { GestionaleFormFocusScope } from "@/components/gestionale/gestionale-form-focus-scope";
import { dsBtnPrimary } from "@/lib/ui/design-system";

const inputBase =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-orange-500/25 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950";

/** Nasconde frecce native del browser su input numerici (stepper custom solo scorta). */
const noSpinner =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

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
  marcheOptions,
  categorieOptions,
  fornitoriOptions,
  mezziOptions,
  attrezzatureListe,
  codiceOriginaleAvvisoDuplicato,
  relaxHtmlValidation = false,
  autoFocusToken = 0,
  listFieldForceInvalid = false,
}: {
  form: RicambioFormState;
  setForm: SetForm;
  marcheOptions: string[];
  categorieOptions: string[];
  fornitoriOptions: string[];
  mezziOptions: string[];
  attrezzatureListe: MezziListePrefs;
  /** Avviso sotto il campo codice OE (es. nuovo ricambio con codice già in archivio) */
  codiceOriginaleAvvisoDuplicato?: { existing: RicambioMagazzino; onVaiAlRicambio: () => void } | null;
  /** Se true: nessun `required` HTML (submit gestito lato applicazione). */
  relaxHtmlValidation?: boolean;
  /** Incrementato a ogni apertura modal «Nuovo ricambio» per focus affidabile sul campo Marca. */
  autoFocusToken?: number;
  /** Evidenzia errori elenco dopo submit fallito. */
  listFieldForceInvalid?: boolean;
}) {
  const [marcheFiltroCompat, setMarcheFiltroCompat] = useState<Set<string>>(() => new Set());
  const prefsTree = useMemo(() => migrateMezziListePrefs(attrezzatureListe), [attrezzatureListe]);
  const marcheAttrezzatura = useMemo(() => [...prefsTree.marche], [prefsTree.marche]);
  const lineeCompatGlobali = useMemo(() => compatLabelsPerMarche(prefsTree, []), [prefsTree]);
  const mezziCompatOptions = useMemo(() => {
    const base = [...new Set([...mezziOptions, ...lineeCompatGlobali])];
    return base.sort((a, b) => a.localeCompare(b, "it"));
  }, [mezziOptions, lineeCompatGlobali]);
  const mezziSel = useMemo(() => new Set(parseCompatInput(form.compatibilitaMezzi)), [form.compatibilitaMezzi]);
  const marcheFiltroList = useMemo(() => Array.from(marcheFiltroCompat).sort((a, b) => a.localeCompare(b, "it")), [marcheFiltroCompat]);
  const mezziOptsSorted = useMemo(() => {
    const cmp = (a: string, b: string) => a.localeCompare(b, "it");
    const fromTree = compatLabelsPerMarche(prefsTree, marcheFiltroList);
    const visible = [...new Set([...fromTree, ...mezziCompatOptions.filter((x) => {
      if (marcheFiltroList.length === 0) return true;
      const { marca } = parseCompatMarcaModello(x);
      return marcheFiltroList.some((m) => m.localeCompare(marca, "it", { sensitivity: "base" }) === 0);
    })])].sort(cmp);
    const marcaForm = form.marca.trim();
    if (!marcaForm) return visible;
    const prio: string[] = [];
    const rest: string[] = [];
    for (const x of visible) {
      const { marca } = parseCompatMarcaModello(x);
      if (marca.trim().localeCompare(marcaForm, "it", { sensitivity: "base" }) === 0) prio.push(x);
      else rest.push(x);
    }
    prio.sort(cmp);
    rest.sort(cmp);
    return [...prio, ...rest];
  }, [mezziCompatOptions, prefsTree, marcheFiltroList, form.marca]);

  const mezziOptsGrouped = useMemo(() => {
    const byMarca = new Map<string, string[]>();
    for (const line of mezziOptsSorted) {
      const { marca } = parseCompatMarcaModello(line);
      const key = marca.trim() || "Altro";
      const bucket = byMarca.get(key) ?? [];
      bucket.push(line);
      byMarca.set(key, bucket);
    }
    return Array.from(byMarca.entries()).sort(([a], [b]) => a.localeCompare(b, "it"));
  }, [mezziOptsSorted]);

  const invalidCompat = useMemo(() => {
    const selected = parseCompatInput(form.compatibilitaMezzi);
    return selected.filter((x) => !isValueInListOptions(x, mezziCompatOptions));
  }, [form.compatibilitaMezzi, mezziCompatOptions]);

  useEffect(() => {
    if (!relaxHtmlValidation || autoFocusToken <= 0) return;
    const id = window.requestAnimationFrame(() => {
      document.getElementById("magazzino-ricambio-marca")?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [autoFocusToken, relaxHtmlValidation]);

  function toggleMarcaFiltro(marca: string) {
    setMarcheFiltroCompat((prev) => {
      const next = new Set(prev);
      if (next.has(marca)) next.delete(marca);
      else next.add(marca);
      return next;
    });
  }

  function toggleMezzo(m: string) {
    setForm((f) => {
      const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
      if (cur.has(m)) cur.delete(m);
      else cur.add(m);
      const joined = Array.from(cur).sort((a, b) => a.localeCompare(b, "it")).join(", ");
      return { ...f, compatibilitaMezzi: joined };
    });
  }

  function setVisibleMezziSelected(selected: boolean) {
    setForm((f) => {
      const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
      for (const m of mezziOptsSorted) {
        if (selected) cur.add(m);
        else cur.delete(m);
      }
      const joined = Array.from(cur).sort((a, b) => a.localeCompare(b, "it")).join(", ");
      return { ...f, compatibilitaMezzi: joined };
    });
  }

  function renderMezzoCheckbox(line: string) {
    return (
      <label
        key={line}
        className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-white dark:hover:bg-zinc-800/80"
      >
        <input
          type="checkbox"
          className="mt-0.5 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
          checked={mezziSel.has(line)}
          onChange={() => toggleMezzo(line)}
        />
        <span className="leading-snug text-zinc-800 dark:text-zinc-200">{line}</span>
      </label>
    );
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
    return { listinoOE, scontoOE, listinoAlt, scontoAlt, markupPct, prezzoVendita };
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
            role="alert"
          >
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">Codice già presente in magazzino</p>
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
          placeholder="Cerca o seleziona categoria…"
          aria-label="Categoria ricambio"
        />
      </RicambioField>
      <RicambioField label={fieldsOptional ? "Compatibilità mezzi" : "Compatibilità mezzi *"}>
        <div className="mb-2">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Marche attrezzatura</span>
            {marcheFiltroList.length > 0 ? (
              <button
                type="button"
                className="text-[11px] font-medium text-[color:var(--cab-primary)] hover:underline"
                onClick={() => setMarcheFiltroCompat(new Set())}
              >
                Mostra tutte
              </button>
            ) : null}
          </div>
          <div className="max-h-28 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/50 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-900/40">
            {marcheAttrezzatura.length === 0 ? (
              <p className="px-1 text-[11px] text-zinc-500">Configura marche in Impostazioni sistema → Attrezzature.</p>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {marcheAttrezzatura.map((marca) => (
                  <label
                    key={marca}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-xs hover:bg-white dark:hover:bg-zinc-800/80"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                      checked={marcheFiltroCompat.has(marca)}
                      onChange={() => toggleMarcaFiltro(marca)}
                    />
                    <span className="text-zinc-800 dark:text-zinc-200">{marca}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Modelli</span>
          {mezziOptsSorted.length > 0 ? (
            <span className="flex gap-2 text-[11px] font-medium">
              <button
                type="button"
                className="text-[color:var(--cab-primary)] hover:underline"
                onClick={() => setVisibleMezziSelected(true)}
              >
                Seleziona tutti
              </button>
              <button
                type="button"
                className="text-[color:var(--cab-primary)] hover:underline"
                onClick={() => setVisibleMezziSelected(false)}
              >
                Rimuovi tutti
              </button>
            </span>
          ) : null}
        </div>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/50 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-900/40">
          {mezziOptsSorted.length === 0 ? (
            <p className="px-1 text-[11px] text-zinc-500">
              {marcheFiltroList.length > 0
                ? "Nessun modello per le marche selezionate."
                : "Configura marche e modelli in Impostazioni sistema → Attrezzature."}
            </p>
          ) : mezziOptsGrouped.length > 1 ? (
            <div className="space-y-2">
              {mezziOptsGrouped.map(([marca, lines]) => (
                <div key={marca}>
                  <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {marca}
                  </p>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">{lines.map((line) => renderMezzoCheckbox(line))}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{mezziOptsSorted.map((line) => renderMezzoCheckbox(line))}</div>
          )}
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          {mezziSel.size > 0
            ? `${mezziSel.size} compatibilità selezionate${marcheFiltroList.length > 0 ? ` · filtro: ${marcheFiltroList.join(", ")}` : ""}`
            : "Nessuna selezione"}
        </p>
        {!fieldsOptional && ((listFieldForceInvalid && mezziSel.size === 0) || invalidCompat.length > 0) ? (
          <p className="mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
            {invalidCompat.length > 0
              ? "Seleziona solo compatibilità dall'elenco configurato."
              : "Seleziona almeno una compatibilità mezzo."}
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
