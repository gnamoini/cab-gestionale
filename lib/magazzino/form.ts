import { prezzoVenditaDaListinoEMarkup } from "@/lib/magazzino/calculations";
import {
  newFornitoreAlternativoId,
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
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";
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

export function syncPrezzoVenditaInForm(f: RicambioFormState): RicambioFormState {
  const listino = Math.max(0, parseFloat(f.prezzoFornitoreOriginale) || 0);
  const rawM = parseFloat(String(f.markupPercentuale).replace(",", "."));
  const m = clampMarkupPercentuale(Number.isFinite(rawM) ? rawM : 0);
  const pv = prezzoVenditaDaListinoEMarkup(listino, m);
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
    fornitoriAlternativi: [],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: "0",
    scontoFornitoreNonOriginale: "0",
  });
}

export function ricambioFromForm(
  f: RicambioFormState,
  id?: string,
  autoreUltimaModifica = MAGAZZINO_DEFAULT_AUTHOR,
  compatExpand?: RicambioCompatExpandOptions,
): RicambioMagazzino | null {
  if (
    !f.marca.trim() ||
    !f.codiceFornitoreOriginale.trim() ||
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
  if (!(listino > 0)) w.push("prezzo listino");
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
  const markup = clampMarkupPercentuale(parseFloat(String(f.markupPercentuale).replace(",", ".")) || 0);
  const prezzoVendita = prezzoVenditaDaListinoEMarkup(listino, markup);
  const codiceSecondario = normalizeRicambioCodice(f.codiceFornitoreOriginaleSecondario.trim());
  const fornitoriAlternativi = fornitoriAlternativiFromFormRows(f.fornitoriAlternativi);
  const partial: RicambioMagazzino = {
    id: id ?? `r-${Date.now()}`,
    marca: f.marca.trim() || RICAMBIO_LENIENT_PLACEHOLDER_MARCA,
    codiceFornitoreOriginale:
      normalizeRicambioCodice(f.codiceFornitoreOriginale.trim()) || RICAMBIO_LENIENT_PLACEHOLDER_MARCA,
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
    marca: r.marca,
    codiceFornitoreOriginale: r.codiceFornitoreOriginale,
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
    fornitoriAlternativi: fornitoriAlternativiToFormRows(r.fornitoriAlternativi ?? []),
    fornitoreNonOriginale: r.fornitoreNonOriginale,
    codiceFornitoreNonOriginale: r.codiceFornitoreNonOriginale,
    prezzoFornitoreNonOriginale: String(r.prezzoFornitoreNonOriginale),
    scontoFornitoreNonOriginale: String(r.scontoFornitoreNonOriginale),
  });
}

export type RicambioListFieldOptions = {
  marche: readonly string[];
  categorie: readonly string[];
  /** Albero attrezzature da `app_settings.mezziListe` — unica fonte compatibilità mezzi. */
  mezziListe: MezziListePrefs;
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
  const fForCompat = applyCompatExpansionToFormState(f, opts.mezziListe);
  const compat = parseCompatInput(fForCompat.compatibilitaMezzi);
  if (compat.length > 0) {
    const invalid = compat.filter((x) => !isAllowedCompatLine(x, opts.mezziListe));
    if (invalid.length > 0) {
      return `Compatibilità non valida: seleziona solo valori dall'elenco (${invalid[0]}).`;
    }
  }
  return null;
}
