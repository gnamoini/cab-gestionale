import assert from "node:assert/strict";
import { test } from "node:test";
import { PREVENTIVO_LIFECYCLE_DEFAULTS } from "@/lib/preventivi/preventivo-lifecycle-defaults";
import {
  buildPreventivoSearchDocument,
  collectPreventivoSearchRawParts,
} from "@/lib/preventivi/preventivo-search-document-contract";
import {
  preventivoRowMatchesGlobalSearch,
  preventivoRowSearchHaystack,
} from "@/lib/preventivi/preventivi-list-ui-filters";
import { matchSearchString } from "@/lib/search/match";
import type { PreventivoRecord } from "@/lib/preventivi/types";

const ADDETTI = [{ id: "a-mario", nome: "Mario", cognome: "Rossi" }] as const;

function basePreventivo(overrides: Partial<PreventivoRecord> = {}): PreventivoRecord {
  return {
    id: "prev-1",
    numero: "2026-042",
    dataCreazione: "2026-03-15",
    aggiornatoAt: "2026-03-15T10:00:00.000Z",
    ...PREVENTIVO_LIFECYCLE_DEFAULTS,
    tipoDocumento: "preventivo",
    lavorazioneId: "lav-uuid-1",
    lavorazioneOrigine: "attiva",
    cliente: "ACME Srl",
    cantiere: "Cantiere Nord",
    utilizzatore: "Ufficio tecnico",
    macchinaRiassunto: "IVECO 123",
    targa: "AB123CD",
    matricola: "MAT-99",
    nScuderia: "SC-7",
    marcaAttrezzatura: "CAT",
    modelloAttrezzatura: "320",
    tipoAttrezzatura: "",
    oreLavoro: "",
    tipoTelaio: "Autocarro",
    marcaTelaio: "IVECO",
    modelloTelaio: "Daily",
    km: "120000",
    livelloCarburante: "1/2",
    richiedente: "Bianchi",
    descrizioneLavorazioniCliente: "Sostituzione filtro olio",
    descrizioneLavorazioniTecnicaSorgente: "Filtro olio motore",
    descrizioneGenerataAuto: "",
    righeRicambi: [
      {
        id: "r1",
        ricambioId: "mag-1",
        codiceOE: "FIL-XYZ",
        descrizione: "Filtro olio XYZ",
        quantita: 1,
        prezzoUnitario: 25,
        scontoPercent: 0,
      },
    ],
    manodopera: {
      oreTotali: 2,
      righeAddetti: [{ addettoId: "a-mario", ore: 2 }],
      costoOrario: 30,
      prezzoOrario: 50,
      scontoPercent: 0,
    },
    noteFinali: "Verificare perdite",
    totaleRicambi: 25,
    totaleManodopera: 100,
    totaleFinale: 125,
    createdBy: "op",
    lastEditedBy: "op",
    ...overrides,
  };
}

const searchCtx = {
  addettiRecords: [...ADDETTI],
  lavorazioneCodice: "26-0042",
  ricambiMagazzinoById: new Map([["mag-1", { codice: "MAG-FIL", nome: "Filtro magazzino" }]]),
};

function matches(query: string, row: PreventivoRecord): boolean {
  return preventivoRowMatchesGlobalSearch(row, query, searchCtx);
}

test("1 — Preventivo trova tutti i preventivi per tipo", () => {
  const prev = basePreventivo();
  const cons = basePreventivo({ id: "prev-2", numero: "2026-043", tipoDocumento: "consuntivo" });
  assert.equal(matches("Preventivo", prev), true);
  assert.equal(matches("Preventivo", cons), false);
});

test("2 — Consuntivo trova consuntivi", () => {
  const cons = basePreventivo({ tipoDocumento: "consuntivo" });
  assert.equal(matches("Consuntivo", cons), true);
});

test("3 — cons prefix trova consuntivi", () => {
  const cons = basePreventivo({ tipoDocumento: "consuntivo" });
  assert.equal(matches("cons", cons), true);
});

test("4 — codice ricambio snapshot", () => {
  assert.equal(matches("FIL-XYZ", basePreventivo()), true);
});

test("5 — descrizione ricambio", () => {
  assert.equal(matches("Filtro olio XYZ", basePreventivo()), true);
});

test("6 — attività lavorazione in descrizione", () => {
  assert.equal(matches("Sostituzione filtro", basePreventivo()), true);
});

test("7 — nome addetto risolto da id", () => {
  assert.equal(matches("Mario Rossi", basePreventivo()), true);
});

test("7b — addettoLegacy sempre indicizzato", () => {
  const row = basePreventivo({
    manodopera: {
      oreTotali: 1,
      righeAddetti: [{ addettoId: null, addettoLegacy: "Luigi Verdi", ore: 1 }],
      costoOrario: 30,
      prezzoOrario: 50,
      scontoPercent: 0,
    },
  });
  assert.equal(matches("Luigi Verdi", row), true);
});

test("8 — mezzo macchinaRiassunto", () => {
  assert.equal(matches("IVECO 123", basePreventivo()), true);
});

test("9 — targa", () => {
  assert.equal(matches("AB123CD", basePreventivo()), true);
});

test("10 — cliente", () => {
  assert.equal(matches("ACME", basePreventivo()), true);
});

test("11 — numero documento", () => {
  assert.equal(matches("2026-042", basePreventivo()), true);
});

test("12 — dato in dettaglio noteFinali", () => {
  assert.equal(matches("perdite", basePreventivo()), true);
});

test("13 — termine inesistente", () => {
  assert.equal(matches("zzznonesuch", basePreventivo()), false);
});

test("14 — ricerca vuota match all", () => {
  const doc = preventivoRowSearchHaystack(basePreventivo(), searchCtx);
  assert.equal(matchSearchString("", doc).matches, true);
});

test("15 — RBAC invariato: fetch path non toccato (smoke import authorized)", async () => {
  const mod = await import("@/lib/preventivi/preventivi-list-fetch-authorized");
  assert.equal(typeof mod.fetchPreventiviRecordsAuthorized, "function");
});

test("ricambio storico — magazzino quando snapshot vuoto", () => {
  const row = basePreventivo({
    righeRicambi: [
      {
        id: "r1",
        ricambioId: "mag-1",
        codiceOE: "",
        descrizione: "",
        quantita: 1,
        prezzoUnitario: 10,
        scontoPercent: 0,
      },
    ],
  });
  assert.equal(matches("MAG-FIL", row), true);
  assert.equal(matches("Filtro magazzino", row), true);
});

test("parity raw parts — ogni parte grezza è ricercabile nel documento", () => {
  const row = basePreventivo();
  const doc = buildPreventivoSearchDocument(row, searchCtx);
  const parts = collectPreventivoSearchRawParts(row, searchCtx);
  for (const part of parts) {
    if (part.trim().length < 3) continue;
    assert.equal(
      matchSearchString(part, doc).matches,
      true,
      `parte non trovata nel documento: ${part}`,
    );
  }
});

test("codice lavorazione da ctx", () => {
  assert.equal(matches("26-0042", basePreventivo()), true);
});
