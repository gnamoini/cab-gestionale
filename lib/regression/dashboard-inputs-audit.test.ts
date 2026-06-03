/**
 * Audit dashboard: security usa componenti portal (no date/select nativi nei filtri/ruolo).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const securityView = read("components/dashboard/security-dashboard-view.tsx");
const securityTable = read("components/dashboard/security/security-users-table.tsx");
const securityCreate = read("components/dashboard/security-create-user-modal.tsx");
const promemoriaForm = read("components/dashboard/promemoria/dashboard-promemoria-form-modal.tsx");
const tasksPanel = read("components/dashboard/dashboard-tasks-panel.tsx");

assert.match(securityView, /GlobalDatePickerYmd/);
assert.doesNotMatch(securityView, /type="date"/);
assert.match(securityView, /GlobalSelect/);
assert.doesNotMatch(securityView, /gestionaleSelectNativePlainClass/);

assert.match(securityTable, /GlobalSelect/);
assert.doesNotMatch(securityTable, /<select\b/);

assert.match(securityCreate, /GlobalSelect/);
assert.doesNotMatch(securityCreate, /<select\b/);

assert.match(promemoriaForm, /GlobalDatePickerYmd/);
assert.match(promemoriaForm, /htmlFor=\{titleFieldId\}/);
assert.match(promemoriaForm, /id=\{titleFieldId\}/);

assert.match(tasksPanel, /maxLength=\{500\}/);
assert.match(tasksPanel, /break-words/);

console.log("dashboard-inputs-audit.test.ts OK");
