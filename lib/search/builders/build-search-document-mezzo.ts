import type { MezzoGestito } from "@/lib/mezzi/types";
import { buildSearchDocumentFromParts } from "@/lib/search/build-document";

export function buildSearchDocumentMezzo(g: MezzoGestito): string {
  return buildSearchDocumentFromParts([
    g.cliente,
    g.utilizzatore,
    g.cantiere,
    g.tipoAttrezzatura,
    g.marca,
    g.modello,
    g.matricola,
    g.targa,
    g.numeroScuderia,
    g.marcaTelaio,
    g.modelloTelaio,
    g.tipoTelaio,
    g.vin,
  ]);
}
