import { buildSearchDocumentMezzo } from "@/lib/search/builders/build-search-document-mezzo";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { SearchDomainConfig } from "@/lib/search/types";

export const mezziSearchConfig: SearchDomainConfig<MezzoGestito> = {
  domain: "mezzi",
  executionMode: "both",
  fields: [
    { kind: "plate", clientField: "targa", serverField: "mezzi.targa", searchable: true, indexed: true, fts: false, trgm: true, exact: true },
    { kind: "customer", clientField: "cliente", serverField: "mezzi.cliente", searchable: true, indexed: true, fts: true, trgm: true, exact: true },
    { kind: "brand", clientField: "marca", serverField: "mezzi.marca_telaio", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
    { kind: "model", clientField: "modello", serverField: "mezzi.modello_telaio", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
    { kind: "generic", clientField: "matricola", serverField: "mezzi.matricola", searchable: true, indexed: true, fts: false, trgm: true, exact: true },
  ],
  buildDocument: buildSearchDocumentMezzo,
};
