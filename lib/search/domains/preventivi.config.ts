import { buildSearchDocumentPreventivo } from "@/lib/search/builders/build-search-document-preventivo";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { PreventivoSearchDocumentContext } from "@/lib/preventivi/preventivo-search-document-contract";
import type { SearchDomainConfig } from "@/lib/search/types";

export const preventiviSearchConfig: SearchDomainConfig<
  PreventivoRecord,
  PreventivoSearchDocumentContext | undefined
> = {
  domain: "preventivi",
  executionMode: "server",
  fields: [
    { kind: "document", clientField: "numero", serverField: "preventivi.numero", searchable: true, indexed: true, fts: false, trgm: true, exact: true },
    { kind: "customer", clientField: "cliente", serverField: "preventivi.cliente", searchable: true, indexed: true, fts: true, trgm: true, exact: true },
    { kind: "plate", clientField: "targa", serverField: "preventivi.targa", searchable: true, indexed: true, fts: false, trgm: true, exact: true },
    { kind: "brand", clientField: "marcaAttrezzatura", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
    { kind: "model", clientField: "modelloAttrezzatura", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
    { kind: "description", clientField: "descrizioneLavorazioniCliente", searchable: true, indexed: true, fts: true, trgm: false, exact: false },
    { kind: "description", clientField: "descrizioneLavorazioniTecnicaSorgente", searchable: true, indexed: true, fts: true, trgm: false, exact: false },
    { kind: "note", clientField: "noteFinali", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
    { kind: "operator", clientField: "richiedente", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
    { kind: "code", clientField: "righeRicambi", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
  ],
  buildDocument: buildSearchDocumentPreventivo,
};
