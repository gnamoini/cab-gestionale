import assert from "node:assert/strict";
import {
  agingBacklogChartPoints,
  buildAgingBacklogBuckets,
  buildIngressiChiusureMonthlyPoints,
  listInterventiOltreSla,
} from "./lavorazioni-work-orders";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";

const anchor = new Date("2026-07-20T12:00:00");

function lav(partial: Partial<LavorazioneAttiva> & Pick<LavorazioneAttiva, "id" | "dataIngresso">): LavorazioneAttiva {
  return {
    macchina: "Trattore",
    targa: "AA001",
    matricola: "",
    nScuderia: "",
    cliente: "Cliente A",
    utilizzatore: "",
    cantiere: "",
    statoId: "in_lavorazione",
    priorita: "media",
    addetto: "",
    noteInterne: "",
    dataCompletamento: null,
    ...partial,
  };
}

const buckets = buildAgingBacklogBuckets(
  [
    lav({ id: "1", dataIngresso: "2026-07-18T10:00:00Z" }),
    lav({ id: "2", dataIngresso: "2026-06-01T10:00:00Z" }),
  ],
  anchor,
);
assert.equal(buckets["0-7"], 1);
assert.equal(buckets["30+"], 1);

const sla = listInterventiOltreSla(
  [lav({ id: "late", dataIngresso: "2026-06-01T10:00:00Z", codice: "26-0099" })],
  new Map([["in_lavorazione", "In lavorazione"]]),
  anchor,
);
assert.equal(sla.length, 1);
assert.equal(sla[0]!.codice, "26-0099");

const points = buildIngressiChiusureMonthlyPoints([], [], [], {
  start: new Date("2026-07-01"),
  end: new Date("2026-07-31"),
});
assert.equal(points.length, 1);
assert.equal(points[0]!.ingressi, 0);
assert.equal(points[0]!.saldoCumulativo, 0);

assert.equal(agingBacklogChartPoints([]).length, 4);

console.log("lavorazioni-work-orders.test.ts OK");
