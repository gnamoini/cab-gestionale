import assert from "node:assert/strict";
import {
  getAllDipendentiRecords,
  getActiveDipendentiRecords,
  getAddettiRecords,
  getAltriDipendentiRecords,
  type DipendenteRecord,
} from "@/lib/dipendenti/dipendente-record";

function rec(
  id: string,
  nome: string,
  employeeType: DipendenteRecord["employeeType"],
  attivo: boolean,
): DipendenteRecord {
  return { id, nome, cognome: null, employeeType, attivo };
}

const fixture: DipendenteRecord[] = [
  rec("a1", "Addetto1", "ADDETTO", true),
  rec("a2", "Addetto2", "ADDETTO", true),
  rec("o1", "Altro1", "ALTRO", true),
  rec("o2", "Altro2", "ALTRO", true),
  rec("i1", "Inattivo", "ADDETTO", false),
];

assert.equal(getAllDipendentiRecords(fixture).length, 5);
assert.equal(getActiveDipendentiRecords(fixture).length, 4);
assert.equal(getAddettiRecords(fixture).length, 2);
assert.equal(getAltriDipendentiRecords(fixture).length, 2);

assert.deepEqual(
  getAddettiRecords(fixture).map((r) => r.id),
  ["a1", "a2"],
);
assert.ok(getAllDipendentiRecords(fixture).some((r) => r.id === "i1"));

console.log("dipendente-record-filters.test.ts OK");
