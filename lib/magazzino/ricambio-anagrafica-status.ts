import {
  RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA,
  RICAMBIO_LENIENT_PLACEHOLDER_DESCRIZIONE,
  RICAMBIO_LENIENT_PLACEHOLDER_MARCA,
  fornitoriAlternativiFromFormRows,
  ricambioFormImportantWarnings,
  type RicambioFormState,
} from "@/lib/magazzino/form";
import type { MagazzinoRicambioMeta } from "@/lib/magazzino/magazzino-meta";
import { ricambioCodiceIsPresent } from "@/lib/magazzino/ricambio-codice";
import type { RicambioMagazzino } from "@/lib/magazzino/types";

export type RicambioAnagraficaStatus = "completo" | "incompleto";

export type RicambioOrigineCreazione =
  | "ordine_fornitore"
  | "magazzino"
  | "import"
  | "lavorazione"
  | "preventivo";

const MISSING_FIELD_LABELS: Record<string, string> = {
  codice: "Codice",
  marca: "Marca",
  categoria: "Categoria",
  descrizione: "Descrizione",
  "prezzo listino": "Prezzo listino",
};

export function ricambioAnagraficaMissingFieldLabel(key: string): string {
  return MISSING_FIELD_LABELS[key] ?? key;
}

function hasRicambioCodicePresentUi(r: RicambioMagazzino): boolean {
  if (ricambioCodiceIsPresent(r.codiceFornitoreOriginale)) return true;
  if (ricambioCodiceIsPresent(r.codiceFornitoreOriginaleSecondario)) return true;
  if (ricambioCodiceIsPresent(r.codiceFornitoreNonOriginale)) return true;
  return (r.fornitoriAlternativi ?? []).some((f) => ricambioCodiceIsPresent(f.codice));
}

function hasPrezzoListinoUi(r: RicambioMagazzino): boolean {
  if (r.prezzoFornitoreOriginale > 0) return true;
  if (r.prezzoFornitoreNonOriginale > 0) return true;
  return (r.fornitoriAlternativi ?? []).some((f) => f.prezzo > 0);
}

function isMarcaPlaceholderUi(marca: string): boolean {
  const t = marca.trim();
  return !t || t === RICAMBIO_LENIENT_PLACEHOLDER_MARCA;
}

function isDescrizionePlaceholderUi(descrizione: string): boolean {
  const t = descrizione.trim();
  return !t || t === RICAMBIO_LENIENT_PLACEHOLDER_DESCRIZIONE;
}

function isCategoriaPlaceholderUi(categoria: string): boolean {
  const t = categoria.trim();
  return !t || t === RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA;
}

/** Derive campi mancanti da modello UI — SSOT per badge/filtri (non legge meta.anagraficaStatus). */
export function ricambioAnagraficaMissingFieldsFromUi(r: RicambioMagazzino): string[] {
  const w: string[] = [];
  if (!hasRicambioCodicePresentUi(r)) w.push("codice");
  if (isMarcaPlaceholderUi(r.marca)) w.push("marca");
  if (isCategoriaPlaceholderUi(r.categoria)) w.push("categoria");
  if (isDescrizionePlaceholderUi(r.descrizione)) w.push("descrizione");
  if (!hasPrezzoListinoUi(r)) w.push("prezzo listino");
  return w;
}

/** Derive da form draft — allineato a ricambioFormImportantWarnings + codici alternativi. */
export function ricambioAnagraficaMissingFieldsFromForm(f: RicambioFormState): string[] {
  const base = ricambioFormImportantWarnings(f);
  const hasAltCodice = fornitoriAlternativiFromFormRows(f.fornitoriAlternativi).some((row) =>
    ricambioCodiceIsPresent(row.codice),
  );
  if (!f.codiceFornitoreOriginale.trim() && !hasAltCodice && !f.codiceFornitoreOriginaleSecondario.trim()) {
    if (!base.includes("codice")) base.push("codice");
  } else if (base.includes("codice") && (f.codiceFornitoreOriginale.trim() || hasAltCodice)) {
    return base.filter((x) => x !== "codice");
  }
  return base;
}

export function ricambioAnagraficaMissingFields(
  r: RicambioMagazzino | RicambioFormState,
): string[] {
  if ("fornitoriAlternativi" in r && typeof r.scorta === "number") {
    return ricambioAnagraficaMissingFieldsFromUi(r as RicambioMagazzino);
  }
  return ricambioAnagraficaMissingFieldsFromForm(r as RicambioFormState);
}

/** Derive-only — non consulta meta persistito. */
export function resolveRicambioAnagraficaStatus(
  r: RicambioMagazzino | RicambioFormState,
): RicambioAnagraficaStatus {
  return ricambioAnagraficaMissingFields(r).length > 0 ? "incompleto" : "completo";
}

export function isRicambioAnagraficaIncompleta(r: RicambioMagazzino | RicambioFormState): boolean {
  return resolveRicambioAnagraficaStatus(r) === "incompleto";
}

export function formatRicambioAnagraficaMissingTooltip(
  missing: readonly string[],
): string {
  if (!missing.length) return "";
  const labels = missing.map(ricambioAnagraficaMissingFieldLabel);
  return `Anagrafica incompleta — completa: ${labels.join(", ")}`;
}

/** Ricalcola cache meta su save; origineCreazione solo al primo create se passata. */
export function enrichMagazzinoMetaWithAnagraficaStatus(
  base: MagazzinoRicambioMeta,
  r: RicambioMagazzino,
  options?: {
    origineCreazione?: RicambioOrigineCreazione;
    preserveOrigine?: boolean;
  },
): MagazzinoRicambioMeta {
  const missing = ricambioAnagraficaMissingFieldsFromUi(r);
  const status = missing.length > 0 ? "incompleto" : "completo";
  const origine =
    options?.preserveOrigine
      ? base.origineCreazione
      : (options?.origineCreazione ?? base.origineCreazione);

  return {
    ...base,
    anagraficaStatus: status,
    anagraficaIncompleteFields: missing.length ? [...missing] : undefined,
    ...(origine ? { origineCreazione: origine } : {}),
  };
}
