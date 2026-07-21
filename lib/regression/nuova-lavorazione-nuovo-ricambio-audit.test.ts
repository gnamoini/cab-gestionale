/**
 * Audit statico: modal Nuova Lavorazione + Nuovo Ricambio (SSOT save/focus/mobile/hardening).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  emptyRicambioForm,
  ricambioFromFormLenient,
  ricambioLenientPlaceholderFlags,
  RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA,
  RICAMBIO_LENIENT_PLACEHOLDER_DESCRIZIONE,
  RICAMBIO_LENIENT_PLACEHOLDER_MARCA,
} from "@/lib/magazzino/form";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const lavCreateHook = read("src/hooks/use-lavorazione-create-submit.ts");
const lavCreate = read("components/gestionale/lavorazioni/lavorazione-create-modal.tsx");
const ricambioNew = read("components/gestionale/magazzino/ricambio-new-modal.tsx");
const ricambioEdit = read("components/gestionale/magazzino/ricambio-edit-modal.tsx");
const schedaBody = read("components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx");

// Nuova Lavorazione — Form Engine sections + scheda persist chain (hook SSOT)
assert.match(lavCreateHook, /useFormEngineSections/);
assert.match(lavCreateHook, /runSubmit/);
assert.match(lavCreateHook, /upsertMezzoFromSchedaIngresso/);
assert.match(lavCreateHook, /persistSchedeStore/);
assert.match(lavCreateHook, /createdLavorazioneIdRef/);
assert.match(lavCreateHook, /partialSuccessRef/);
assert.match(lavCreateHook, /incrementHealthCounter\("lavCreateSchedaSyncFail"\)/);
assert.match(lavCreateHook, /incrementHealthCounter\("lavCreatePartialRetry"\)/);
assert.match(lavCreateHook, /noteIntervento\.trim\(\)/);
assert.match(lavCreate, /useLavorazioneCreateSubmit/);

// Nuovo Ricambio — Form Engine + lenient save
assert.match(ricambioNew, /useFormEngine/);
assert.match(ricambioNew, /runSubmit/);
assert.match(ricambioNew, /ricambioFromFormLenient/);
assert.match(ricambioNew, /ricambioFormImportantWarnings/);
assert.match(ricambioNew, /ricambioLenientPlaceholderFlags/);
assert.match(ricambioNew, /incrementHealthCounter\("ricambioSaveIncompleteFields"\)/);
assert.match(ricambioNew, /ricambioFormNeedsCloseConfirm/);
assert.match(ricambioNew, /GestionaleModalScrollBody/);
assert.match(ricambioNew, /relaxHtmlValidation/);
assert.match(ricambioNew, /footer=\{/);
assert.match(ricambioNew, /ricambio-new-form/);
assert.match(ricambioNew, /formMode="create"/);

assert.match(ricambioEdit, /footer=\{/);
assert.match(ricambioEdit, /ricambio-edit-form/);
assert.match(ricambioEdit, /formMode="edit"/);

const ricambioFields = read("components/gestionale/magazzino/ricambio-form-fields.tsx");

// No nested focus scope in RicambioFormFields (parent form owns scope)
assert.doesNotMatch(ricambioFields, /GestionaleFormFocusScope/);
assert.match(ricambioFields, /GestionaleTextarea/);
assert.match(ricambioFields, /CAB_FOCUS_SCROLL_GROUP_ATTR/);
assert.match(ricambioFields, /CAB_STEPPER_ACTION_ATTR/);
assert.match(ricambioFields, /blurActiveFieldOutsideStepper/);

const ricambioCompat = read("components/gestionale/magazzino/ricambio-form-compat-section.tsx");
assert.match(ricambioCompat, /createSelectorSheetTapSelectHandlers/);
assert.match(ricambioCompat, /touch-pan-y/);

const globalSelect = read("components/gestionale/global-input/global-select.tsx");
assert.match(globalSelect, /armSelectorGhostClickGuard\(\)/);
assert.doesNotMatch(globalSelect, /if \(sheetOpen\)[\s\S]{0,80}armSelectorGhostClickGuard/);

// Scheda ingresso create variant — optional anagrafica + multiline Enter
assert.match(schedaBody, /variant === "create-lavorazione"/);
assert.match(schedaBody, /clienteRequired=\{false\}/);
assert.match(schedaBody, /marcaAttrezzaturaRequired=\{false\}/);
assert.doesNotMatch(lavCreate, /Cliente e marca attrezzatura sono obbligatori/);
assert.match(schedaBody, /GestionaleTextarea/);

// Lenient placeholder flags — SSOT segnaposto
const emptyMapped = ricambioFromFormLenient(emptyRicambioForm(), "test-id");
const flags = ricambioLenientPlaceholderFlags(emptyMapped);
assert.equal(flags.marcaPlaceholder, true);
assert.equal(flags.descrizionePlaceholder, true);
assert.equal(flags.categoriaPlaceholder, true);
assert.equal(emptyMapped.marca, RICAMBIO_LENIENT_PLACEHOLDER_MARCA);
assert.equal(emptyMapped.descrizione, RICAMBIO_LENIENT_PLACEHOLDER_DESCRIZIONE);
assert.equal(emptyMapped.categoria, RICAMBIO_LENIENT_PLACEHOLDER_CATEGORIA);

const filled = ricambioFromFormLenient(
  { ...emptyRicambioForm(), marca: "Bosch", descrizione: "Filtro", categoria: "Filtri" },
  "test-id-2",
);
const filledFlags = ricambioLenientPlaceholderFlags(filled);
assert.equal(filledFlags.marcaPlaceholder, false);
assert.equal(filledFlags.descrizionePlaceholder, false);
assert.equal(filledFlags.categoriaPlaceholder, false);

console.log("nuova-lavorazione-nuovo-ricambio-audit.test.ts OK");
