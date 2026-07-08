import assert from "node:assert/strict";
import { readOfficinaIndirizzoMagazzinoFromRows } from "@/lib/officina/officina-indirizzo-magazzino";
import {
  formatOfficinaSede,
  readOfficinaSedeOperativaFromRows,
} from "@/lib/officina/officina-sede";

const legacyRows = [
  {
    module: "system",
    key: "indirizzo_magazzino",
    value: { via: "Via Lilium", numeroCivico: "snc", cap: "70000", citta: "Modugno", provincia: "BA" },
  },
];

assert.equal(readOfficinaSedeOperativaFromRows([]).via, "");
assert.equal(
  formatOfficinaSede(readOfficinaSedeOperativaFromRows(legacyRows)),
  formatOfficinaSede(readOfficinaIndirizzoMagazzinoFromRows(legacyRows)),
);

const operativaRows = [
  ...legacyRows,
  {
    module: "system",
    key: "sede_operativa",
    value: { via: "Via Nuova", cap: "70100", citta: "Bari", provincia: "BA" },
  },
];
assert.match(formatOfficinaSede(readOfficinaSedeOperativaFromRows(operativaRows)), /Via Nuova/);

console.log("officina-sede.test.ts OK");
