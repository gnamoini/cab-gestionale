import {
  emptyFornitoreAlternativoFormRow,
  emptyRicambioForm,
  fornitoriAlternativiFromFormRows,
  type RicambioFormState,
} from "@/lib/magazzino/form";
import { getScontoFornitoreMarca } from "@/lib/magazzino/marca-fornitore-sconto";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import { normalizeRicambioCodice } from "@/lib/magazzino/ricambio-codice";
import { newFornitoreAlternativoId } from "@/lib/magazzino/ricambio-fornitori-alternativi";

export type OrdineFornitoreQuickRicambioInput = {
  codice: string;
  descrizione: string;
  prezzo: number;
  fornitoreLabel: string;
};

export function ordineFornitoreQuickRicambioHasInput(input: OrdineFornitoreQuickRicambioInput): boolean {
  return Boolean(
    input.codice.trim() ||
      input.descrizione.trim() ||
      input.fornitoreLabel.trim() ||
      input.prezzo > 0,
  );
}

export function validateOrdineFornitoreQuickRicambioInput(
  input: OrdineFornitoreQuickRicambioInput,
): string | null {
  if (!input.codice.trim() && !input.descrizione.trim()) {
    return "Inserisci almeno codice o descrizione.";
  }
  if (!input.fornitoreLabel.trim()) {
    return "Seleziona un fornitore.";
  }
  if (input.prezzo < 0 || !Number.isFinite(input.prezzo)) {
    return "Prezzo non valido.";
  }
  return null;
}

const EMPTY_MAGAZZINO_MASTER: MagazzinoMasterPrefs = {
  marche: [],
  categorie: [],
  mezziCompatibili: [],
  fornitori: [],
  produttori: [],
};

/**
 * Mappa input rapido ordine → RicambioFormState con fornitore in fornitoriAlternativi (SSOT).
 */
export function ordineFornitoreQuickRicambioToFormState(
  input: OrdineFornitoreQuickRicambioInput,
  options?: { marcaDefaultSconto?: string; magazzinoMaster?: MagazzinoMasterPrefs },
): RicambioFormState {
  const fornitore = input.fornitoreLabel.trim();
  const codice = normalizeRicambioCodice(input.codice);
  const prezzo = Math.max(0, input.prezzo);
  const scontoDefault = getScontoFornitoreMarca(
    options?.magazzinoMaster ?? EMPTY_MAGAZZINO_MASTER,
    options?.marcaDefaultSconto ?? "",
  );

  const altRow = {
    ...emptyFornitoreAlternativoFormRow(),
    id: newFornitoreAlternativoId(),
    fornitore,
    codice,
    prezzo: String(prezzo),
    sconto: String(scontoDefault),
  };

  const base = emptyRicambioForm();
  return {
    ...base,
    descrizione: input.descrizione.trim(),
    fornitoriAlternativi: [altRow],
    fornitoreNonOriginale: fornitore,
    codiceFornitoreNonOriginale: codice,
    prezzoFornitoreNonOriginale: String(prezzo),
    scontoFornitoreNonOriginale: String(scontoDefault),
  };
}

/** Verifica coerenza: fornitore alternativo persistibile con codice/prezzo inseriti. */
export function ordineFornitoreQuickRicambioFornitoreRows(
  input: OrdineFornitoreQuickRicambioInput,
  options?: { marcaDefaultSconto?: string; magazzinoMaster?: MagazzinoMasterPrefs },
): ReturnType<typeof fornitoriAlternativiFromFormRows> {
  const form = ordineFornitoreQuickRicambioToFormState(input, options);
  return fornitoriAlternativiFromFormRows(form.fornitoriAlternativi);
}
