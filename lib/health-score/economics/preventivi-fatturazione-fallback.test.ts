import assert from "node:assert/strict";
import {
  resolveHealthScoreEconomicAmount,
  sumPreventiviEconomiciInRange,
} from "@/lib/health-score/economics/preventivi-fatturazione-fallback";
import type { PreventivoRecord } from "@/lib/preventivi/types";

const range = {
  start: new Date("2026-06-01T00:00:00"),
  end: new Date("2026-06-30T23:59:59.999"),
};

const preventivo = (partial: Partial<PreventivoRecord>): PreventivoRecord =>
  ({
    id: "p1",
    numero: "1",
    dataCreazione: "2026-06-10",
    aggiornatoAt: "2026-06-10",
    statoWorkflow: "inviato",
    inviatoAt: "2026-06-10T10:00:00.000Z",
    totaleFinale: 10_000,
    versione: 1,
    tipoDocumento: "preventivo",
    lavorazioneId: "l1",
    lavorazioneOrigine: "attiva",
    cliente: "Cliente",
    cantiere: "",
    utilizzatore: "",
    macchinaRiassunto: "",
    targa: "",
    matricola: "",
    nScuderia: "",
    marcaAttrezzatura: "",
    modelloAttrezzatura: "",
    manodopera: { oreTotali: 0, righeAddetti: [], costoOrario: 0, prezzoOrario: 0, scontoPercent: 0 },
    righeRicambi: [],
    totaleRicambi: 0,
    totaleManodopera: 0,
    ...partial,
  }) as PreventivoRecord;

assert.equal(sumPreventiviEconomiciInRange([preventivo({})], range), 10_000);
assert.equal(sumPreventiviEconomiciInRange([preventivo({ statoWorkflow: "bozza" })], range), 0);

assert.equal(resolveHealthScoreEconomicAmount(0, 10_000, true), 10_000);
assert.equal(resolveHealthScoreEconomicAmount(0, 10_000, false), 0);
assert.equal(resolveHealthScoreEconomicAmount(5_000, 10_000, true), 5_000);

console.log("preventivi-fatturazione-fallback.test.ts OK");
