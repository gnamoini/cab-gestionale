import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PREVENTIVO_SEARCH_DOCUMENT_CONTRACT_VERSION,
  PREVENTIVO_SEARCH_DOCUMENT_SOURCES,
  buildPreventivoSearchDocument,
  collectPreventivoSearchRawParts,
} from "@/lib/preventivi/preventivo-search-document-contract";
import { matchSearchString } from "@/lib/search/match";

const ROOT = process.cwd();
const MIGRATION = readFileSync(
  join(ROOT, "supabase/migrations/20261402120000_preventivo_search_document_global.sql"),
  "utf8",
);

assert.ok(
  MIGRATION.includes("build_preventivo_search_document"),
  "migration defines build_preventivo_search_document",
);

for (const source of PREVENTIVO_SEARCH_DOCUMENT_SOURCES) {
  assert.match(
    MIGRATION,
    new RegExp(source.sqlPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `SQL migration missing pattern for source ${source.id}: ${source.sqlPattern}`,
  );
}

assert.equal(PREVENTIVO_SEARCH_DOCUMENT_CONTRACT_VERSION, 1);

// Smoke: contract version comment in migration
assert.match(MIGRATION, /preventivo-search-document-contract/);

// Ogni parte grezza del fixture minimo deve essere ricercabile nel doc TS
import { PREVENTIVO_LIFECYCLE_DEFAULTS } from "@/lib/preventivi/preventivo-lifecycle-defaults";
import type { PreventivoRecord } from "@/lib/preventivi/types";

const fixture: PreventivoRecord = {
  id: "p",
  numero: "N-1",
  dataCreazione: "2026-01-01",
  aggiornatoAt: "2026-01-01",
  ...PREVENTIVO_LIFECYCLE_DEFAULTS,
  tipoDocumento: "consuntivo",
  lavorazioneId: "l",
  lavorazioneOrigine: "attiva",
  cliente: "Cliente",
  cantiere: "",
  utilizzatore: "",
  macchinaRiassunto: "",
  targa: "AA000BB",
  matricola: "",
  nScuderia: "",
  marcaAttrezzatura: "",
  modelloAttrezzatura: "",
  tipoAttrezzatura: "",
  oreLavoro: "",
  tipoTelaio: "",
  marcaTelaio: "",
  modelloTelaio: "",
  km: "",
  livelloCarburante: "",
  richiedente: "",
  descrizioneLavorazioniCliente: "Attività test",
  descrizioneLavorazioniTecnicaSorgente: "",
  descrizioneGenerataAuto: "",
  righeRicambi: [
    {
      id: "r",
      ricambioId: "mag",
      codiceOE: "C-1",
      descrizione: "Ricambio",
      quantita: 1,
      prezzoUnitario: 1,
      scontoPercent: 0,
    },
  ],
  manodopera: {
    oreTotali: 1,
    righeAddetti: [{ addettoId: "a1", addettoLegacy: "Legacy Op", ore: 1 }],
    costoOrario: 1,
    prezzoOrario: 1,
    scontoPercent: 0,
  },
  noteFinali: "Nota",
  totaleRicambi: 1,
  totaleManodopera: 1,
  totaleFinale: 2,
  createdBy: "x",
  lastEditedBy: "x",
};

const ctx = {
  addettiRecords: [{ id: "a1", nome: "Mario", cognome: "Rossi" }],
  lavorazioneCodice: "26-0001",
  ricambiMagazzinoById: new Map([["mag", { codice: "MAG-C", nome: "Da magazzino" }]]),
};

const doc = buildPreventivoSearchDocument(fixture, ctx);
const parts = collectPreventivoSearchRawParts(fixture, ctx);
for (const part of parts) {
  if (part.trim().length < 3) continue;
  assert.equal(matchSearchString(part, doc).matches, true, `missing in TS doc: ${part}`);
}

console.log("preventivo-search-document-parity.test.ts OK");
