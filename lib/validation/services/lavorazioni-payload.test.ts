import {
  normalizeLavorazioneNote,
  pickLavorazioneWritePayload,
} from "@/lib/validation/services/lavorazioni-payload";
import { TEXT_LONG } from "@/lib/validation/text-field-limits";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const longNote = "x".repeat(TEXT_LONG + 50);
assert(normalizeLavorazioneNote(longNote)?.length === TEXT_LONG, "note clamped");

const picked = pickLavorazioneWritePayload({
  stato: "in_lavorazione",
  note: "  nota  ",
  deleted_at: null,
  codice: "26-0001",
});

assert(picked.stato === "in_lavorazione", "stato picked");
assert(picked.note === "nota", "note trimmed");
assert(!("deleted_at" in picked), "deleted_at stripped");
assert(!("codice" in picked), "codice stripped");

console.log("lavorazioni-payload.test.ts OK");
