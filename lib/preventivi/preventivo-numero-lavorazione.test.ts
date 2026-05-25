import assert from "node:assert/strict";
import {
  formatPreventivoNumeroLavorazione,
  isPreventivoNumeroLavorazione,
  nextPreventivoNumeroForLavorazione,
  parsePreventivoNumeroLavorazioneSuffix,
} from "@/lib/preventivi/preventivo-numero-lavorazione";
import type { PreventivoRecord } from "@/lib/preventivi/types";

assert.equal(isPreventivoNumeroLavorazione("26-0001/1"), true);
assert.equal(isPreventivoNumeroLavorazione("26-0001/12"), true);
assert.equal(isPreventivoNumeroLavorazione("2026-001"), false);
assert.equal(isPreventivoNumeroLavorazione("26-0001/M"), false);

assert.equal(formatPreventivoNumeroLavorazione("26-0001", 3), "26-0001/3");

assert.equal(parsePreventivoNumeroLavorazioneSuffix("26-0001/2", "26-0001"), 2);
assert.equal(parsePreventivoNumeroLavorazioneSuffix("26-0002/1", "26-0001"), null);
assert.equal(parsePreventivoNumeroLavorazioneSuffix("2026-001", "26-0001"), null);

const records = [
  { numero: "26-0001/1", lavorazioneId: "lav-a" },
  { numero: "26-0001/3", lavorazioneId: "lav-a" },
  { numero: "26-0002/1", lavorazioneId: "lav-b" },
] as PreventivoRecord[];

assert.equal(nextPreventivoNumeroForLavorazione("26-0001", records, "lav-a"), "26-0001/4");
assert.equal(nextPreventivoNumeroForLavorazione("26-0001", records), "26-0001/4");
assert.equal(nextPreventivoNumeroForLavorazione("26-0002", records, "lav-b"), "26-0002/2");
assert.equal(nextPreventivoNumeroForLavorazione("26-0099", []), "26-0099/1");

console.log("preventivo-numero-lavorazione.test.ts: ok");
