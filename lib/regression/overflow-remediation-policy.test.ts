/**
 * Overflow P0 remediation — static policy guards.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const preventiviEditor = read("components/preventivi/preventivi-editor-modal.tsx");
assert.doesNotMatch(preventiviEditor, /min-w-\[960px\]/, "preventivi editor must not force 960px table");
assert.match(preventiviEditor, /dsTableFixed/);
assert.match(preventiviEditor, /<colgroup>/);

const preventiviView = read("components/preventivi/preventivi-view.tsx");
assert.doesNotMatch(preventiviView, /masterScrollScope=\{false\}/);
assert.doesNotMatch(preventiviView, /sm:min-w-\[12rem\]/);

const timesheetGrid = read("components/gestionale/dipendenti/dipendenti-timesheet-grid.tsx");
assert.doesNotMatch(timesheetGrid, /"w-full min-w-0 max-w-full overflow-hidden"/);
assert.match(timesheetGrid, /timesheet-presenze-grid/);

const reportLav = read("components/report/report-lavorazioni-section.tsx");
assert.doesNotMatch(reportLav, /min-w-\[720px\]/);
assert.doesNotMatch(reportLav, /min-w-\[480px\]/);
assert.match(reportLav, /<colgroup>/);

const reportMag = read("components/report/report-magazzino-section.tsx");
assert.doesNotMatch(reportMag, /min-w-\[720px\]/);

console.log("overflow-remediation-policy.test.ts OK");
