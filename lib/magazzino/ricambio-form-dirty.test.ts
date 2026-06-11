import assert from "node:assert/strict";
import {
  emptyRicambioForm,
  ricambioFormHasNoUserInput,
  ricambioFormIsDirty,
  RICAMBIO_SAVE_EMPTY_FORM_MESSAGE,
} from "@/lib/magazzino/form";

const empty = emptyRicambioForm();

assert.equal(empty.fornitoriAlternativi.length, 1);
assert.equal(ricambioFormIsDirty(empty, empty), false);
assert.equal(ricambioFormHasNoUserInput(empty), true);
assert.match(RICAMBIO_SAVE_EMPTY_FORM_MESSAGE, /Compila almeno un campo/);

assert.equal(
  ricambioFormIsDirty({ ...empty, descrizione: "Filtro olio" }, empty),
  true,
);
assert.equal(ricambioFormHasNoUserInput({ ...empty, descrizione: "Filtro olio" }), false);

assert.equal(
  ricambioFormIsDirty({ ...empty, scorta: "0", scortaMinima: "0" }, empty),
  false,
);

console.log("ricambio-form-dirty.test.ts OK");
