import assert from "node:assert/strict";
import {
  buildLogModificaSummary,
  sanitizeIsoDatesInModificaLine,
  tryFormatIsoLikeForLog,
} from "@/lib/gestionale-log/log-summary";

assert.equal(tryFormatIsoLikeForLog("2026-07-02"), "02/07/2026");
assert.equal(tryFormatIsoLikeForLog("Custom_1"), null);

const archivedLine = sanitizeIsoDatesInModificaLine(
  'Data archivio impostato a "2026-07-02T14:59:56.98+00:00"',
);
assert.match(archivedLine, /Data archivio impostato a [“"]02\/07\/2026, \d{2}:\d{2}[”"]/);

const cached = buildLogModificaSummary({
  entita: "lavorazioni",
  entita_id: "lav-1",
  azione: "UPDATE",
  payload: {
    summary: {
      tipoRiga: "AGGIORNAMENTO LAVORAZIONE",
      oggettoRiga: "Cliente · Mezzo",
      modifiche: [
        'Data uscita impostato a "2026-07-02"',
        'Data archivio impostato a "2026-07-02T14:59:56.98+00:00"',
      ],
    },
  },
});

assert.match(cached.modifiche[0]!, /02\/07\/2026/);
assert.match(cached.modifiche[1]!, /02\/07\/2026, \d{2}:\d{2}/);
assert.doesNotMatch(cached.modifiche[1]!, /T14:59/);

console.log("log-summary-dates.test.ts OK");
