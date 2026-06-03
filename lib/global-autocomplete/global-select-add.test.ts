import assert from "node:assert/strict";
import { appendGlobalListSuccessMessage } from "@/lib/global-list/append-success-message";
import { mergeCurrentValueInOptions, normListSelectValue } from "@/lib/ui/list-select-utils";

/** Mirror di commitBlur in GlobalSelect — searchText vuoto dopo edit utente. */
function shouldClearValueOnEmptyBlur(params: {
  searchText: string;
  userModified: boolean;
  value: string;
  isFilterVariant?: boolean;
}): boolean {
  const trimmed = params.searchText.trim();
  if (trimmed) return false;
  if (!params.userModified) return false;
  if (params.isFilterVariant) return false;
  return Boolean(params.value);
}

// Post runAdd: modified reset → non deve svuotare il campo al blur
assert.equal(
  shouldClearValueOnEmptyBlur({
    searchText: "",
    userModified: false,
    value: "FIAT",
  }),
  false,
);

// Bug pre-fix: modified resta true → commitBlur svuota
assert.equal(
  shouldClearValueOnEmptyBlur({
    searchText: "",
    userModified: true,
    value: "FIAT",
  }),
  true,
);

// mergeCurrentValueInOptions: valore selezionato visibile fino al refetch
const merged = mergeCurrentValueInOptions("FIAT", ["Alfa Romeo", "BMW"]);
assert.ok(merged.includes("FIAT"));
assert.equal(mergeCurrentValueInOptions("FIAT", ["FIAT", "BMW"]).length, 2);

const dupCase = mergeCurrentValueInOptions("fiat", ["FIAT"]);
assert.equal(dupCase.filter((x) => normListSelectValue(x) === normListSelectValue("fiat")).length, 1);

assert.equal(appendGlobalListSuccessMessage("mezzi:clienti"), "Cliente aggiunto e selezionato");
assert.equal(
  appendGlobalListSuccessMessage("mezzi:clienti", { hierarchyTree: "attrezzature", hierarchyKind: "marca" }),
  "Marca aggiunta e selezionata",
);
assert.equal(
  appendGlobalListSuccessMessage("mezzi:clienti", {
    hierarchyTree: "attrezzature",
    hierarchyKind: "modello",
    marcaNome: "FIAT",
  }),
  "Modello aggiunto e selezionato",
);

console.log("global-select-add.test: OK");
