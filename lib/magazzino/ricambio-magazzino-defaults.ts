import type { RicambioMagazzino } from "@/lib/magazzino/types";

/** Valori base per test e fixture (campi obbligatori del modello UI). */
export function defaultRicambioMagazzinoFields(
  overrides: Partial<RicambioMagazzino> = {},
): RicambioMagazzino {
  return {
    id: "r-test",
    marca: "—",
    codiceFornitoreOriginale: "—",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    descrizione: "—",
    note: "",
    categoria: "Generale",
    compatibilitaMezzi: [],
    scorta: 0,
    scortaMinima: 0,
    dataUltimaModifica: "2026-01-01T00:00:00.000Z",
    autoreUltimaModifica: "Sistema",
    prezzoFornitoreOriginale: 0,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 0,
    fornitoriAlternativi: [],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
    ...overrides,
  };
}
