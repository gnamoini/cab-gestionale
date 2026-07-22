import {
  prezzoVenditaDaListinoEMarkup,
  resolveListinoMarkupBase,
} from "@/lib/magazzino/calculations";
import {
  newFornitoreAlternativoId,
  resolveFornitoriAlternativiFromMeta,
  sanitizeFornitoriAlternativiForPersist,
  syncFlatFornitoreFieldsOnRicambio,
} from "@/lib/magazzino/ricambio-fornitori-alternativi";
import type { RicambioFornitoreAlternativo, RicambioMagazzino } from "@/lib/magazzino/types";
import {
  flattenCompatDaAttrezzature,
  migrateMezziListePrefs,
} from "@/lib/mezzi/attrezzature-prefs";
import { flattenCompatFromHierarchyTree } from "@/lib/mezzi/hierarchy-list-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import {
  normalizeRicambioCodice,
  resolveRicambioCodiceForPersist,
  ricambioCodiceForUi,
  validateRicambioCodiceRequired,
} from "@/lib/magazzino/ricambio-codice";
import {
  RICAMBIO_UNITA_MISURA_DEFAULT,
  type RicambioUnitaMisura,
} from "@/lib/magazzino/ricambio-unita-misura";
import {
  deriveMarcheFiltroFromCompatLabels,
  expandRicambioCompatibilitaMezzi,
} from "@/lib/magazzino/ricambio-compat-expand";
import { readCompatLabelsForUi } from "@/lib/magazzino/compat/compat-read-guard";
import { writeCompatibilitaRicambio } from "@/lib/magazzino/compat/compat-write-gate";
import {
  compatDisplayLabel,
  compatLineDisplayText,
  compatSortKey,
} from "@/lib/magazzino/compat/compat-display";
import {
  isRicambioCompatUniversal,
  normalizeCompatList,
  parseCompatInput,
  RICAMBIO_COMPAT_LEGACY_PLACEHOLDER,
} from "@/lib/magazzino/compat/compat-normalize";
import { isAllowedCompatLine } from "@/lib/magazzino/ricambio-compat-resolver";
import { buildRicambioCompatExpandOptions } from "@/lib/magazzino/resolve-mezzi-liste-for-compat";
import { isValueInListOptions } from "@/lib/ui/list-select-utils";

const MAGAZZINO_DEFAULT_AUTHOR = "Operatore";

/** Segnaposto lenient al save (SSOT — usare in telemetria e mapping). */
export const RICAMBIO_LENIENT_PLACEHOLDER_MARCA = "—";
export const RICAMBIO_LENIENT_PLACEHOLDER_DESCRIZIONE = "Senza descrizione";
export const RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA = "—";

export {
  RICAMBIO_COMPAT_LEGACY_PLACEHOLDER,
  normalizeCompatList,
  isRicambioCompatUniversal,
  parseCompatInput,
};
export { compatLineDisplayText, compatSortKey, compatDisplayLabel };

/** Limita markup % nell'intervallo gestionale; non tronca i decimali. */
export function clampMarkupPercentuale(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(999, Math.max(0, n));
}

/** @deprecated Usare clampMarkupPercentuale */
export function roundMarkupPercentuale(n: number): number {
  return clampMarkupPercentuale(n);
}

export function formatMarkupDisplay(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  const formatted = new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 12,
    minimumFractionDigits: 0,
  }).format(n);
  return `${formatted}%`;
}

/** Normalizza input markup: mantiene precisione utile, applica solo clamp. */
export function normalizeMarkupInputString(raw: string): string {
  const t = String(raw).trim().replace(",", ".");
  if (t === "" || t === "-" || t === ".") return "0";
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return "0";
  const c = clampMarkupPercentuale(n);
  if (c === n) return t;
  return String(c);
}

export type RicambioFornitoreAlternativoFormRow = {
  id: string;
  fornitore: string;
  produttore: string;
  codice: string;
  prezzo: string;
  sconto: string;
};

