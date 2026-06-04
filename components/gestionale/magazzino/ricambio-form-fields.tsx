"use client";

import { useEffect, useMemo, useState } from "react";
import { GlobalSettingsListSelect } from "@/components/gestionale/global-input";
import { CompatHierarchyMultiSelect } from "@/components/gestionale/magazzino/compat-hierarchy-multi-select";
import { MagazzinoPrezziLineari } from "@/components/gestionale/magazzino/magazzino-prezzi-lineari";
import { RicambioFornitoriAlternativiEditor } from "@/components/gestionale/magazzino/ricambio-fornitori-alternativi-editor";
import { ricambioModalSectionClass } from "@/components/gestionale/magazzino/ricambio-modal-ui";
import type { RicambioFormState } from "@/lib/magazzino/form";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { isAllowedCompatLine, isCompatMarcaUniversalLine, marcaUniversalCompatLabel } from "@/lib/magazzino/ricambio-compat-resolver";
import {
  expandRicambioCompatibilitaMezzi,
  lineBelongsToHierarchyTree,
  stripCompatLinesForMarcaInTree,
} from "@/lib/magazzino/ricambio-compat-expand";
import {
  migrateMezziListePrefs,
  parseCompatMarcaModello,
} from "@/lib/mezzi/attrezzature-prefs";
import {
  compatLabelsPerMarcheHierarchy,
  marcheFromHierarchyTree,
} from "@/lib/mezzi/hierarchy-list-prefs";
import {
  clampMarkupPercentuale,
  compatLineDisplayText,
  fornitoriAlternativiFromFormRows,
  normalizeMarkupInputString,
  parseCompatInput,
  syncPrezzoVenditaInForm,
} from "@/lib/magazzino/form";
import { marchePendingUniversalCompatExpand } from "@/lib/magazzino/ricambio-compat-expand";
import { prezzoVenditaDaListinoEMarkup } from "@/lib/magazzino/calculations";
import { applyRicambioCodiceInputChange } from "@/lib/magazzino/ricambio-codice";
import { GestionaleFormFocusScope } from "@/components/gestionale/gestionale-form-focus-scope";
import { CloseButton } from "@/components/design-system";
import { dsBtnNeutral, dsBtnPrimary, dsInput, dsLabel, dsStepperBtn, dsTypoSmall } from "@/lib/ui/design-system";
import { globalInputInvalidRing } from "@/lib/ui/global-input";
import { getScontoFornitoreMarca } from "@/lib/magazzino/marca-fornitore-sconto";
import { useGlobalOptions } from "@/src/hooks/use-global-options";
import {
  CAB_FOCUS_SCROLL_GROUP_ATTR,
  CAB_FOCUS_SCROLL_TITLE_ATTR,
} from "@/lib/ui/mobile-modal-behavior";

const ricambioFormInputClass = dsInput;

function RicambioSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      {...{ [CAB_FOCUS_SCROLL_TITLE_ATTR]: "" }}
      className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[color:var(--cab-text)]"
    >
      {children}
    </p>
  );
}

/** Nasconde frecce native del browser su input numerici (stepper custom solo scorta). */
const noSpinner =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const stepperInputClass = `${ricambioFormInputClass} ${noSpinner} h-9 min-h-9 min-w-[2.75rem] max-w-[5.5rem] flex-1 py-0 hover:border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] hover:shadow-[var(--cab-shadow-sm)]`;

const stepperBtnClass = `${dsStepperBtn} relative z-[1] transition-[background-color,border-color,box-shadow,transform] duration-150`;

const ricambioFormSecondaryBtnClass = `${dsBtnNeutral} h-11 min-h-11 shrink-0 whitespace-nowrap px-3 text-[11px] font-semibold`;

function normCompatMarca(m: string): string {
  return m.trim().toLowerCase();
}

function joinCompatLines(lines: Iterable<string>): string {
  return Array.from(lines)
    .sort((a, b) => a.localeCompare(b, "it"))
    .join(", ");
}

function expandCompatInForm(
  lines: readonly string[],
  marcheAtt: readonly string[],
  marcheTel: readonly string[],
  mezziListe: import("@/lib/mezzi/mezzi-liste-prefs-storage").MezziListePrefs,
): string {
  return joinCompatLines(
    expandRicambioCompatibilitaMezzi(lines, {
      marcheAttrezzaturaFiltro: marcheAtt,
      marcheTelaioFiltro: marcheTel,
      mezziListe,
    }),
  );
}

