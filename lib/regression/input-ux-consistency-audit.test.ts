/**
 * Audit statico coerenza UX input: label association, portal dropdown, invalid state SSOT.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const schedaAnagrafica = read("components/gestionale/schede/scheda-ingresso-anagrafica-fields.tsx");
const settingsNavShell = read("components/dashboard/settings/settings-nav-shell.tsx");
const ricambioForm = read("components/gestionale/magazzino/ricambio-form-fields.tsx");
const globalSelect = read("components/gestionale/global-input/global-select.tsx");
const globalDatePicker = read("components/gestionale/global-input/global-date-picker.tsx");
const closeButton = read("components/design-system/close-button.tsx");
const designSystem = read("lib/ui/design-system.ts");
const mobileBehavior = read("lib/ui/mobile-modal-behavior.ts");
const numberInput = read("components/gestionale/gestionale-number-input.tsx");
const globalInput = read("lib/ui/global-input.ts");
const formSection = read("components/gestionale/schede/gestionale-form-section.tsx");
const fieldLabel = read("lib/ui/gestionale-field-label.ts");
const filterFields = read("components/gestionale/lavorazioni/lavorazioni-filter-fields.tsx");
const shellCard = read("components/gestionale/shell-card.tsx");
const collapsibleHeader = read("components/design-system/gestionale-collapsible-header.tsx");
const searchField = read("components/gestionale/gestionale-search-field.tsx");
const inlineSelect = read("components/gestionale/lavorazioni/lavorazioni-inline-select.tsx");

// P0-A: Scheda ingresso plain inputs con htmlFor + id
assert.match(schedaAnagrafica, /FormField label="Richiedente" htmlFor=\{fieldId\("richiedente"\)\}/);
assert.match(schedaAnagrafica, /id=\{fieldId\("richiedente"\)\}/);
assert.match(schedaAnagrafica, /SchedaIngressoIdentAutocompleteField[\s\S]*field="nScuderia"/);
assert.match(schedaAnagrafica, /SCHEDA_INGRESSO_EXCLUSIVE_GROUP = "scheda-ingresso"/);
assert.match(schedaAnagrafica, /exclusiveGroup=\{SCHEDA_INGRESSO_EXCLUSIVE_GROUP\}/);

const identField = read("components/lavorazioni/schede/scheda-ingresso-ident-autocomplete-field.tsx");
assert.match(identField, /useSelectorExclusiveGroup/);
assert.match(identField, /useSelectorFocusChain/);
assert.match(identField, /closeSheetWithCommit/);

assert.match(schedaAnagrafica, /label="N\. scuderia"/);
assert.match(schedaAnagrafica, /id=\{fieldId\("n-scuderia"\)\}/);
assert.match(schedaAnagrafica, /FormField label="Ore lavoro" htmlFor=\{fieldId\("ore-lavoro"\)\}/);
assert.match(schedaAnagrafica, /GestionaleNumberInput/);
assert.match(schedaAnagrafica, /FormField label="KM" htmlFor=\{fieldId\("km"\)\}/);

// Settings nav: portal, no absolute top-full
assert.match(settingsNavShell, /useGlobalDropdownPortal/);
assert.doesNotMatch(settingsNavShell, /absolute left-0 right-0 top-full/);

// Magazzino: label attr per focus scroll mobile
assert.match(ricambioForm, /CAB_FIELD_LABEL_ATTR/);

// Titolo campo / sezione: hitbox solo sul controllo o sul toggle
assert.match(formSection, /gestionaleFieldLabelClass/);
assert.match(fieldLabel, /pointer-events-none/);
assert.doesNotMatch(formSection, /<label[\s\S]*?<div className="mt-1">\{children\}<\/div>[\s\S]*?<\/label>/);
assert.match(filterFields, /gestionaleFilterFieldLabelClass/);
assert.match(shellCard, /GestionaleCollapsiblePanel/);
assert.match(collapsibleHeader, /aria-expanded=\{expanded\}/);
assert.match(collapsibleHeader, /aria-label=\{toggleLabel\}/);

// P1 R-08: required indicator uniforme
assert.match(formSection, /GestionaleRequiredMark/);
assert.match(ricambioForm, /required=\{!fieldsOptional\}/);
assert.doesNotMatch(ricambioForm, /label=\{fieldsOptional \? "Marca" : "Marca \*"\}/);

// P1 R-04/R-05: GestionaleNumberInput + error helper
assert.match(numberInput, /resolveGestionaleInputClassName/);
assert.match(numberInput, /dsInputNoSpinner/);
assert.match(numberInput, /aria-invalid=\{invalid/);
assert.match(globalInput, /export function resolveGestionaleInputClassName/);
assert.match(searchField, /invalid\?: boolean/);
assert.match(ricambioForm, /resolveGestionaleInputClassName/);

// Form UX migration: prezzo listino via MigratedNumberInput (shadow rollout)
assert.match(ricambioForm, /MigratedNumberInput/);
assert.match(ricambioForm, /fieldId="prezzo-listino"/);

// SSOT combobox/date: stato errore accessibile
assert.match(globalSelect, /aria-invalid=\{showInvalid/);
assert.match(globalSelect, /globalInputInvalidRing/);
assert.match(globalDatePicker, /aria-invalid=\{showInvalid/);
assert.match(globalDatePicker, /globalInputInvalidRing/);

// P0-B / P1 R-07: sticky esplicito + focus scroll last-wins
assert.match(mobileBehavior, /CAB_STICKY_HEADER_ATTR/);
assert.doesNotMatch(mobileBehavior, /\[class\*="sticky"\]/);
assert.match(mobileBehavior, /focusScrollGeneration/);
assert.doesNotMatch(mobileBehavior, /focusScrollChain/);

// P1 R-06: InlineSelectField deprecates native path
assert.match(inlineSelect, /@deprecated/);
assert.match(inlineSelect, /GlobalFixedListPillSelect/);

// P0-C: close button touch target mobile
assert.match(closeButton, /dsShellNavIconBtn/);
assert.doesNotMatch(closeButton, /hover:bg-\[var\(--cab-hover\)\]/);
assert.match(designSystem, /hover:\[&_svg\]:scale-\[1\.08\]/);
assert.match(designSystem, /export const dsPageToolbarIconBtn = \[[\s\S]*?dsShellNavIconBtn/);

const calendarPanel = read("components/gestionale/global-input/global-calendar-panel.tsx");
const calendarV2Grid = read("components/dashboard/calendar-v2/calendar-v2-grid.tsx");
const promemoriaCal = read("components/dashboard/promemoria/dashboard-promemoria-calendar.tsx");
const diaryPanel = read("components/dashboard/dashboard-diary-panel.tsx");
const monthYearPicker = read("components/gestionale/global-input/calendar-month-year-picker.tsx");

assert.match(monthYearPicker, /export function CalendarMonthYearPicker/);
assert.match(calendarPanel, /CalendarMonthYearPicker/);
assert.match(calendarV2Grid, /CalendarMonthYearPicker/);
assert.match(promemoriaCal, /CalendarMonthYearPicker/);
assert.match(diaryPanel, /CalendarMonthYearPicker/);
assert.doesNotMatch(diaryPanel, /DiaryCalendarMonthYearMenu/);
assert.doesNotMatch(promemoriaCal, /PromemoriaMonthYearPickers/);

console.log("input-ux-consistency-audit.test.ts OK");