export function emptyFornitoreAlternativoFormRow(): RicambioFornitoreAlternativoFormRow {
  return {
    id: newFornitoreAlternativoId(),
    fornitore: "",
    produttore: "",
    codice: "",
    prezzo: "0",
    sconto: "0",
  };
}

export function fornitoriAlternativiToFormRows(
  rows: RicambioFornitoreAlternativo[],
): RicambioFornitoreAlternativoFormRow[] {
  return rows.map((r) => ({
    id: r.id,
    fornitore: r.fornitore,
    produttore: r.produttore,
    codice: r.codice,
    prezzo: String(r.prezzo),
    sconto: String(r.sconto),
  }));
}

/** Righe editor form: risolve legacy/meta e garantisce almeno una riga vuota come in «Nuovo ricambio». */
export function fornitoriAlternativiFormRowsFromRicambio(
  r: Pick<
    RicambioMagazzino,
    | "fornitoriAlternativi"
    | "fornitoreNonOriginale"
    | "codiceFornitoreNonOriginale"
    | "prezzoFornitoreNonOriginale"
    | "scontoFornitoreNonOriginale"
  >,
): RicambioFornitoreAlternativoFormRow[] {
  const resolved = resolveFornitoriAlternativiFromMeta({
    fornitoriAlternativi: r.fornitoriAlternativi ?? [],
    fornitoreNonOriginale: r.fornitoreNonOriginale,
    codiceFornitoreNonOriginale: r.codiceFornitoreNonOriginale,
    prezzoFornitoreNonOriginale: r.prezzoFornitoreNonOriginale,
    scontoFornitoreNonOriginale: r.scontoFornitoreNonOriginale,
  });
  const rows = fornitoriAlternativiToFormRows(resolved);
  return rows.length > 0 ? rows : [emptyFornitoreAlternativoFormRow()];
}

/** True se almeno una riga ha dati utili (non solo placeholder vuoto). */
export function fornitoriAlternativiFormRowsHaveContent(
  rows: RicambioFornitoreAlternativoFormRow[],
): boolean {
  return rows.some((row) => {
    const prezzo = Math.max(0, parseFloat(row.prezzo) || 0);
    const sconto = Math.min(100, Math.max(0, parseFloat(row.sconto) || 0));
    return (
      row.fornitore.trim() !== "" ||
      row.produttore.trim() !== "" ||
      row.codice.trim() !== "" ||
      prezzo > 0 ||
      sconto > 0
    );
  });
}

export function fornitoriAlternativiFromFormRows(
  rows: RicambioFornitoreAlternativoFormRow[],
): RicambioFornitoreAlternativo[] {
  return sanitizeFornitoriAlternativiForPersist(
    rows.map((r) => ({
      id: r.id.trim() || newFornitoreAlternativoId(),
      fornitore: r.fornitore.trim(),
      produttore: r.produttore.trim(),
      codice: normalizeRicambioCodice(r.codice.trim()),
      prezzo: Math.max(0, parseFloat(r.prezzo) || 0),
      sconto: Math.min(100, Math.max(0, parseFloat(r.sconto) || 0)),
    })),
  );
}

export type RicambioFormState = {
  marca: string;
  codiceFornitoreOriginale: string;
  codiceFornitoreOriginaleSecondario: string;
  marcaOriginaleSecondaria: string;
  usatoInTagliandi: boolean;
  unitaMisura: RicambioUnitaMisura;
  descrizione: string;
  note: string;
  categoria: string;
  compatibilitaMezzi: string;
  /** Marche attrezzatura in filtro (espansione automatica modelli al save se vuote). */
  compatMarcheAttrezzaturaFiltro: string;
  /** Marche telaio in filtro (espansione automatica modelli al save se vuote). */
  compatMarcheTelaioFiltro: string;
  scorta: string;
  scortaMinima: string;
  prezzoFornitoreOriginale: string;
  scontoFornitoreOriginale: string;
  markupPercentuale: string;
  /** Allineato al calcolo listino + markup (sola lettura in UI) */
  prezzoVendita: string;
  fornitoriAlternativi: RicambioFornitoreAlternativoFormRow[];
  /** Mirror primo alternativo — aggiornato da fornitoriAlternativi. */
  fornitoreNonOriginale: string;
  codiceFornitoreNonOriginale: string;
  prezzoFornitoreNonOriginale: string;
  scontoFornitoreNonOriginale: string;
};

