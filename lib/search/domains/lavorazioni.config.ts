import { buildSearchDocumentLavorazione } from "@/lib/search/builders/build-search-document-lavorazione";
import type { SearchDomainConfig } from "@/lib/search/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

const F = (
  kind: SearchDomainConfig["fields"][number]["kind"],
  clientField: string,
  serverField?: string,
  overrides?: Partial<SearchDomainConfig["fields"][number]>,
) =>
  ({
    kind,
    clientField,
    serverField,
    searchable: true,
    indexed: true,
    fts: kind === "description" || kind === "note",
    trgm: kind !== "description" && kind !== "note",
    exact: kind === "code" || kind === "plate" || kind === "document",
    ...overrides,
  }) satisfies SearchDomainConfig["fields"][number];

export const lavorazioniSearchConfig: SearchDomainConfig<
  LavorazioneListRow,
  LavorazioneSchedeStore | undefined
> = {
  domain: "lavorazioni",
  executionMode: "both",
  fields: [
    F("code", "codice", "lavorazioni.codice"),
    F("plate", "mezzo.targa", "mezzi.targa"),
    F("document", "codice", "lavorazioni.codice"),
    F("customer", "schede.ingresso.cliente", "mezzi.cliente"),
    F("brand", "mezzo.marca_telaio", "mezzi.marca_telaio"),
    F("model", "mezzo.modello_telaio", "mezzi.modello_telaio"),
    F("description", "schede.lavorazioni.righe", "scheda_lavorazione.contenuto"),
    F("note", "note", "lavorazioni.note"),
    F("operator", "schede.lavorazioni.addetti", "scheda_lavorazione.contenuto"),
  ],
  buildDocument: buildSearchDocumentLavorazione,
};
