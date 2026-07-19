/**
 * Audit: perdita dati Scheda Ingresso su submit senza blur (scenario iOS).
 * Dimostra che il gap è nel layer input/state, non nel DB.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}
import {
  autocompleteCommitFromSearchText,
  autocompleteDisplayValue,
} from "@/lib/global-autocomplete/engine";
import {
  flushGestionaleFormPendingCommits,
  registerGestionaleComboboxFlush,
  unregisterGestionaleComboboxFlush,
} from "@/lib/ui/gestionale-form-submit-flush";

/** Mirror di commitPendingForSubmit in GlobalSelect (variante default, non filter). */
function simulateCommitPendingForSubmit(params: {
  searchText: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  strictFromList?: boolean;
}): void {
  const trimmed = params.searchText.trim();
  const committedValue = params.value.trim();
  if (trimmed === committedValue) return;
  if (!trimmed) {
    if (params.value) params.onChange("");
    return;
  }
  const strictFromList = params.strictFromList ?? false;
  const committed = autocompleteCommitFromSearchText(
    params.searchText,
    "strings",
    params.options,
    [],
    strictFromList,
  );
  if (committed && committed !== params.value) {
    params.onChange(committed);
  } else if (trimmed !== params.value) {
    params.onChange(trimmed);
  }
}

/** Mirror di commitBlur in GlobalSelect (variante default, non filter). */
function simulateGlobalSelectCommitBlur(params: {
  searchText: string;
  value: string;
  userModified: boolean;
  options: readonly string[];
  onChange: (v: string) => void;
  strictFromList?: boolean;
  allowAdd?: boolean;
  canAdd?: boolean;
}): void {
  const trimmed = params.searchText.trim();
  if (!trimmed) {
    if (params.userModified && params.value) params.onChange("");
    return;
  }
  const strictFromList = params.strictFromList ?? false;
  const committed = autocompleteCommitFromSearchText(
    params.searchText,
    "strings",
    params.options,
    [],
    strictFromList,
  );
  if (committed && committed !== params.value) {
    params.onChange(committed);
  } else if (trimmed !== params.value) {
    params.onChange(trimmed);
  }
}

// --- Combobox: valore visibile ma parent stale se submit senza blur ---

const options = ["Cliente Alpha", "Cliente Beta"];

const displayWhileTyping = autocompleteDisplayValue({
  mode: "strings",
  value: "",
  searchText: "Nuovo Cliente",
  focused: true,
  open: true,
  options,
  items: [],
});
assert.equal(displayWhileTyping, "Nuovo Cliente", "UI mostra searchText digitato");

let parentValue = "";
simulateCommitPendingForSubmit({
  searchText: "Nuovo Cliente",
  value: parentValue,
  options,
  onChange: (v) => {
    parentValue = v;
  },
});
assert.equal(parentValue, "Nuovo Cliente", "dopo flush commitPendingForSubmit il parent è aggiornato");

parentValue = "Cliente Alpha";
let onChangeCalls = 0;
// Submit senza blur: nessuna chiamata onChange
assert.equal(
  autocompleteDisplayValue({
    mode: "strings",
    value: parentValue,
    searchText: "Cliente Beta",
    focused: true,
    open: true,
    options,
    items: [],
  }),
  "Cliente Beta",
);
assert.equal(onChangeCalls, 0);
simulateGlobalSelectCommitBlur({
  searchText: "Cliente Beta",
  value: parentValue,
  userModified: true,
  options,
  onChange: (v) => {
    onChangeCalls += 1;
    parentValue = v;
  },
});
assert.equal(onChangeCalls, 1);
assert.equal(parentValue, "Cliente Beta");

// strictFromList + allowAdd: submit flush committa testo nuovo (GlobalSelect commitBlur)
parentValue = "";
simulateGlobalSelectCommitBlur({
  searchText: "Cliente AUDIT-NEW",
  value: parentValue,
  userModified: true,
  options: ["Cliente Alpha"],
  strictFromList: true,
  allowAdd: true,
  onChange: (v) => {
    parentValue = v;
  },
});
assert.equal(parentValue, "Cliente AUDIT-NEW");

parentValue = "";
simulateGlobalSelectCommitBlur({
  searchText: "Cliente AUDIT-NEW",
  value: parentValue,
  userModified: true,
  options: ["Cliente Alpha"],
  strictFromList: true,
  allowAdd: true,
  canAdd: false,
  onChange: (v) => {
    parentValue = v;
  },
});
assert.equal(parentValue, "Cliente AUDIT-NEW", "submit flush committa anche senza canAdd append elenco");