function fornitoriAlternativiPrezziFromFormRows(
  rows: RicambioFornitoreAlternativoFormRow[],
): Pick<RicambioFornitoreAlternativo, "prezzo" | "sconto">[] {
  return rows.map((row) => ({
    prezzo: Math.max(0, parseFloat(row.prezzo) || 0),
    sconto: Math.min(100, Math.max(0, parseFloat(row.sconto) || 0)),
  }));
}

export function resolveMarkupBaseFromRicambioForm(f: RicambioFormState): number {
  const listinoOE = Math.max(0, parseFloat(f.prezzoFornitoreOriginale) || 0);
  return resolveListinoMarkupBase(listinoOE, fornitoriAlternativiPrezziFromFormRows(f.fornitoriAlternativi));
}

/** Delta scorta solo se l'utente ha modificato il campo rispetto al baseline del modal. */
export function ricambioScortaDeltaFromBaseline(
  baseline: Pick<RicambioFormState, "scorta">,
  draft: Pick<RicambioFormState, "scorta">,
): number {
  const prima = Math.max(0, Math.round(parseFloat(baseline.scorta) || 0));
  const dopo = Math.max(0, Math.round(parseFloat(draft.scorta) || 0));
  return dopo - prima;
}

export function syncPrezzoVenditaInForm(f: RicambioFormState): RicambioFormState {
  const base = resolveMarkupBaseFromRicambioForm(f);
  const rawM = parseFloat(String(f.markupPercentuale).replace(",", "."));
  const m = clampMarkupPercentuale(Number.isFinite(rawM) ? rawM : 0);
  const pv = prezzoVenditaDaListinoEMarkup(base, m);
  return { ...f, prezzoVendita: String(pv) };
}

export function emptyRicambioForm(): RicambioFormState {
  return syncPrezzoVenditaInForm({
    marca: "",
    codiceFornitoreOriginale: "",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: RICAMBIO_UNITA_MISURA_DEFAULT,
    descrizione: "",
    note: "",
    categoria: "",
    compatibilitaMezzi: "",
    compatMarcheAttrezzaturaFiltro: "",
    compatMarcheTelaioFiltro: "",
    scorta: "0",
    scortaMinima: "0",
    prezzoFornitoreOriginale: "0",
    scontoFornitoreOriginale: "0",
    markupPercentuale: "45",
    prezzoVendita: "0",
    fornitoriAlternativi: [emptyFornitoreAlternativoFormRow()],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: "0",
    scontoFornitoreNonOriginale: "0",
  });
}

