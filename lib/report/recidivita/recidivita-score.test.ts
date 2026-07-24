import assert from "node:assert/strict";
import { computeRecidivitaScore, RECIDIVITA_WEIGHTS } from "@/lib/report/recidivita/recidivita-score";
import { symptomMatchScore } from "@/lib/report/recidivita/symptom-match";
import type { LavorazioneSchedeBundle } from "@/types/schede";

const bundle = (anomalia: string, ricambioId: string): LavorazioneSchedeBundle => ({
  lavorazioneId: "x",
  ingresso: {
    tipo: "ingresso",
    campi: { descrizioneAnomalia: anomalia },
  } as never,
  lavorazioni: null,
  ricambi: {
    tipo: "ricambi",
    campi: { righe: [{ id: "1", ricambioId, ricambioNome: "Sensore pressione", quantita: 1 }] },
  } as never,
});

const prev = {
  dataIngresso: "2026-01-01",
  dataCompletamento: "2026-01-05",
  bundle: bundle("perdita olio motore", "ric-1"),
};
const next = {
  dataIngresso: "2026-01-20",
  dataCompletamento: "2026-01-22",
  bundle: bundle("perdita olio", "ric-1"),
};

const score = computeRecidivitaScore(prev, next, 30);
assert.ok(score.temporal > 0);
assert.ok(score.component > 0);
assert.ok(score.symptom > 0);
assert.equal(
  score.composite,
  Math.round(
    (RECIDIVITA_WEIGHTS.temporal * score.temporal +
      RECIDIVITA_WEIGHTS.component * score.component +
      RECIDIVITA_WEIGHTS.symptom * score.symptom) *
      1000,
  ) / 1000,
);

assert.ok(symptomMatchScore("perdita olio motore", "perdita olio") > 0.3);

console.log("recidivita-score: ok");
