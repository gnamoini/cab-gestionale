import assert from "node:assert/strict";
import { buildPreventivoSlaMetrics } from "@/lib/preventivi/preventivo-sla-analytics";
import type { PreventivoRecord } from "@/lib/preventivi/types";

function base(overrides: Partial<PreventivoRecord>): PreventivoRecord {
  return {
    id: "p1",
    numero: "26-0001/1",
    dataCreazione: "2026-08-01T10:00:00Z",
    aggiornatoAt: "2026-08-01T10:00:00Z",
    statoWorkflow: "inviato",
    statoCliente: "pending",
    versione: 1,
    stato: "inviato",
    tipoDocumento: "preventivo",
    lavorazioneId: "lav1",
    lavorazioneOrigine: "attiva",
    cliente: "Test",
    cantiere: "",
    utilizzatore: "",
    macchinaRiassunto: "",
    targa: "",
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
    descrizioneLavorazioniCliente: "",
    descrizioneLavorazioniTecnicaSorgente: "",
    descrizioneGenerataAuto: "",
    righeRicambi: [],
    manodopera: { oreTotali: 0, righeAddetti: [], costoOrario: 0, prezzoOrario: 0, scontoPercent: 0 },
    noteFinali: "",
    totaleRicambi: 0,
    totaleManodopera: 0,
    totaleFinale: 100,
    createdBy: "",
    lastEditedBy: "",
    inviatoAt: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

const metrics = buildPreventivoSlaMetrics([
  base({ statoCliente: "pending" }),
  base({
    id: "p2",
    statoWorkflow: "acquisito",
    statoCliente: "accettato",
    stato: "confermato",
    accettatoAt: "2026-08-01T16:00:00Z",
    metodoAccettazione: "cliente",
  }),
  base({
    id: "p3",
    statoCliente: "rifiutato",
    rifiutatoAt: "2026-08-01T14:00:00Z",
  }),
]);

assert.equal(metrics.inviati, 3);
assert.equal(metrics.inAttesa, 1);
assert.equal(metrics.accettati, 1);
assert.equal(metrics.rifiutati, 1);
assert.equal(metrics.conversionPct, 50);
assert.equal(metrics.avgResponseHours, 5);

console.log("preventivo-sla-analytics.test.ts OK");