function ricambioFormDirtySnapshot(f: RicambioFormState): string {
  const s = syncPrezzoVenditaInForm(f);
  return JSON.stringify({
    marca: s.marca.trim(),
    codiceFornitoreOriginale: s.codiceFornitoreOriginale.trim(),
    codiceFornitoreOriginaleSecondario: s.codiceFornitoreOriginaleSecondario.trim(),
    marcaOriginaleSecondaria: s.marcaOriginaleSecondaria.trim(),
    usatoInTagliandi: s.usatoInTagliandi,
    unitaMisura: s.unitaMisura,
    descrizione: s.descrizione.trim(),
    note: s.note.trim(),
    categoria: s.categoria.trim(),
    compatibilitaMezzi: s.compatibilitaMezzi.trim(),
    compatMarcheAttrezzaturaFiltro: s.compatMarcheAttrezzaturaFiltro.trim(),
    compatMarcheTelaioFiltro: s.compatMarcheTelaioFiltro.trim(),
    scorta: s.scorta.trim(),
    scortaMinima: s.scortaMinima.trim(),
    prezzoFornitoreOriginale: s.prezzoFornitoreOriginale.trim(),
    scontoFornitoreOriginale: s.scontoFornitoreOriginale.trim(),
    markupPercentuale: normalizeMarkupInputString(s.markupPercentuale),
    prezzoVendita: s.prezzoVendita.trim(),
    fornitoriAlternativi: s.fornitoriAlternativi.map((r) => ({
      fornitore: r.fornitore.trim(),
      produttore: r.produttore.trim(),
      codice: r.codice.trim(),
      prezzo: r.prezzo.trim(),
      sconto: r.sconto.trim(),
    })),
    fornitoreNonOriginale: s.fornitoreNonOriginale.trim(),
    codiceFornitoreNonOriginale: s.codiceFornitoreNonOriginale.trim(),
    prezzoFornitoreNonOriginale: s.prezzoFornitoreNonOriginale.trim(),
    scontoFornitoreNonOriginale: s.scontoFornitoreNonOriginale.trim(),
  });
}

/** True se il draft differisce dal baseline (es. form vuoto o record caricato). */
export function ricambioFormIsDirty(current: RicambioFormState, baseline: RicambioFormState): boolean {
  return ricambioFormDirtySnapshot(current) !== ricambioFormDirtySnapshot(baseline);
}

/** Messaggio toast quando si tenta di salvare un nuovo ricambio senza alcun input utente. */
export const RICAMBIO_SAVE_EMPTY_FORM_MESSAGE =
  "Compila almeno un campo del ricambio prima di salvarlo in magazzino.";

/** True se il draft è ancora identico al form vuoto iniziale (nessun dato inserito). */
export function ricambioFormHasNoUserInput(
  current: RicambioFormState,
  baseline: RicambioFormState = emptyRicambioForm(),
): boolean {
  return !ricambioFormIsDirty(current, baseline);
}

/** True se l'utente ha inserito almeno un dato significativo (esclude default strutturali). */
export function ricambioFormHasMeaningfulUserInput(f: RicambioFormState): boolean {
  const empty = emptyRicambioForm();
  if (f.marca.trim()) return true;
  if (f.codiceFornitoreOriginale.trim()) return true;
  if (f.codiceFornitoreOriginaleSecondario.trim()) return true;
  if (f.marcaOriginaleSecondaria.trim()) return true;
  if (f.descrizione.trim()) return true;
  if (f.note.trim()) return true;
  if (f.categoria.trim()) return true;
  if (f.compatibilitaMezzi.trim()) return true;
  if (f.compatMarcheAttrezzaturaFiltro.trim()) return true;
  if (f.compatMarcheTelaioFiltro.trim()) return true;
  if (f.usatoInTagliandi) return true;
  if (f.unitaMisura !== RICAMBIO_UNITA_MISURA_DEFAULT) return true;
  if (fornitoriAlternativiFormRowsHaveContent(f.fornitoriAlternativi)) return true;
  if (f.scorta.trim() !== empty.scorta.trim()) return true;
  if (f.scortaMinima.trim() !== empty.scortaMinima.trim()) return true;
  if (f.prezzoFornitoreOriginale.trim() !== empty.prezzoFornitoreOriginale.trim()) return true;
  if (f.scontoFornitoreOriginale.trim() !== empty.scontoFornitoreOriginale.trim()) return true;
  if (
    normalizeMarkupInputString(f.markupPercentuale) !==
    normalizeMarkupInputString(empty.markupPercentuale)
  ) {
    return true;
  }
  return false;
}

/** Conferma uscita nuovo ricambio: solo se c'è input utente, non per drift di default. */
export function ricambioFormNeedsCloseConfirm(
  current: RicambioFormState,
  baseline: RicambioFormState = emptyRicambioForm(),
): boolean {
  return ricambioFormIsDirty(current, baseline) && ricambioFormHasMeaningfulUserInput(current);
}

