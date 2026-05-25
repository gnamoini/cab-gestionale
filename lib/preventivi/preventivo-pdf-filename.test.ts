import assert from "node:assert/strict";
import { formatPreventivoNumeroFileLabel } from "@/lib/preventivi/preventivo-pdf-filename";

assert.equal(formatPreventivoNumeroFileLabel("26-0001/3"), "N.3");
assert.equal(formatPreventivoNumeroFileLabel("26-0042/12"), "N.12");
assert.equal(formatPreventivoNumeroFileLabel("26-0001/M"), "N.1-M");
assert.equal(formatPreventivoNumeroFileLabel("26-0012/m"), "N.12-M");
assert.equal(formatPreventivoNumeroFileLabel("2026-012"), "N.12");
assert.equal(formatPreventivoNumeroFileLabel("PV-2026-012"), "N.12");
assert.equal(formatPreventivoNumeroFileLabel(""), "N.senza-numero");

console.log("preventivo-pdf-filename.test.ts: ok");
