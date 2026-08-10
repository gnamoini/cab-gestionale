/**
 * Island render budget + hot-path parse-once filter check.
 */
import assert from "node:assert/strict";
import { filterMezziGestiti } from "@/lib/mezzi/mezzi-list-fetch";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  buildLavorazioniHaystackIndex,
  lavRowMatchesPageFiltersIndexed,
} from "@/lib/lavorazioni/lavorazioni-filter-search-index";
import { LAVORAZIONI_ADVANCED_FILTERS_EMPTY } from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import { magazzinoRowMatchesPageFiltersIndexed } from "@/lib/magazzino/magazzino-filter-search-index";
import { MAGAZZINO_ADVANCED_FILTERS_EMPTY } from "@/lib/magazzino/magazzino-advanced-filters";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { matchSearchStringPreparedFromRaw } from "@/lib/search/match";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import {
  forceSearchHotPathProbe,
  getSearchHotPathCounters,
  resetSearchHotPathCounters,
} from "@/lib/search/search-hot-path-probe";
import { assertSearchPerfBudget, mergeRenderCounters } from "@/lib/search/search-perf-harness";
import {
  forceSearchRenderProbe,
  getSearchRenderCounters,
  probeIslandRender,
  probeParentRender,
  resetSearchRenderCounters,
} from "@/lib/search/search-render-probe";

function makeMezzo(id: string, targa: string, cliente: string): MezzoGestito {
  return {
    id,
    cliente,
    utilizzatore: "",
    cantiere: "",
    tipoAttrezzatura: "tipo",
    marca: "IVECO",
    modello: "X",
    matricola: "",
    targa,
    numeroScuderia: null,
    marcaTelaio: null,
    modelloTelaio: null,
    tipoTelaio: null,
    vin: null,
    hubSynthetic: false,
    attrezzature: [],
  } as unknown as MezzoGestito;
}

forceSearchHotPathProbe(true);
forceSearchRenderProbe(true);
resetSearchRenderCounters();

// Simulate island: parent only notified on applied (not per keystroke).
let parentRenders = 0;
let appliedUpdates = 0;

function simulateParentWithIsland(typingChars: number) {
  parentRenders = 0;
  appliedUpdates = 0;
  probeParentRender();
  parentRenders += 1;

  for (let i = 0; i < typingChars; i += 1) {
    probeIslandRender();
    // island local render — parent untouched
  }

  appliedUpdates += 1;
  probeParentRender();
  parentRenders += 1;
}

simulateParentWithIsland(6);

const renderSnapshot = mergeRenderCounters(getSearchRenderCounters(), getSearchHotPathCounters(), appliedUpdates);

assertSearchPerfBudget(renderSnapshot, {
  maxParentRendersOnKeystrokeOnly: 2,
  maxSearchAppliedPerBurst: 1,
  minIslandRenders: 6,
});

assert.equal(parentRenders, 2, "parent renders only on mount + applied");

resetSearchHotPathCounters();
const rows = Array.from({ length: 200 }, (_, i) =>
  makeMezzo(`m-${i}`, `TG${i}`, i % 3 === 0 ? "CEREBA MOTORS" : "Cliente"),
);

const before = getSearchHotPathCounters();
filterMezziGestiti(rows, { search: "CEREBA" });
const after = getSearchHotPathCounters();

assert.ok(after.parseQueryCalls - before.parseQueryCalls <= 2, "mezzi parse calls bounded per filter pass");

function makeLavorazione(id: string, cliente: string): LavorazioneListRow {
  return {
    id,
    cliente,
    stato: "in_lavorazione",
    priorita: "normale",
    created_at: "2026-01-01T00:00:00Z",
    data_ingresso: "2026-01-01",
  } as unknown as LavorazioneListRow;
}

function makeRicambio(id: string, descrizione: string): RicambioMagazzino {
  return {
    id,
    descrizione,
    marca: "MARCA",
    scorta: 1,
    scortaMinima: 0,
    codiceFornitoreOriginale: `COD-${id}`,
  } as RicambioMagazzino;
}

resetSearchHotPathCounters();
const lavRows = Array.from({ length: 200 }, (_, i) =>
  makeLavorazione(`lav-${i}`, i % 3 === 0 ? "CEREBA MOTORS" : "Cliente"),
);
const lavHaystack = buildLavorazioniHaystackIndex(lavRows);
const lavPrepared = matchSearchStringPreparedFromRaw("CEREBA");
assert.ok(lavPrepared);
const lavBefore = getSearchHotPathCounters();
for (const row of lavRows) {
  lavRowMatchesPageFiltersIndexed(
    row,
    { search: "CEREBA", ...LAVORAZIONI_ADVANCED_FILTERS_EMPTY },
    lavHaystack,
    undefined,
    "in_corso",
    undefined,
    { preparedSearch: lavPrepared },
  );
}
const lavAfter = getSearchHotPathCounters();
assert.ok(lavAfter.parseQueryCalls - lavBefore.parseQueryCalls <= 2, "lavorazioni parse calls bounded");

resetSearchHotPathCounters();
const magRows = Array.from({ length: 200 }, (_, i) =>
  makeRicambio(`p-${i}`, i % 3 === 0 ? "CEREBA FILTER" : "Altro pezzo"),
);
const magHaystack = new Map<string, string>();
for (const row of magRows) {
  magHaystack.set(row.id, row.descrizione.toLowerCase());
}
const magPrepared = matchSearchStringPreparedFromRaw("CEREBA");
assert.ok(magPrepared);
const magBefore = getSearchHotPathCounters();
for (const row of magRows) {
  magazzinoRowMatchesPageFiltersIndexed(
    row,
    {
      search: "CEREBA",
      soloSottoScorta: false,
      nascondiScortaZero: false,
      ...MAGAZZINO_ADVANCED_FILTERS_EMPTY,
    },
    magHaystack,
    undefined,
    { preparedSearch: magPrepared },
  );
}
const magAfter = getSearchHotPathCounters();
assert.ok(magAfter.parseQueryCalls - magBefore.parseQueryCalls <= 2, "magazzino parse calls bounded");

console.log("search-perf-benchmark.test.tsx OK");