export function ricambioFromForm(
  f: RicambioFormState,
  id?: string,
  autoreUltimaModifica = MAGAZZINO_DEFAULT_AUTHOR,
  compatExpand?: RicambioCompatExpandOptions,
): RicambioMagazzino | null {
  if (
    !f.marca.trim() ||
    !validateRicambioCodiceRequired(f.codiceFornitoreOriginale) ||
    !f.descrizione.trim() ||
    !f.categoria.trim()
  ) {
    return null;
  }
  return ricambioFromFormLenient(f, id, autoreUltimaModifica, compatExpand);
}

/** Elenco campi “importanti” mancanti o deboli (per avviso UX, non per bloccare). */
export function ricambioFormImportantWarnings(f: RicambioFormState): string[] {
  const w: string[] = [];
  if (!f.codiceFornitoreOriginale.trim()) w.push("codice");
  if (!f.marca.trim()) w.push("marca");
  if (!f.categoria.trim()) w.push("categoria");
  if (!f.descrizione.trim()) w.push("descrizione");
  const listino = Math.max(0, parseFloat(f.prezzoFornitoreOriginale) || 0);
  const hasPrezzoFornitore =
    listino > 0 ||
    fornitoriAlternativiFromFormRows(f.fornitoriAlternativi).some((r) => r.prezzo > 0);
  if (!hasPrezzoFornitore) w.push("prezzo listino");
  return w;
}

export type RicambioLenientPlaceholderFlags = {
  marcaPlaceholder: boolean;
  descrizionePlaceholder: boolean;
  categoriaPlaceholder: boolean;
};

/** Flag segnaposto post-mapping lenient (telemetria interna, non blocca il save). */
export function ricambioLenientPlaceholderFlags(r: RicambioMagazzino): RicambioLenientPlaceholderFlags {
  return {
    marcaPlaceholder: r.marca === RICAMBIO_LENIENT_PLACEHOLDER_MARCA,
    descrizionePlaceholder: r.descrizione === RICAMBIO_LENIENT_PLACEHOLDER_DESCRIZIONE,
    categoriaPlaceholder:
      r.categoria === RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA || !r.categoria.trim(),
  };
}

/** Crea sempre un record: valori vuoti diventano segnaposto coerenti (salvataggio “incompleto”). */
export type RicambioCompatExpandOptions = {
  mezziListe: MezziListePrefs;
};

function resolveCompatibilitaMezziForSave(
  f: RicambioFormState,
  expand?: RicambioCompatExpandOptions,
): string[] {
  const parsed = parseCompatInput(f.compatibilitaMezzi);
  if (!expand) return parsed;
  const expanded = expandRicambioCompatibilitaMezzi(parsed, {
    marcheAttrezzaturaFiltro: parseCompatInput(f.compatMarcheAttrezzaturaFiltro),
    marcheTelaioFiltro: parseCompatInput(f.compatMarcheTelaioFiltro),
    mezziListe: expand.mezziListe,
  });
  // Righe legacy obsolete non devono bloccare il save se i filtri marca espandono compat valida.
  return expanded.filter((line) => isAllowedCompatLine(line, expand.mezziListe));
}

/** Applica espansione marca→universale marca (per validazione e anteprima save). */
export function applyCompatExpansionToFormState(
  f: RicambioFormState,
  mezziListe: MezziListePrefs,
): RicambioFormState {
  const expanded = resolveCompatibilitaMezziForSave(f, { mezziListe });
  return {
    ...f,
    compatibilitaMezzi: expanded.join(", "),
    compatMarcheAttrezzaturaFiltro: "",
    compatMarcheTelaioFiltro: "",
  };
}

