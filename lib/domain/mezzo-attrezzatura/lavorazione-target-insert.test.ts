import assert from "node:assert/strict";
import {
  LavorazioneTargetValidationError,
  validateLavorazioneTargetForInsert,
} from "@/lib/domain/mezzo-attrezzatura/intervento-target";

const ATT_ID = "b2c3d4e5-f6a7-4890-bcde-f12345678901";

assert.deepEqual(validateLavorazioneTargetForInsert("attrezzatura", ATT_ID), {
  target_type: "attrezzatura",
  attrezzatura_id: ATT_ID,
});

assert.deepEqual(validateLavorazioneTargetForInsert("telaio", null), {
  target_type: "telaio",
  attrezzatura_id: null,
});

assert.throws(
  () => validateLavorazioneTargetForInsert("attrezzatura", null),
  LavorazioneTargetValidationError,
);

assert.throws(
  () => validateLavorazioneTargetForInsert("telaio", ATT_ID),
  LavorazioneTargetValidationError,
);

assert.throws(
  () => validateLavorazioneTargetForInsert(undefined, null),
  LavorazioneTargetValidationError,
);

console.log("lavorazione-target-insert.test.ts OK");
