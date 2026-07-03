import assert from "node:assert/strict";
import { rankOperativeHistoryFromContext, shouldPreferHistory } from "./history-ranker";

const candidates = rankOperativeHistoryFromContext({
  technicalBlob: "Sostituzione pinza freno anteriore",
  mezzoId: "m1",
  cliente: "Cliente A",
  ctx: {
    cliente: "Cliente A",
    targa: "AB123CD",
    matricola: "",
    existingPreventiviRecords: [
      {
        id: "p1",
        cliente: "Cliente A",
        targa: "AB123CD",
        descrizioneLavorazioniTecnicaSorgente: "Sostituzione pinza freno",
        descrizioneLavorazioniCliente: "Sostituzione pinza freno anteriore",
        aggiornatoAt: "2026-06-01T00:00:00Z",
      } as import("@/lib/preventivi/types").PreventivoRecord,
    ],
  },
});

assert.ok(candidates.length >= 1);
assert.equal(candidates[0]?.tier, "same_mezzo");
assert.ok(shouldPreferHistory(candidates[0], 0.3));

console.log("operative-history.test.ts OK");
