/**
 * Audit gruppo esclusivo GlobalSelect + wiring timesheet filtri.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const globalSelect = read("components/gestionale/global-input/global-select.tsx");
const timesheetHeader = read("components/gestionale/dipendenti/timesheet-header.tsx");
const exclusiveGroup = read("lib/selector-interaction/selector-exclusive-group.ts");
const settingsListSelect = read("components/gestionale/global-input/global-settings-list-select.tsx");
const schedaAnagrafica = read("components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx");
const identField = read("components/lavorazioni/schede/scheda-ingresso-ident-autocomplete-field.tsx");

assert.match(globalSelect, /exclusiveGroup\?: string/);
assert.match(globalSelect, /useSelectorExclusiveGroup/);
assert.match(globalSelect, /setSelectorOpen/);
assert.match(settingsListSelect, /exclusiveGroup\?: string/);
assert.match(schedaAnagrafica, /SCHEDA_INGRESSO_EXCLUSIVE_GROUP = "scheda-ingresso"/);
assert.match(identField, /useSelectorExclusiveGroup/);
assert.match(exclusiveGroup, /closeOtherSelectorsInExclusiveGroup/);
assert.match(timesheetHeader, /exclusiveGroup="dipendenti-timesheet-filters"/);

const filterSelectCount = (timesheetHeader.match(/exclusiveGroup="dipendenti-timesheet-filters"/g) ?? [])
  .length;
assert.equal(filterSelectCount, 3);

console.log("selector-exclusive-group.test.ts OK");
