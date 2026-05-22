import { prezzoVenditaDaListinoEMarkup } from "@/lib/magazzino/calculations";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  flattenCompatDaAttrezzature,
  migrateMezziListePrefs,
} from "@/lib/mezzi/attrezzature-prefs";
import { flattenCompatFromHierarchyTree } from "@/lib/mezzi/hierarchy-list-prefs";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import { isValueInListOptions } from "@/lib/ui/list-select-utils";

const MAGAZZINO_DEFAULT_AUTHOR = "Operatore";

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

export type RicambioFormState = {
  marca: string;
  codiceFornitoreOriginale: string;
  descrizione: string;
  note: string;
  categoria: string;
  compatibilitaMezzi: string;
  scorta: string;
  scortaMinima: string;
  prezzoFornitoreOriginale: string;
  scontoFornitoreOriginale: string;
  markupPercentuale: string;
  /** Allineato al calcolo listino + markup (sola lettura in UI) */
  prezzoVendita: string;
  fornitoreNonOriginale: string;
  codiceFornitoreNonOriginale: string;
  prezzoFornitoreNonOriginale: string;
  scontoFornitoreNonOriginale: string;
};

export function parseCompatInput(s: string): string[] {
  return s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

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
    descrizione: "",
    note: "",
    categoria: "",
    compatibilitaMezzi: "",
    scorta: "0",
    scortaMinima: "0",
    prezzoFornitoreOriginale: "0",
    scontoFornitoreOriginale: "0",
    markupPercentuale: "45",
    prezzoVendita: "0",
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: "0",
    scontoFornitoreNonOriginale: "0",
  });
}

export function ricambioFromForm(f: RicambioFormState, id?: string, autoreUltimaModifica = MAGAZZINO_DEFAULT_AUTHOR): RicambioMagazzino | null {
  if (
    !f.marca.trim() ||
    !f.codiceFornitoreOriginale.trim() ||
    !f.descrizione.trim() ||
    !f.categoria.trim() ||
    parseCompatInput(f.compatibilitaMezzi).length === 0
  ) {
    return null;
  }
  return ricambioFromFormLenient(f, id, autoreUltimaModifica);
}

/** Elenco campi “importanti” mancanti o deboli (per avviso UX, non per bloccare). */
export function ricambioFormImportantWarnings(f: RicambioFormState): string[] {
  const w: string[] = [];
  if (!f.codiceFornitoreOriginale.trim()) w.push("codice");
  if (!f.marca.trim()) w.push("marca");
  if (!f.categoria.trim()) w.push("categoria");
  if (!f.descrizione.trim()) w.push("descrizione");
  if (parseCompatInput(f.compatibilitaMezzi).length === 0) w.push("compatibilità mezzi");
  const listino = Math.max(0, parseFloat(f.prezzoFornitoreOriginale) || 0);
  if (!(listino > 0)) w.push("prezzo listino");
  return w;
}

/** Crea sempre un record: valori vuoti diventano segnaposto coerenti (salvataggio “incompleto”). */
export function ricambioFromFormLenient(
  f: RicambioFormState,
  id?: string,
  autoreUltimaModifica = MAGAZZINO_DEFAULT_AUTHOR,
): RicambioMagazzino {
  const compat = parseCompatInput(f.compatibilitaMezzi);
  const ts = new Date().toISOString();
  const listino = Math.max(0, parseFloat(f.prezzoFornitoreOriginale) || 0);
  const markup = clampMarkupPercentuale(parseFloat(String(f.markupPercentuale).replace(",", ".")) || 0);
  const prezzoVendita = prezzoVenditaDaListinoEMarkup(listino, markup);
  return {
    id: id ?? `r-${Date.now()}`,
    marca: f.marca.trim() || "—",
    codiceFornitoreOriginale: f.codiceFornitoreOriginale.trim() || "—",
    descrizione: f.descrizione.trim() || "Senza descrizione",
    note: f.note.trim(),
    categoria: f.categoria.trim() || "—",
    compatibilitaMezzi: compat.length ? compat : ["—"],
    scorta: Math.max(0, parseFloat(f.scorta) || 0),
    scortaMinima: Math.max(0, parseFloat(f.scortaMinima) || 0),
    dataUltimaModifica: ts,
    autoreUltimaModifica: autoreUltimaModifica.trim() || MAGAZZINO_DEFAULT_AUTHOR,
    prezzoFornitoreOriginale: listino,
    scontoFornitoreOriginale: Math.min(100, Math.max(0, parseFloat(f.scontoFornitoreOriginale) || 0)),
    markupPercentuale: markup,
    prezzoVendita,
    fornitoreNonOriginale: f.fornitoreNonOriginale.trim(),
    codiceFornitoreNonOriginale: f.codiceFornitoreNonOriginale.trim(),
    prezzoFornitoreNonOriginale: Math.max(0, parseFloat(f.prezzoFornitoreNonOriginale) || 0),
    scontoFornitoreNonOriginale: Math.min(100, Math.max(0, parseFloat(f.scontoFornitoreNonOriginale) || 0)),
  };
}

function markupToFormString(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const c = clampMarkupPercentuale(n);
  return String(c);
}

export function toFormDraft(r: RicambioMagazzino): RicambioFormState {
  return syncPrezzoVenditaInForm({
    marca: r.marca,
    codiceFornitoreOriginale: r.codiceFornitoreOriginale,
    descrizione: r.descrizione,
    note: r.note,
    categoria: r.categoria,
    compatibilitaMezzi: r.compatibilitaMezzi.join(", "),
    scorta: String(r.scorta),
    scortaMinima: String(r.scortaMinima),
    prezzoFornitoreOriginale: String(r.prezzoFornitoreOriginale),
    scontoFornitoreOriginale: String(r.scontoFornitoreOriginale),
    markupPercentuale: markupToFormString(r.markupPercentuale),
    prezzoVendita: String(r.prezzoVendita),
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

/** Validazione valori da elenchi globali (marca, categoria, compatibilità). */
export function validateRicambioListFields(
  f: RicambioFormState,
  opts: RicambioListFieldOptions,
): string | null {
  if (!f.marca.trim()) return "Seleziona una marca.";
  if (!isValueInListOptions(f.marca, opts.marche)) return "Seleziona una marca esistente.";
  if (!f.categoria.trim()) return "Seleziona una categoria.";
  if (!isValueInListOptions(f.categoria, opts.categorie)) return "Seleziona una categoria esistente.";
  const compat = parseCompatInput(f.compatibilitaMezzi);
  if (compat.length === 0) return "Seleziona almeno una compatibilità mezzo.";
  const compatAllowed = ricambioCompatLabelsFromSettings(opts.mezziListe);
  const invalid = compat.filter((x) => !isValueInListOptions(x, compatAllowed));
  if (invalid.length > 0) {
    return `Compatibilità non valida: seleziona solo valori dall'elenco (${invalid[0]}).`;
  }
  return null;
}
