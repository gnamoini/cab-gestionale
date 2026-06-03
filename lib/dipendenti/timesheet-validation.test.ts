import assert from "node:assert/strict";
import { defaultTipiAssenza } from "@/lib/dipendenti/tipi-assenza-model";
import type { TimesheetCellValue } from "@/lib/dipendenti/types";
import { validateCellValue, MAX_DAILY_HOURS } from "@/lib/dipendenti/timesheet-validation";

const tipi = defaultTipiAssenza();
const ferie = tipi.find((t) => t.label === "Ferie")!;
const altro = tipi.find((t) => t.label === "Altro")!;

function cell(partial: Partial<TimesheetCellValue>): TimesheetCellValue {
  return {
    oreOrdinarie: 0,
    oreStraordinarie: 0,
    oreAssenza: 0,
    tipoAssenzaId: null,
    tipoAssenzaLabel: "",
    motivoCustom: "",
    note: "",
    ...partial,
  };
}

assert.equal(validateCellValue(cell({ oreOrdinarie: -1 }), tipi).ok, false);
assert.equal(validateCellValue(cell({ oreOrdinarie: 8, oreStraordinarie: 2 }), tipi).ok, true);
assert.equal(
  validateCellValue(cell({ oreOrdinarie: MAX_DAILY_HOURS }), tipi).ok,
  true,
);
assert.equal(
  validateCellValue(cell({ oreOrdinarie: MAX_DAILY_HOURS + 0.5 }), tipi).ok,
  false,
);
assert.equal(
  validateCellValue(cell({ oreAssenza: 8, tipoAssenzaId: ferie.id, tipoAssenzaLabel: "Ferie" }), tipi).ok,
  true,
);
assert.equal(validateCellValue(cell({ oreAssenza: 8 }), tipi).ok, false);
assert.equal(
  validateCellValue(
    cell({ oreAssenza: 4, tipoAssenzaId: altro.id, tipoAssenzaLabel: "Altro", motivoCustom: "Visita" }),
    tipi,
  ).ok,
  true,
);

console.log("timesheet-validation.test.ts OK");
