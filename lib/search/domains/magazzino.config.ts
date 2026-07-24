import { buildSearchDocumentMagazzino } from "@/lib/search/builders/build-search-document-magazzino";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { SearchDomainConfig } from "@/lib/search/types";

export const magazzinoSearchConfig: SearchDomainConfig<RicambioMagazzino, MezziListePrefs | undefined> = {
  domain: "magazzino",
  executionMode: "server",
  fields: [
    { kind: "code", clientField: "codice", serverField: "magazzino_ricambi.codice", searchable: true, indexed: true, fts: false, trgm: true, exact: true },
    { kind: "code", clientField: "codiceFornitoreOriginale", searchable: true, indexed: true, fts: false, trgm: true, exact: true },
    { kind: "description", clientField: "descrizione", serverField: "magazzino_ricambi.nome", searchable: true, indexed: true, fts: true, trgm: true, exact: false },
    { kind: "category", clientField: "categoria", searchable: true, indexed: true, fts: true, trgm: true, exact: false },
    { kind: "brand", clientField: "marca", serverField: "magazzino_ricambi.marca", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
    { kind: "location", clientField: "ubicazione", searchable: true, indexed: true, fts: false, trgm: true, exact: false },
    { kind: "note", clientField: "note", searchable: true, indexed: true, fts: true, trgm: false, exact: false },
  ],
  buildDocument: buildSearchDocumentMagazzino,
};