// commitPendingForSubmit: clear senza userModified (invariante submit)
parentValue = "Cliente Alpha";
simulateCommitPendingForSubmit({
  searchText: "",
  value: parentValue,
  options,
  onChange: (v) => {
    parentValue = v;
  },
});
assert.equal(parentValue, "", "submit flush propaga clear anche senza userModified");

// --- draftRef stale: sync sincrono in onPatch ---

type Draft = { cliente: string; note: string };

function patchWithSyncRef(
  ref: { current: Draft },
  setDraft: (updater: (prev: Draft) => Draft) => void,
  patch: Partial<Draft>,
): void {
  setDraft((prev) => {
    const next = { ...prev, ...patch };
    ref.current = next;
    return next;
  });
}

const draftRef = { current: { cliente: "", note: "" } };
let draftState = { cliente: "", note: "" };
const setDraft = (updater: (prev: Draft) => Draft) => {
  draftState = updater(draftState);
};

patchWithSyncRef(draftRef, setDraft, { note: "ultima nota" });
// Senza useLayoutEffect, ref è già aggiornato
assert.equal(draftRef.current.note, "ultima nota");
assert.equal(draftState.note, "ultima nota");

// --- flushGestionaleFormPendingCommits su form DOM ---

class MockInput {
  role = "combobox";
  flushed = false;
}

class MockForm {
  private inputs: MockInput[];
  constructor(inputs: MockInput[]) {
    this.inputs = inputs;
  }
  querySelectorAll(selector: string): MockInput[] {
    if (selector.includes("combobox")) return this.inputs;
    return [];
  }
}

const inputA = new MockInput();
const inputB = new MockInput();
const form = new MockForm([inputA, inputB]) as unknown as HTMLElement;

registerGestionaleComboboxFlush(inputA as unknown as HTMLInputElement, () => {
  inputA.flushed = true;
});
registerGestionaleComboboxFlush(inputB as unknown as HTMLInputElement, () => {
  inputB.flushed = true;
});

flushGestionaleFormPendingCommits(form);
assert.equal(inputA.flushed, true);
assert.equal(inputB.flushed, true);

unregisterGestionaleComboboxFlush(inputA as unknown as HTMLInputElement);
unregisterGestionaleComboboxFlush(inputB as unknown as HTMLInputElement);

// --- Wiring post-fix (regressione architetturale) ---

const globalSelect = read("components/gestionale/global-input/global-select.tsx");
assert.match(globalSelect, /registerGestionaleComboboxFlush/);
assert.match(globalSelect, /commitPendingForSubmit/);
assert.match(globalSelect, /trimmed !== value/);
assert.match(globalSelect, /allowAdd/);
assert.match(globalSelect, /unregisterGestionaleComboboxFlush/);
assert.match(globalSelect, /hasPending/);
assert.match(globalSelect, /commitBlur\(\)/);

const focusScope = read("components/gestionale/gestionale-form-focus-scope.tsx");
assert.match(focusScope, /onSubmitCapture/);
assert.doesNotMatch(focusScope, /flushGestionalePendingCommits/);
assert.match(focusScope, /flushSync/);

const prepSubmit = read("lib/forms/form-engine/prepare-form-submit.ts");
const asyncBlock = prepSubmit.slice(prepSubmit.indexOf("prepareFormSubmitAsync"));
const guardIdx = asyncBlock.indexOf("iosSubmitGuard");
const flushIdx = asyncBlock.indexOf("flushGestionalePendingCommits");
assert.ok(guardIdx >= 0 && flushIdx > guardIdx, "prepareFormSubmitAsync: guard prima di flush");

const editModal = read("components/gestionale/lavorazioni/scheda-ingresso-form-modal.tsx");
assert.match(editModal, /useFormEngine/);
assert.match(editModal, /runSubmit/);

const createHook = read("src/hooks/use-lavorazione-create-submit.ts");
assert.match(createHook, /useFormEngineSections/);
assert.match(createHook, /runSubmit/);

const createModal = read("components/gestionale/lavorazioni/lavorazione-create-modal.tsx");
assert.match(createModal, /useLavorazioneCreateSubmit/);
assert.doesNotMatch(createModal, /domCliente/);
assert.doesNotMatch(createModal, /prepareFormSubmit/);

console.log("scheda-ingresso-ios-save-audit.test: OK");
