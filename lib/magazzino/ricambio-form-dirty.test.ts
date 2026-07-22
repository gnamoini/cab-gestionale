import assert from "node:assert/strict";
import {
  emptyRicambioForm,
  ricambioFormHasMeaningfulUserInput,
  ricambioFormHasNoUserInput,
  ricambioFormIsDirty,
  ricambioFormNeedsCloseConfirm,
  syncPrezzoVenditaInForm,
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

assert.equal(ricambioFormHasMeaningfulUserInput(empty), false);
assert.equal(ricambioFormHasMeaningfulUserInput({ ...empty, descrizione: "Filtro olio" }), true);
assert.equal(ricambioFormNeedsCloseConfirm(empty, empty), false);

const markupOnly = syncPrezzoVenditaInForm({ ...empty, markupPercentuale: "50" });
assert.equal(ricambioFormIsDirty(markupOnly, empty), true);
assert.equal(
  ricambioFormIsDirty(markupOnly, syncPrezzoVenditaInForm({ ...empty, markupPercentuale: "50" })),
  false,
);
assert.equal(ricambioFormHasMeaningfulUserInput(markupOnly), true);
assert.equal(ricambioFormNeedsCloseConfirm(markupOnly, empty), true);

console.log("ricambio-form-dirty.test.ts OK");
