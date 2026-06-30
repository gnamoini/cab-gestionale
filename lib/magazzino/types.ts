import type { ListinoImportMeta } from "@/lib/magazzino/listino-import/listino-import-meta";
import type { RicambioCompatRef } from "@/lib/magazzino/ricambio-compat-resolver";
import type { RicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";

export type RicambioFornitoreAlternativo = {
  id: string;
  fornitore: string;
  produttore: string;
  codice: string;
  prezzo: number;
  sconto: number;
};

export interface RicambioMagazzino {
  id: string;
  marca: string;
  codiceFornitoreOriginale: string;
  codiceFornitoreOriginaleSecondario: string;
  /** Marca associata al codice OE secondario (opzionale). */
  marcaOriginaleSecondaria: string;
  /** Ricambio impiegato nelle manutenzioni tagliando. */
  usatoInTagliandi: boolean;
  /** Unità di misura giacenza (pz, lt, metri). */
  unitaMisura: RicambioUnitaMisura;
  descrizione: string;
  note: string;
  categoria: string;
  compatibilitaMezzi: string[];
  /** Riferimenti ID stabili (persistiti in meta); risolti a label via settings. */
  compatibilitaRefs?: RicambioCompatRef[];
  scorta: number;
  scortaMinima: number;
  dataUltimaModifica: string;
  autoreUltimaModifica: string;
  prezzoFornitoreOriginale: number;
  scontoFornitoreOriginale: number;
  /** Markup % sul listino OE: vendita = listino + listino × markup/100 */
  markupPercentuale: number;
  prezzoVendita: number;
  /** Elenco fornitori alternativi (fonte di verità in meta). */
  fornitoriAlternativi: RicambioFornitoreAlternativo[];
  /** Primo fornitore alternativo — mirror per compat / filtri legacy. */
  fornitoreNonOriginale: string;
  codiceFornitoreNonOriginale: string;
  prezzoFornitoreNonOriginale: number;
  scontoFornitoreNonOriginale: number;
  /** Presente se creato da import listino documenti. */
  listinoImport?: ListinoImportMeta;
}

export type SortKeyMagazzino =
  | "marca"
  | "codiceFornitoreOriginale"
  | "descrizione"
  | "categoria"
  | "compatibilitaMezzi"
  | "scorta"
  | "scortaMinima"
  | "dataUltimaModifica"
  | "autoreUltimaModifica"
  | "prezzoVendita"
  | "consumoMedioMensile";
