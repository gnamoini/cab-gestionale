/**
 * Tier 0 search probe — writes parse/filter counters for Mezzi vs Lavorazioni vs Magazzino.
 * Run: npx tsx scripts/ops/search-hot-path-probe-report.ts
 */
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { filterMezziGestiti } from "@/lib/mezzi/mezzi-list-fetch";
import {
  buildLavorazioniHaystackIndex,
  lavRowMatchesPageFiltersIndexed,
} from "@/lib/lavorazioni/lavorazioni-filter-search-index";
import { LAVORAZIONI_ADVANCED_FILTERS_EMPTY } from "@/lib/lavorazioni/lavorazioni-advanced-filters";
import { magazzinoRowMatchesPageFiltersIndexed } from "@/lib/magazzino/magazzino-filter-search-index";
import { MAGAZZINO_ADVANCED_FILTERS_EMPTY } from "@/lib/magazzino/magazzino-advanced-filters";
import { matchSearchStringPreparedFromRaw } from "@/lib/search/match";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import {
  forceSearchHotPathProbe,
  getSearchHotPathCounters,
  resetSearchHotPathCounters,
} from "@/lib/search/search-hot-path-probe";

const QUERY = "CEREBA";
const ROW_COUNT = 200;
const OUT = join(process.cwd(), "test-results", "search-hot-path-probe.json");

function benchFilterPass(
  label: string,
  run: () => void,
): { label: string; parseQueryCalls: number; documentBuildCalls: number; filterCpuMs: number } {
  resetSearchHotPathCounters();
  const before = getSearchHotPathCounters();
  const t0 = performance.now();
  run();
  const elapsed = performance.now() - t0;
  const after = getSearchHotPathCounters();
  return {
    label,
    parseQueryCalls: after.parseQueryCalls - before.parseQueryCalls,
    documentBuildCalls: after.documentBuildCalls - before.documentBuildCalls,
    filterCpuMs: Math.round((after.filterCpuMs - before.filterCpuMs + elapsed) * 100) / 100,
  };
}

forceSearchHotPathProbe(true);

const mezziRows: MezzoGestito[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: `m-${i}`,
  cliente: i % 3 === 0 ? "CEREBA MOTORS" : "Cliente",
  utilizzatore: "",
  cantiere: "",
  tipoAttrezzatura: "tipo",
  marca: "IVECO",
  modello: "X",
  matricola: "",
  targa: `TG${i}`,
  anno: 2020,
  oreKm: 0,
  statoAttuale: "operativo",
  dataUltimaUscita: "2026-01-01",
  note: "",
  priorita: "normale" as const,
  hubSynthetic: false,
}));

const lavRows = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: `lav-${i}`,
  cliente: i % 3 === 0 ? "CEREBA MOTORS" : "Cliente",
  stato: "in_lavorazione",
  priorita: "normale",
  created_at: "2026-01-01T00:00:00Z",
  data_ingresso: "2026-01-01",
})) as unknown as LavorazioneListRow[];

const magRows = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: `p-${i}`,
  descrizione: i % 3 === 0 ? "CEREBA FILTER" : "Altro pezzo",
  marca: "MARCA",
  scorta: 1,
  scortaMinima: 0,
  codiceFornitoreOriginale: `COD-${i}`,
})) as unknown as RicambioMagazzino[];

const prepared = matchSearchStringPreparedFromRaw(QUERY);
assert.ok(prepared);

const results = [
  benchFilterPass("mezzi", () => {
    filterMezziGestiti(mezziRows, { search: QUERY });
  }),
  benchFilterPass("lavorazioni_indexed", () => {
    const haystack = buildLavorazioniHaystackIndex(lavRows);
    for (const row of lavRows) {
      lavRowMatchesPageFiltersIndexed(
        row,
        { search: QUERY, ...LAVORAZIONI_ADVANCED_FILTERS_EMPTY },
        haystack,
        undefined,
        "in_corso",
        undefined,
        { preparedSearch: prepared },
      );
    }
  }),
  benchFilterPass("magazzino_indexed", () => {
    const haystack = new Map<string, string>();
    for (const row of magRows) {
      haystack.set(row.id, row.descrizione.toLowerCase());
    }
    for (const row of magRows) {
      magazzinoRowMatchesPageFiltersIndexed(
        row,
        {
          search: QUERY,
          soloSottoScorta: false,
          nascondiScortaZero: false,
          ...MAGAZZINO_ADVANCED_FILTERS_EMPTY,
        },
        haystack,
        undefined,
        { preparedSearch: prepared },
      );
    }
  }),
];

const payload = {
  generatedAt: new Date().toISOString(),
  query: QUERY,
  rowCount: ROW_COUNT,
  parseBudgetPerPass: 2,
  results,
};

mkdirSync(join(process.cwd(), "test-results"), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`search-hot-path-probe-report: wrote ${OUT}`);
for (const r of results) {
  console.log(
    `${r.label}: parse=${r.parseQueryCalls} docBuild=${r.documentBuildCalls} filterCpuMs=${r.filterCpuMs}`,
  );
}
