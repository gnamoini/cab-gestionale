import assert from "node:assert/strict";
import { compatLabelMarcaModello } from "@/lib/mezzi/attrezzature-prefs";
import {
  compatDisplayModelsLabel,
  compatLineModelDisplayText,
} from "@/lib/magazzino/compat/compat-display";

const bucher5000 = compatLabelMarcaModello("Bucher", "CityCat 5000");
const bucher5006 = compatLabelMarcaModello("Bucher", "CityCat 5006");

assert.equal(compatLineModelDisplayText(bucher5000), "CityCat 5000");
assert.equal(
  compatDisplayModelsLabel([bucher5000, bucher5006]),
  "CityCat 5000, CityCat 5006",
);
assert.equal(compatLineModelDisplayText(compatLabelMarcaModello("Farid", "")), "(universale)");

console.log("compat-display.test.ts OK");