function marcaFiltroChipLabel(
  marca: string,
  tree: "attrezzature" | "telai",
  selected: ReadonlySet<string>,
  mezziListe: import("@/lib/mezzi/mezzi-liste-prefs-storage").MezziListePrefs,
): string {
  const hasModels = [...selected].some((line) => {
    if (!lineBelongsToHierarchyTree(line, tree, mezziListe)) return false;
    const parsed = parseCompatMarcaModello(line);
    return normCompatMarca(parsed.marca) === normCompatMarca(marca) && Boolean(parsed.modello);
  });
  const hasUniversal = [...selected].some((line) => {
    if (!isCompatMarcaUniversalLine(line)) return false;
    if (!lineBelongsToHierarchyTree(line, tree, mezziListe)) return false;
    return normCompatMarca(parseCompatMarcaModello(line).marca) === normCompatMarca(marca);
  });
  if (hasUniversal && !hasModels) {
    return compatLineDisplayText(marcaUniversalCompatLabel(marca));
  }
  return marca;
}

function formatEurIt(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function StockStepper({
  value,
  onChange,
  onDelta,
  groupLabel,
  ariaDecrease,
  ariaIncrease,
  inputClass,
  inputId,
}: {
  value: string;
  onChange: (v: string) => void;
  onDelta: (d: number) => void;
  /** Evita &lt;label&gt; che raggruppa più controlli (hover/focus incrociati) */
  groupLabel: string;
  ariaDecrease: string;
  ariaIncrease: string;
  inputClass: string;
  inputId?: string;
}) {
  return (
    <div role="group" aria-label={groupLabel} className="flex max-w-full items-center gap-2">
      <button
        type="button"
        className={stepperBtnClass}
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
        id={inputId}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} relative z-0 min-w-0 flex-1 text-center font-mono tabular-nums`}
        aria-label={groupLabel}
      />
      <button
        type="button"
        className={stepperBtnClass}
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
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  /** Id del controllo per associazione label (a11y). */
  htmlFor?: string;
}) {
  if (htmlFor) {
    return (
      <div className="block min-w-0">
        <label htmlFor={htmlFor} className={`${dsLabel} cursor-default`}>
          {label}
        </label>
        <div className="mt-1">{children}</div>
      </div>
    );
  }
  return (
    <div className="block min-w-0">
      <span className={dsLabel}>{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

type SetForm = React.Dispatch<React.SetStateAction<RicambioFormState>>;

export function RicambioFormFields({
  form,
  setForm,
  formResetKey,
  codiceOriginaleAvvisoDuplicato,
  relaxHtmlValidation = false,
  listFieldForceInvalid = false,
}: {
  form: RicambioFormState;
  setForm: SetForm;
  /** Cambia quando si apre un altro ricambio — resetta filtri marca locali. */
  formResetKey?: string;
  codiceOriginaleAvvisoDuplicato?: { existing: RicambioMagazzino; onVaiAlRicambio: () => void } | null;
  relaxHtmlValidation?: boolean;
  listFieldForceInvalid?: boolean;
}) {
  const globalOpts = useGlobalOptions({ debugTag: "RicambioFormFields" });
  const prefsTree = useMemo(() => migrateMezziListePrefs(globalOpts.mezziListe), [globalOpts.mezziListe]);
  const mezziSel = useMemo(() => new Set(parseCompatInput(form.compatibilitaMezzi)), [form.compatibilitaMezzi]);
  const [marcheFiltroAtt, setMarcheFiltroAtt] = useState<Set<string>>(
    () => new Set(parseCompatInput(form.compatMarcheAttrezzaturaFiltro)),
  );
  const [marcheFiltroTel, setMarcheFiltroTel] = useState<Set<string>>(
    () => new Set(parseCompatInput(form.compatMarcheTelaioFiltro)),
  );
  const [showCodiceSecondario, setShowCodiceSecondario] = useState(
    () => Boolean(form.codiceFornitoreOriginaleSecondario.trim()),
  );

  useEffect(() => {
    setMarcheFiltroAtt(new Set(parseCompatInput(form.compatMarcheAttrezzaturaFiltro)));
    setMarcheFiltroTel(new Set(parseCompatInput(form.compatMarcheTelaioFiltro)));
    setShowCodiceSecondario(
      Boolean(form.codiceFornitoreOriginaleSecondario.trim() || form.marcaOriginaleSecondaria.trim()),
    );
  }, [
    formResetKey,
    form.compatMarcheAttrezzaturaFiltro,
    form.compatMarcheTelaioFiltro,
    form.codiceFornitoreOriginaleSecondario,
    form.marcaOriginaleSecondaria,
  ]);

  function syncMarcheAttrezzaturaFiltro(next: Set<string>) {
    setMarcheFiltroAtt(next);
    const joined = joinCompatLines(next);
    setForm((f) => {
      const prevAtt = new Set(parseCompatInput(f.compatMarcheAttrezzaturaFiltro));
      let lines = parseCompatInput(f.compatibilitaMezzi);
      for (const old of prevAtt) {
        if (next.has(old)) continue;
        lines = stripCompatLinesForMarcaInTree(lines, old, "attrezzature", prefsTree);
      }
      const marcheTel = parseCompatInput(f.compatMarcheTelaioFiltro);
      return {
        ...f,
        compatMarcheAttrezzaturaFiltro: joined,
        compatibilitaMezzi: expandCompatInForm(lines, [...next], marcheTel, prefsTree),
      };
    });
  }

  function syncMarcheTelaioFiltro(next: Set<string>) {
    setMarcheFiltroTel(next);
    const joined = joinCompatLines(next);
    setForm((f) => {
      const prevTel = new Set(parseCompatInput(f.compatMarcheTelaioFiltro));
      let lines = parseCompatInput(f.compatibilitaMezzi);
      for (const old of prevTel) {
        if (next.has(old)) continue;
        lines = stripCompatLinesForMarcaInTree(lines, old, "telai", prefsTree);
      }
      const marcheAtt = parseCompatInput(f.compatMarcheAttrezzaturaFiltro);
      return {
        ...f,
        compatMarcheTelaioFiltro: joined,
        compatibilitaMezzi: expandCompatInForm(lines, marcheAtt, [...next], prefsTree),
      };
    });
  }

  function toggleMezzo(m: string) {
    setForm((f) => {
      const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
      if (cur.has(m)) cur.delete(m);
      else cur.add(m);
      return {
        ...f,
        compatibilitaMezzi: expandCompatInForm(
          [...cur],
          parseCompatInput(f.compatMarcheAttrezzaturaFiltro),
          parseCompatInput(f.compatMarcheTelaioFiltro),
          prefsTree,
        ),
      };
    });
  }

  function removeCompatLine(line: string) {
    setForm((f) => {
      const cur = new Set(parseCompatInput(f.compatibilitaMezzi));
      cur.delete(line);
      return { ...f, compatibilitaMezzi: joinCompatLines(cur) };
    });
  }

  function addCompatLine(line: string) {
    toggleMezzo(line);
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
    const markupPct = clampMarkupPercentuale(parseFloat(String(form.markupPercentuale).replace(",", ".")) || 0);
    const prezzoVendita = Math.max(0, parseFloat(String(form.prezzoVendita).replace(",", ".")) || 0);
    const prezzoVenditaPrevisto = prezzoVenditaDaListinoEMarkup(listinoOE, markupPct);
    const fornitoriAlternativi = fornitoriAlternativiFromFormRows(form.fornitoriAlternativi);
    return { listinoOE, scontoOE, markupPct, prezzoVendita, prezzoVenditaPrevisto, fornitoriAlternativi };
  }, [
    form.prezzoFornitoreOriginale,
    form.scontoFornitoreOriginale,
    form.fornitoriAlternativi,
    form.markupPercentuale,
    form.prezzoVendita,
  ]);

  const fieldsOptional = relaxHtmlValidation;

  const marcheAttrezzatura = useMemo(() => marcheFromHierarchyTree(prefsTree, "attrezzature"), [prefsTree]);
  const marcheTelaio = useMemo(() => marcheFromHierarchyTree(prefsTree, "telai"), [prefsTree]);

  const marcheFiltroAttList = useMemo(() => Array.from(marcheFiltroAtt).sort((a, b) => a.localeCompare(b, "it")), [marcheFiltroAtt]);
  const marcheFiltroTelList = useMemo(() => Array.from(marcheFiltroTel).sort((a, b) => a.localeCompare(b, "it")), [marcheFiltroTel]);

  function lineBelongsToAttrezzature(line: string): boolean {
    return lineBelongsToHierarchyTree(line, "attrezzature", prefsTree);
  }

  function lineBelongsToTelai(line: string): boolean {
    return lineBelongsToHierarchyTree(line, "telai", prefsTree);
  }

  const selectedAttrezzature = useMemo(
    () =>
      Array.from(mezziSel)
        .filter((x) => lineBelongsToAttrezzature(x))
        .sort((a, b) => a.localeCompare(b, "it"))
        .map((value) => ({ value, label: compatLineDisplayText(value) })),
    [mezziSel, prefsTree],
  );
  const selectedTelai = useMemo(
    () =>
      Array.from(mezziSel)
        .filter((x) => lineBelongsToTelai(x))
        .sort((a, b) => a.localeCompare(b, "it"))
        .map((value) => ({ value, label: compatLineDisplayText(value) })),
    [mezziSel, prefsTree],
  );

  const attrezzatureOpts = useMemo(
    () => compatLabelsPerMarcheHierarchy(prefsTree, "attrezzature", marcheFiltroAttList),
    [prefsTree, marcheFiltroAttList],
  );
  const telaiOpts = useMemo(
    () => compatLabelsPerMarcheHierarchy(prefsTree, "telai", marcheFiltroTelList),
    [prefsTree, marcheFiltroTelList],
  );

  const pendingUniversalMarche = useMemo(
    () =>
      marchePendingUniversalCompatExpand(parseCompatInput(form.compatibilitaMezzi), {
        marcheAttrezzaturaFiltro: marcheFiltroAttList,
        marcheTelaioFiltro: marcheFiltroTelList,
        mezziListe: prefsTree,
      }),
    [form.compatibilitaMezzi, marcheFiltroAttList, marcheFiltroTelList, prefsTree],
  );

  const pendingUniversalLabel = useMemo(() => {
    const parts = [
      ...pendingUniversalMarche.attrezzature.map((m) => `${m} (attrezzatura)`),
      ...pendingUniversalMarche.telai.map((m) => `${m} (telaio)`),
    ];
    return parts.join(", ");
  }, [pendingUniversalMarche]);

  const compatFormStatus = useMemo(() => {
    const expanded = expandRicambioCompatibilitaMezzi(parseCompatInput(form.compatibilitaMezzi), {
      marcheAttrezzaturaFiltro: marcheFiltroAttList,
      marcheTelaioFiltro: marcheFiltroTelList,
      mezziListe: prefsTree,
    });
    const valid = expanded.filter((line) => isAllowedCompatLine(line, prefsTree));
    const invalid = expanded.filter((line) => !isAllowedCompatLine(line, prefsTree));
    return { expanded, valid, invalid };
  }, [form.compatibilitaMezzi, marcheFiltroAttList, marcheFiltroTelList, prefsTree]);

  return (
    <GestionaleFormFocusScope className="flex flex-col gap-4">
      <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className={ricambioModalSectionClass}>
        <RicambioSectionTitle>Identificazione</RicambioSectionTitle>
        <div className="grid gap-3">
      <RicambioField label={fieldsOptional ? "Marca" : "Marca *"} htmlFor="magazzino-ricambio-marca">
        <GlobalSettingsListSelect
          listKey="magazzino:marche"
          id="magazzino-ricambio-marca"
          value={form.marca}
          onChange={(marca) => {
            const sconto = getScontoFornitoreMarca(globalOpts.magazzinoMaster, marca);
            setForm((f) => ({
              ...f,
              marca,
              scontoFornitoreOriginale: String(sconto),
            }));
          }}
          required={!fieldsOptional}
          placeholder="Cerca o seleziona marca…"
          inputClassName={ricambioFormInputClass}
          aria-label="Marca ricambio"
        />
      </RicambioField>
      <RicambioField
        label={fieldsOptional ? "Codice fornitore originale" : "Codice fornitore originale *"}
        htmlFor="magazzino-ricambio-codice-oe"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              id="magazzino-ricambio-codice-oe"
              required={!relaxHtmlValidation}
              value={form.codiceFornitoreOriginale}
              onChange={(e) =>
                applyRicambioCodiceInputChange(e, (codiceFornitoreOriginale) =>
                  setForm((f) => ({ ...f, codiceFornitoreOriginale })),
                )
              }
              className={`${ricambioFormInputClass} min-w-0 flex-1 font-mono font-semibold tracking-wide ${
                codiceOriginaleAvvisoDuplicato ? globalInputInvalidRing : ""
              }`}
              aria-invalid={codiceOriginaleAvvisoDuplicato ? true : undefined}
            />
            {!showCodiceSecondario ? (
              <button
                type="button"
                className={ricambioFormSecondaryBtnClass}
                onClick={() => setShowCodiceSecondario(true)}
              >
                + Secondario
              </button>
            ) : null}
          </div>
          {showCodiceSecondario ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  id="magazzino-ricambio-codice-secondario"
                  value={form.codiceFornitoreOriginaleSecondario}
                  onChange={(e) =>
                    applyRicambioCodiceInputChange(e, (codiceFornitoreOriginaleSecondario) =>
                      setForm((f) => ({ ...f, codiceFornitoreOriginaleSecondario })),
                    )
                  }
                  placeholder="Codice secondario (opzionale)"
                  className={`${ricambioFormInputClass} min-w-0 flex-1 font-mono text-[13px] tracking-wide`}
                />
                <CloseButton
                  label="Rimuovi codice secondario"
                  className="h-11 w-11 shrink-0"
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
              <RicambioField label="Marca secondaria" htmlFor="magazzino-ricambio-marca-secondaria">
                <GlobalSettingsListSelect
                  listKey="magazzino:marche"
                  id="magazzino-ricambio-marca-secondaria"
                  value={form.marcaOriginaleSecondaria}
                  onChange={(marcaOriginaleSecondaria) => setForm((f) => ({ ...f, marcaOriginaleSecondaria }))}
                  placeholder="Marca del codice secondario…"
                  inputClassName={ricambioFormInputClass}
                  aria-label="Marca secondaria codice OE"
                />
              </RicambioField>
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
        label={fieldsOptional ? "Descrizione" : "Descrizione *"}
        htmlFor="magazzino-ricambio-descrizione"
      >
        <input
          id="magazzino-ricambio-descrizione"
          required={!relaxHtmlValidation}
          value={form.descrizione}
          onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
          className={ricambioFormInputClass}
        />
      </RicambioField>
      <RicambioField label="Note" htmlFor="magazzino-ricambio-note">
        <textarea
          id="magazzino-ricambio-note"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          rows={2}
          className={`${ricambioFormInputClass} min-h-[4.5rem] resize-y`}
        />
      </RicambioField>
      <RicambioField label={fieldsOptional ? "Categoria" : "Categoria *"} htmlFor="magazzino-ricambio-categoria">
        <GlobalSettingsListSelect
          listKey="magazzino:categorie"
          id="magazzino-ricambio-categoria"
          value={form.categoria}
          onChange={(categoria) => setForm((f) => ({ ...f, categoria }))}
          required={!fieldsOptional}
          selectOnly
          inputClassName={ricambioFormInputClass}
          placeholder="Seleziona categoria…"
          aria-label="Categoria ricambio"
        />
      </RicambioField>
      <RicambioField label="Usato nei tagliandi">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Usato nei tagliandi">
          <button
            type="button"
            className={`${dsBtnNeutral} min-h-11 px-4 text-sm font-semibold ${!form.usatoInTagliandi ? "ring-2 ring-[color:var(--cab-primary)]" : ""}`}
            aria-pressed={!form.usatoInTagliandi}
            onClick={() => setForm((f) => ({ ...f, usatoInTagliandi: false }))}
          >
            No
          </button>
          <button
            type="button"
            className={`${dsBtnNeutral} min-h-11 px-4 text-sm font-semibold ${form.usatoInTagliandi ? "ring-2 ring-[color:var(--cab-primary)]" : ""}`}
            aria-pressed={form.usatoInTagliandi}
            onClick={() => setForm((f) => ({ ...f, usatoInTagliandi: true }))}
          >
            Sì
          </button>
        </div>
      </RicambioField>
        </div>
      </div>

      <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className={ricambioModalSectionClass}>
        <RicambioSectionTitle>Compatibilità mezzi</RicambioSectionTitle>
        <div className="grid gap-3">
        {globalOpts.isLoading ? (
          <p className={dsTypoSmall}>Caricamento elenchi attrezzature e telai…</p>
        ) : null}
        <div className="space-y-3">
          <div>
            <p className={`mb-1.5 ${dsLabel}`}>Marca attrezzatura</p>
            <CompatHierarchyMultiSelect
              tree="attrezzature"
              hierarchyKind="marca"
              ariaLabel="Marca attrezzatura compatibilità"
              placeholder="Cerca marca attrezzatura…"
              disabled={globalOpts.isLoading}
              options={marcheAttrezzatura}
              selected={marcheFiltroAttList.map((m) => ({
                value: m,
                label: marcaFiltroChipLabel(m, "attrezzature", mezziSel, prefsTree),
              }))}
              onAdd={(m) => syncMarcheAttrezzaturaFiltro(new Set(marcheFiltroAtt).add(m))}
              onRemove={(m) => {
                const next = new Set(marcheFiltroAtt);
                next.delete(m);
                syncMarcheAttrezzaturaFiltro(next);
              }}
              emptyMessage="Nessuna marca"
            />
          </div>

          <div>
            <p className={`mb-1.5 ${dsLabel}`}>Modello attrezzatura</p>
            <CompatHierarchyMultiSelect
              tree="attrezzature"
              hierarchyKind="modello"
              marcaNome={marcheFiltroAttList[0]}
              ariaLabel="Modello attrezzatura compatibilità"
              placeholder="Cerca modello attrezzatura…"
              disabled={globalOpts.isLoading}
              options={attrezzatureOpts}
              selected={selectedAttrezzature}
              onAdd={addCompatLine}
              onRemove={removeCompatLine}
              emptyMessage="Nessun modello"
            />
          </div>

          <div>
            <p className={`mb-1.5 ${dsLabel}`}>Marca telaio</p>
            <CompatHierarchyMultiSelect
              tree="telai"
              hierarchyKind="marca"
              ariaLabel="Marca telaio compatibilità"
              placeholder="Cerca marca telaio…"
              disabled={globalOpts.isLoading}
              options={marcheTelaio}
              selected={marcheFiltroTelList.map((m) => ({
                value: m,
                label: marcaFiltroChipLabel(m, "telai", mezziSel, prefsTree),
              }))}
              onAdd={(m) => syncMarcheTelaioFiltro(new Set(marcheFiltroTel).add(m))}
              onRemove={(m) => {
                const next = new Set(marcheFiltroTel);
                next.delete(m);
                syncMarcheTelaioFiltro(next);
              }}
              emptyMessage="Nessuna marca"
            />
          </div>

          <div>
            <p className={`mb-1.5 ${dsLabel}`}>Modello telaio</p>
            <CompatHierarchyMultiSelect
              tree="telai"
              hierarchyKind="modello"
              marcaNome={marcheFiltroTelList[0]}
              ariaLabel="Modello telaio compatibilità"
              placeholder="Cerca modello telaio…"
              disabled={globalOpts.isLoading}
              options={telaiOpts}
              selected={selectedTelai}
              onAdd={addCompatLine}
              onRemove={removeCompatLine}
              emptyMessage="Nessun modello"
            />
          </div>
        </div>
        {compatFormStatus.invalid.length > 0 ? (
          <p className="mt-1 text-[11px] font-medium text-[color:color-mix(in_srgb,var(--cab-danger)_88%,var(--cab-text))]">
            {compatFormStatus.invalid.length === 1
              ? "1 compatibilità obsoleta o non riconosciuta — rimuovila o sostituiscila dall'elenco mezzi."
              : `${compatFormStatus.invalid.length} compatibilità obsolete o non riconosciute — rimuovile o sostituiscile dall'elenco mezzi.`}
          </p>
        ) : (
          <p className={`mt-1 ${dsTypoSmall}`}>
            {compatFormStatus.valid.length > 0
              ? compatFormStatus.valid.length === 1
                ? "1 compatibilità selezionata"
                : `${compatFormStatus.valid.length} compatibilità selezionate`
              : pendingUniversalLabel
                ? "Nessun modello selezionato — al salvataggio: compatibilità universale per marca."
                : "Nessuna selezione — compatibilità universale (tutte le macchine)."}
          </p>
        )}
        {compatFormStatus.invalid.length === 0 && pendingUniversalLabel ? (
          <p
            className="mt-1.5 rounded-md border border-[color:color-mix(in_srgb,var(--cab-primary)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,transparent)] px-2 py-1 text-[11px] text-[color:var(--cab-text)]"
            role="status"
          >
            Al salvataggio: compatibilità universale per {pendingUniversalLabel}
          </p>
        ) : null}
        </div>
      </div>

      <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className={ricambioModalSectionClass}>
        <RicambioSectionTitle>Giacenza</RicambioSectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <RicambioField label="Scorta" htmlFor="magazzino-ricambio-scorta">
          <StockStepper
            inputId="magazzino-ricambio-scorta"
            groupLabel="Scorta"
            value={form.scorta}
            onChange={(v) => setForm((f) => ({ ...f, scorta: v }))}
            onDelta={(d) => bumpScorta("scorta", d)}
            ariaDecrease="Diminuisci scorta"
            ariaIncrease="Aumenta scorta"
            inputClass={stepperInputClass}
          />
        </RicambioField>
        <RicambioField label="Scorta minima" htmlFor="magazzino-ricambio-scorta-minima">
          <StockStepper
            inputId="magazzino-ricambio-scorta-minima"
            groupLabel="Scorta minima"
            value={form.scortaMinima}
            onChange={(v) => setForm((f) => ({ ...f, scortaMinima: v }))}
            onDelta={(d) => bumpScorta("scortaMinima", d)}
            ariaDecrease="Diminuisci scorta minima"
            ariaIncrease="Aumenta scorta minima"
            inputClass={stepperInputClass}
          />
        </RicambioField>
      </div>
      </div>

      <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className={ricambioModalSectionClass}>
        <RicambioSectionTitle>Fornitore originale</RicambioSectionTitle>
        <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <RicambioField label="Prezzo listino €" htmlFor="magazzino-ricambio-prezzo-listino">
          <input
            id="magazzino-ricambio-prezzo-listino"
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={form.prezzoFornitoreOriginale}
            onChange={(e) =>
              setForm((f) => syncPrezzoVenditaInForm({ ...f, prezzoFornitoreOriginale: e.target.value }))
            }
            className={`${ricambioFormInputClass} ${noSpinner} tabular-nums`}
          />
        </RicambioField>
        <RicambioField label="Sconto %" htmlFor="magazzino-ricambio-sconto-oe">
          <input
            id="magazzino-ricambio-sconto-oe"
            type="number"
            min={0}
            max={100}
            step={0.01}
            inputMode="decimal"
            value={form.scontoFornitoreOriginale}
            onChange={(e) => setForm((f) => ({ ...f, scontoFornitoreOriginale: e.target.value }))}
            className={`${ricambioFormInputClass} ${noSpinner} tabular-nums`}
          />
        </RicambioField>
      </div>
      <RicambioField label="Markup % sul listino OE" htmlFor="magazzino-ricambio-markup">
        <input
          id="magazzino-ricambio-markup"
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
          className={`${ricambioFormInputClass} ${noSpinner} tabular-nums`}
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
      </div>

      <div {...{ [CAB_FOCUS_SCROLL_GROUP_ATTR]: "" }} className={ricambioModalSectionClass}>
        <RicambioSectionTitle>Fornitori alternativi</RicambioSectionTitle>
        <RicambioFornitoriAlternativiEditor
          rows={form.fornitoriAlternativi}
          onChange={(fornitoriAlternativi) => setForm((f) => ({ ...f, fornitoriAlternativi }))}
        />
      </div>

      <MagazzinoPrezziLineari
        listinoOE={previewLineari.listinoOE}
        scontoOE={previewLineari.scontoOE}
        fornitoriAlternativi={previewLineari.fornitoriAlternativi}
        markupPct={previewLineari.markupPct}
        prezzoVendita={previewLineari.prezzoVendita}
      />
    </GestionaleFormFocusScope>
  );
}