export function ricambioFromFormLenient(
  f: RicambioFormState,
  id?: string,
  autoreUltimaModifica = MAGAZZINO_DEFAULT_AUTHOR,
  compatExpand?: RicambioCompatExpandOptions,
): RicambioMagazzino {
  const expanded = resolveCompatibilitaMezziForSave(f, compatExpand);
  let compat: string[];
  let compatRefs: import("@/lib/magazzino/ricambio-compat-resolver").RicambioCompatRef[] | undefined;

  const built = writeCompatibilitaRicambio(
    { compatibilitaMezzi: expanded, compatibilitaRefs: undefined, ricambioId: id },
    compatExpand?.mezziListe,
    "form.ricambioFromFormLenient",
  );
  compat = built.compatibilitaMezzi ?? [];
  compatRefs = built.compatibilitaRefs;
  const ts = new Date().toISOString();
  const listino = Math.max(0, parseFloat(f.prezzoFornitoreOriginale) || 0);
  const markupBase = resolveListinoMarkupBase(listino, fornitoriAlternativiFromFormRows(f.fornitoriAlternativi));
  const markup = clampMarkupPercentuale(parseFloat(String(f.markupPercentuale).replace(",", ".")) || 0);
  const prezzoVendita = prezzoVenditaDaListinoEMarkup(markupBase, markup);
  const codiceSecondario = normalizeRicambioCodice(f.codiceFornitoreOriginaleSecondario.trim());
  const fornitoriAlternativi = fornitoriAlternativiFromFormRows(f.fornitoriAlternativi);
  const partial: RicambioMagazzino = {
    id: id ?? `r-${Date.now()}`,
    marca: f.marca.trim() || RICAMBIO_LENIENT_PLACEHOLDER_MARCA,
    codiceFornitoreOriginale: resolveRicambioCodiceForPersist(f.codiceFornitoreOriginale),
    codiceFornitoreOriginaleSecondario: codiceSecondario,
    marcaOriginaleSecondaria: f.marcaOriginaleSecondaria.trim(),
    usatoInTagliandi: f.usatoInTagliandi,
    unitaMisura: f.unitaMisura,
    descrizione: f.descrizione.trim() || RICAMBIO_LENIENT_PLACEHOLDER_DESCRIZIONE,
    note: f.note.trim(),
    categoria: f.categoria.trim() || RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA,
    compatibilitaMezzi: compat,
    compatibilitaRefs: compatRefs,
    scorta: Math.max(0, parseFloat(f.scorta) || 0),
    scortaMinima: Math.max(0, parseFloat(f.scortaMinima) || 0),
    dataUltimaModifica: ts,
    autoreUltimaModifica: autoreUltimaModifica.trim() || MAGAZZINO_DEFAULT_AUTHOR,
    prezzoFornitoreOriginale: listino,
    scontoFornitoreOriginale: Math.min(100, Math.max(0, parseFloat(f.scontoFornitoreOriginale) || 0)),
    markupPercentuale: markup,
    prezzoVendita,
    fornitoriAlternativi,
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
  };
  syncFlatFornitoreFieldsOnRicambio(partial);
  return partial;
}

function markupToFormString(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const c = clampMarkupPercentuale(n);
  return String(c);
}

