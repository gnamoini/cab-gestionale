/**
 * Audit domain-based sheet rollout + selectOnly policy SSOT (v2/v3).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const engineConfig = read("lib/selector-core/selector-engine-config.ts");
const configSnapshot = read("lib/selector-core/selector-config-snapshot.ts");
const engine = read("lib/selector-core/selector-decision-engine.ts");
const domainPolicy = read("lib/selector-core/selector-domain-policy.ts");
const surface = read("lib/selector-core/resolve-selector-surface.ts");
const globalSelect = read("components/gestionale/global-input/global-select.tsx");
const lavTableRow = read("components/gestionale/lavorazioni/lavorazione-table-row.tsx");
const lavFilter = read("components/gestionale/lavorazioni/lavorazioni-advanced-filter-panel.tsx");
const timesheet = read("components/gestionale/dipendenti/timesheet-header.tsx");
const securityUser = read("components/dashboard/security-create-user-modal.tsx");
const inlineSelect = read("components/gestionale/lavorazioni/lavorazioni-inline-select.tsx");
const settingsListSelect = read("components/gestionale/global-input/global-settings-list-select.tsx");

assert.match(engineConfig, /selectorEngineConfig/);
assert.match(configSnapshot, /lavorazioni: "ENABLED"/);
assert.match(configSnapshot, /addetti: "ENABLED"/);
assert.match(configSnapshot, /report: "DISABLED"/);
assert.match(configSnapshot, /security: "GRADUAL"/);
assert.match(engine, /isSelectOnlyPolicyViolationPublic/);
assert.match(domainPolicy, /selector-decision-engine/);

assert.match(engine, /isSelectorDomainSheetRolloutEnabled/);
assert.match(surface, /SelectorDecisionEngine\.resolve/);

assert.match(globalSelect, /selectorDomain/);
assert.match(globalSelect, /SelectorDecisionEngine/);
assert.match(globalSelect, /SelectorEmptyState/);
assert.doesNotMatch(globalSelect, /resolveSelectorSurface/);

assert.match(inlineSelect, /AddettoSelectField/);
assert.match(inlineSelect, /GlobalFixedListPillSelect/);
assert.match(inlineSelect, /selectorDomain="addetti"/);
assert.match(inlineSelect, /mobileSheetMode="selectOnly"/);

assert.match(settingsListSelect, /isMezziListKey/);
assert.match(settingsListSelect, /resolvedMobileSheetMode/);
assert.match(settingsListSelect, /"searchable"/);

assert.match(lavTableRow, /AddettoSelectField[\s\S]{0,120}tablePillOptions\.addetto/);
assert.doesNotMatch(
  lavTableRow,
  /<InlineSelectField[\s\S]{0,80}tablePillOptions\.addetto/,
);

assert.match(lavFilter, /Filtra marca/);
assert.match(lavFilter, /GlobalHierarchyMarcaSelect/);
assert.match(lavFilter, /tree="attrezzature"/);
assert.match(lavFilter, /Filtra marca telaio/);
assert.match(lavFilter, /tree="telai"/);
const filterAllowAddDisabled = (lavFilter.match(/allowAdd=\{false\}/g) ?? []).length;
assert.ok(filterAllowAddDisabled >= 7, "lav filters: list/hierarchy fields must disable add-to-settings");
assert.match(lavFilter, /buildLavorazioniUtilizzatoreFilterItems/);
assert.match(lavFilter, /restrictUtilizzatoriToCatalog/);
assert.match(lavFilter, /useCatalogUtilizzatori[\s\S]{0,400}items=\{utilizzatoreFilterItems\}/);
assert.match(lavFilter, /Filtra cantiere/);
assert.doesNotMatch(lavFilter, /selectorDomain="lavorazioni"/);

assert.match(timesheet, /selectOnly[\s\S]{0,200}filterEmployeeId/);
assert.match(timesheet, /aria-label="Seleziona dipendente"/);
assert.doesNotMatch(timesheet, /selectorDomain="dipendenti"/);

assert.match(securityUser, /selectorDomain="security"/);
assert.doesNotMatch(securityUser, /selectOnly[\s\S]{0,120}mezzi:clienti/);

console.log("selector-domain-policy-audit.test.ts OK");
