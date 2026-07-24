import assert from "node:assert/strict";
import { auditDataQuality, DATA_QUALITY_THRESHOLDS } from "@/lib/report/recidivita/data-quality-audit";
import {
  computeOperatorAttributionPrecision,
  resolveOperatorIdentity,
} from "@/lib/report/recidivita/resolve-operator-identity";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";

const addetti: AddettoRecord[] = [
  { id: "123", nome: "Mario", cognome: "Rossi" },
  { id: "456", nome: "Luigi", cognome: "Bianchi" },
];

const mario = resolveOperatorIdentity("Mario Rossi", addetti);
assert.equal(mario.addettoId, "123");
assert.equal(mario.confidence, "high");

const initial = resolveOperatorIdentity("M.Rossi", addetti);
assert.equal(initial.addettoId, "123");
assert.equal(initial.confidence, "medium");

const unknown = resolveOperatorIdentity("Mario Bianchi", addetti);
assert.equal(unknown.addettoId, null);
assert.equal(unknown.confidence, "unknown");

const precision = computeOperatorAttributionPrecision([
  mario,
  initial,
  unknown,
]);
assert.ok(precision > 60 && precision < 70);

const audit = auditDataQuality({
  lavRows: [
    {
      id: "l1",
      mezzo_id: null,
      data_uscita: null,
      deleted_at: null,
      stato: "completata",
      archived: true,
    } as never,
    {
      id: "l2",
      mezzo_id: "m1",
      data_uscita: "2026-01-15",
      deleted_at: null,
      stato: "completata",
      archived: true,
    } as never,
  ],
  schedeStore: {
    l2: {
      lavorazioneId: "l2",
      ingresso: { tipo: "ingresso" } as never,
      lavorazioni: null,
      ricambi: { tipo: "ricambi", campi: { righe: [{ id: "r1" }] } } as never,
    },
  },
  movimenti: [],
  addettiRecords: addetti,
});

assert.equal(audit.totalEpisodes, 2);
assert.equal(audit.withoutMezzoId, 1);
assert.ok(audit.warnings.length > 0);
assert.ok(DATA_QUALITY_THRESHOLDS.mezzoIdMissingPct >= 5);

console.log("recidivita data-quality + operator identity: ok");
