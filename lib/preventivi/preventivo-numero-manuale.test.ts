import assert from "node:assert/strict";
import {
  formatPreventivoNumeroManuale,
  isPreventivoNumeroManuale,
  nextPreventivoNumeroManualeFromRecords,
} from "@/lib/preventivi/preventivo-numero-manuale";
import type { PreventivoRecord } from "@/lib/preventivi/types";

assert.equal(isPreventivoNumeroManuale("26-0001/M"), true);
assert.equal(isPreventivoNumeroManuale("26-0012/m"), true);
assert.equal(isPreventivoNumeroManuale("26-0001/1"), false);
assert.equal(isPreventivoNumeroManuale("2026-001"), false);

assert.equal(formatPreventivoNumeroManuale(2026, 1), "26-0001/M");
assert.equal(formatPreventivoNumeroManuale(2026, 42), "26-0042/M");

const records = [
  { numero: "26-0001/M" },
  { numero: "26-0003/M" },
  { numero: "25-0099/M" },
  { numero: "26-0001/1" },
] as PreventivoRecord[];

assert.equal(nextPreventivoNumeroManualeFromRecords(records, 2026), "26-0004/M");
assert.equal(nextPreventivoNumeroManualeFromRecords([], 2026), "26-0001/M");

console.log("preventivo-numero-manuale.test.ts: ok");