export function toFormDraft(
  r: RicambioMagazzino,
  mezziListe?: MezziListePrefs,
): RicambioFormState {
  const compatLabels = mezziListe
    ? readCompatLabelsForUi(r, mezziListe, "form.toFormDraft")
    : normalizeCompatList(r.compatibilitaMezzi);
  const marcheFiltro = mezziListe
    ? deriveMarcheFiltroFromCompatLabels(compatLabels, mezziListe)
    : { attrezzature: [] as string[], telai: [] as string[] };

  return syncPrezzoVenditaInForm({
    marca:
      r.marca === RICAMBIO_LENIENT_PLACEHOLDER_MARCA || !r.marca.trim() ? "" : r.marca,
    codiceFornitoreOriginale: ricambioCodiceForUi(r.codiceFornitoreOriginale),
    codiceFornitoreOriginaleSecondario: r.codiceFornitoreOriginaleSecondario,
    marcaOriginaleSecondaria: r.marcaOriginaleSecondaria,
    usatoInTagliandi: r.usatoInTagliandi,
    unitaMisura: r.unitaMisura,
    descrizione: r.descrizione,
    note: r.note,
    categoria:
      r.categoria === RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA || !r.categoria.trim()
        ? ""
        : r.categoria,
    compatibilitaMezzi: compatLabels.join(", "),
    compatMarcheAttrezzaturaFiltro: marcheFiltro.attrezzature.join(", "),
    compatMarcheTelaioFiltro: marcheFiltro.telai.join(", "),
    scorta: String(r.scorta),
    scortaMinima: String(r.scortaMinima),
    prezzoFornitoreOriginale: String(r.prezzoFornitoreOriginale),
    scontoFornitoreOriginale: String(r.scontoFornitoreOriginale),
    markupPercentuale: markupToFormString(r.markupPercentuale),
    prezzoVendita: String(r.prezzoVendita),
    fornitoriAlternativi: fornitoriAlternativiFormRowsFromRicambio(r),
    fornitoreNonOriginale: r.fornitoreNonOriginale,
    codiceFornitoreNonOriginale: r.codiceFornitoreNonOriginale,
    prezzoFornitoreNonOriginale: String(r.prezzoFornitoreNonOriginale),
    scontoFornitoreNonOriginale: String(r.scontoFornitoreNonOriginale),
  });
}

export type RicambioListFieldOptions = {
  marche: readonly string[];
  categorie: readonly string[];
  /** Elenchi globali magazzino (`app_settings` → `magazzino.master`). */
  fornitori: readonly string[];
  produttori: readonly string[];
  /** Albero attrezzature da `app_settings.mezziListe` — unica fonte compatibilità mezzi. */
  mezziListe: MezziListePrefs;
  /** Flotta V2: merge via `buildRicambioCompatExpandOptions` se non già incluso in `mezziListe`. */
  fleetAttrezzatureTree?: import("@/lib/mezzi/attrezzature-prefs").AttrezzaturaMarca[];
};

/** Etichette «Marca — Modello» ammesse per compatibilità ricambio (attrezzature + telai). */
export function ricambioCompatLabelsFromSettings(mezziListe: MezziListePrefs): string[] {
  const p = migrateMezziListePrefs(mezziListe);
  return [
    ...flattenCompatDaAttrezzature(p),
    ...flattenCompatFromHierarchyTree(p, "telai"),
  ].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a.localeCompare(b, "it"));
}

/** Validazione valori da elenchi globali (marca, categoria, compatibilità). Campi vuoti ammessi. */
export function validateRicambioListFields(
  f: RicambioFormState,
  opts: RicambioListFieldOptions,
): string | null {
  if (f.marca.trim() && !isValueInListOptions(f.marca, opts.marche)) {
    return "Seleziona una marca esistente.";
  }
  if (f.categoria.trim() && !isValueInListOptions(f.categoria, opts.categorie)) {
    return "Seleziona una categoria esistente.";
  }
  for (const row of f.fornitoriAlternativi) {
    if (row.fornitore.trim() && !isValueInListOptions(row.fornitore, opts.fornitori)) {
      return "Seleziona un fornitore alternativo dalle impostazioni globali.";
    }
    if (row.produttore.trim() && !isValueInListOptions(row.produttore, opts.produttori)) {
      return "Seleziona un produttore dalle impostazioni globali.";
    }
  }
  const compatMezziListe = buildRicambioCompatExpandOptions({
    mezziListe: opts.mezziListe,
    fleetAttrezzatureTree: opts.fleetAttrezzatureTree,
  }).mezziListe;
  const fForCompat = applyCompatExpansionToFormState(f, compatMezziListe);
  const compat = parseCompatInput(fForCompat.compatibilitaMezzi);
  if (compat.length > 0) {
    const invalid = compat.filter((x) => !isAllowedCompatLine(x, compatMezziListe));
    if (invalid.length > 0) {
      return `Compatibilità non valida: seleziona solo valori dall'elenco (${invalid[0]}).`;
    }
  }
  return null;
}
