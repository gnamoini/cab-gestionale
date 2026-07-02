import assert from "node:assert/strict";
import { LavorazioneTargetValidationError } from "@/lib/domain/mezzo-attrezzatura/intervento-target";
import {
  normalizeLavorazioneNote,
  pickLavorazioneCreatePayload,
  pickLavorazioneWritePayload,
} from "@/lib/validation/services/lavorazioni-payload";
import { TEXT_LONG } from "@/lib/validation/text-field-limits";

const ATT_ID = "b2c3d4e5-f6a7-4890-bcde-f12345678901";
const MEZZO_ID = "a1b2c3d4-e5f6-4789-abcd-ef1234567890";

const longNote = "x".repeat(TEXT_LONG + 50);
assert.equal(normalizeLavorazioneNote(longNote)?.length, TEXT_LONG);

const picked = pickLavorazioneWritePayload({
  stato: "in_lavorazione",
  note: "  nota  ",
  deleted_at: null,
  codice: "26-0001",
  target_type: "attrezzatura",
  attrezzatura_id: ATT_ID,
});

assert.equal(picked.stato, "in_lavorazione");
assert.equal(picked.note, "nota");
assert.equal(picked.target_type, "attrezzatura");
assert.equal(picked.attrezzatura_id, ATT_ID);
assert.equal("deleted_at" in picked, false);
assert.equal("codice" in picked, false);

const created = pickLavorazioneCreatePayload({
  mezzo_id: MEZZO_ID,
  stato: "accettazione",
  priorita: "media",
  target_type: "attrezzatura",
  attrezzatura_id: ATT_ID,
});

assert.equal(created.target_type, "attrezzatura");
assert.equal(created.attrezzatura_id, ATT_ID);

const telaio = pickLavorazioneCreatePayload({
  mezzo_id: MEZZO_ID,
  stato: "accettazione",
  priorita: "media",
  target_type: "telaio",
  attrezzatura_id: null,
});

assert.equal(telaio.target_type, "telaio");
assert.equal(telaio.attrezzatura_id, null);

assert.throws(
  () =>
    pickLavorazioneCreatePayload({
      mezzo_id: MEZZO_ID,
      stato: "accettazione",
      priorita: "media",
      target_type: "attrezzatura",
      attrezzatura_id: null,
    }),
  LavorazioneTargetValidationError,
);

console.log("lavorazioni-payload.test.ts OK");
