/** Modello nel catalogo documenti (da impostazioni mezzi + anagrafica). */
export interface CatalogMacchina {
  id: string;
  nome: string;
}

/** Marca nel catalogo documenti (da impostazioni mezzi + anagrafica). */
export interface CatalogMarca {
  id: string;
  nome: string;
  macchine: CatalogMacchina[];
}
