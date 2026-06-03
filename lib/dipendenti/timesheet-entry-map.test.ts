import assert from "node:assert/strict";
import { isCellEmpty } from "@/lib/dipendenti/timesheet-totals";
import { cellValueToUpsert } from "@/lib/dipendenti/timesheet-entry-map";
import { defaultTipiAssenza } from "@/lib/dipendenti/tipi-assenza-model";

const tipi = defaultTipiAssenza();

assert.equal(
  isCellEmpty({
    oreOrdinarie: 0,
    oreStraordinarie: 0,
    oreAssenza: 0,
    tipoAssenzaId: null,
    tipoAssenzaLabel: "",
    motivoCustom: "",
    note: "",
  }),
  true,
);

assert.equal(
  isCellEmpty({
    oreOrdinarie: 0,
    oreStraordinarie: 0,
    oreAssenza: 0,
    tipoAssenzaId: null,
    tipoAssenzaLabel: "",
    motivoCustom: "",
    note: "nota",
  }),
  false,
);

const upsert = cellValueToUpsert(
  "emp-id",
  "2026-05-01",
  {
    oreOrdinarie: 8,
    oreStraordinarie: 0,
    oreAssenza: 0,
    tipoAssenzaId: null,
    tipoAssenzaLabel: "",
    motivoCustom: "",
    note: "",
  },
  tipi,
);
assert.equal(upsert.dipendenteId, "emp-id");
assert.equal(upsert.workDate, "2026-05-01");
assert.equal(upsert.oreOrdinarie, 8);

console.log("timesheet-entry-map.test.ts OK");
